package com.amberpea.law.booking;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.amberpea.law.booking.BookingDtos.Availability;
import com.amberpea.law.booking.BookingDtos.BookingConfig;
import com.amberpea.law.booking.BookingDtos.BookingConfirmation;
import com.amberpea.law.booking.BookingDtos.CreateBookingRequest;
import com.amberpea.law.booking.BookingDtos.Slot;
import com.amberpea.law.common.BadRequestException;
import com.amberpea.law.common.ConflictException;
import com.amberpea.law.config.BookingProperties;
import com.amberpea.law.lead.Lead;
import com.amberpea.law.lead.LeadRepository;
import com.amberpea.law.lead.LeadSource;
import com.amberpea.law.lead.LeadStatus;
import com.amberpea.law.notification.NotificationService;
import com.amberpea.law.notification.NotificationService.BookingNotification;
import com.amberpea.law.practicearea.PracticeArea;
import com.amberpea.law.practicearea.PracticeAreaRepository;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    static final String OVERLAP_CONSTRAINT = "booking_no_overlap";
    static final String SLOT_TAKEN = "Sorry, that time was just booked. Please choose another slot.";

    private final SlotCalculator slots;
    private final BookingProperties props;
    private final BookingRepository bookings;
    private final LeadRepository leads;
    private final PracticeAreaRepository practiceAreas;
    private final ApplicationEventPublisher events;
    private final NotificationService notifications;
    private final JdbcTemplate jdbc;

    public BookingService(SlotCalculator slots, BookingProperties props, BookingRepository bookings,
            LeadRepository leads, PracticeAreaRepository practiceAreas, ApplicationEventPublisher events,
            NotificationService notifications, JdbcTemplate jdbc) {
        this.slots = slots;
        this.props = props;
        this.bookings = bookings;
        this.leads = leads;
        this.practiceAreas = practiceAreas;
        this.events = events;
        this.notifications = notifications;
        this.jdbc = jdbc;
    }

    public BookingConfig config() {
        return new BookingConfig(props.timezone(), props.slotMinutes(), List.copyOf(props.businessDays()),
                props.open(), props.close(), slots.firstBookableDate(), slots.lastBookableDate());
    }

    @Transactional(readOnly = true)
    public Availability availability(LocalDate date) {
        if (!slots.isWithinWindow(date)) {
            throw new BadRequestException("Please choose a date between " + slots.firstBookableDate() + " and "
                    + slots.lastBookableDate());
        }
        ZoneId zone = slots.zone();
        Instant dayStart = date.atStartOfDay(zone).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant();
        List<Booking> taken = bookings.findActiveOverlapping(dayStart, dayEnd);
        var len = slots.slotLength();
        List<Slot> free = slots.candidateSlots(date).stream()
                .map(s -> new Slot(s, s.plus(len)))
                .filter(s -> taken.stream().noneMatch(b -> b.getStartAt().isBefore(s.endAt()) && b.getEndAt().isAfter(s.startAt())))
                .toList();
        return new Availability(date, props.timezone(), props.slotMinutes(), slots.isBusinessDay(date), free);
    }

    /**
     * Creates the lead and booking in one transaction. The database exclusion constraint is the final
     * guard against double booking when two requests race for the same slot.
     */
    @Transactional
    public BookingConfirmation create(CreateBookingRequest req) {
        Instant start = req.startAt();
        if (!slots.isValidSlot(start)) {
            throw new BadRequestException("That time is not available. Please choose one of the listed slots.");
        }
        Instant end = start.plus(slots.slotLength());
        if (req.isHoneypotFilled()) {
            log.info("Discarded booking submission: honeypot filled");
            return new BookingConfirmation("APL-PENDING", start, end, props.timezone());
        }
        // Serialize concurrent requests for the same slot. Without this, several transactions inserting
        // into the same range can deadlock inside the exclusion-constraint check (SQLState 40P01).
        // The lock is released at commit/rollback; the next waiter then sees the committed booking below.
        lockSlot(start);
        if (!bookings.findActiveOverlapping(start, end).isEmpty()) {
            throw new ConflictException(SLOT_TAKEN);
        }

        PracticeArea area = req.practiceAreaSlug() == null || req.practiceAreaSlug().isBlank() ? null
                : practiceAreas.findBySlugAndActiveTrue(req.practiceAreaSlug().trim()).orElse(null);
        Lead lead = new Lead(req.fullName().trim(), req.email().trim().toLowerCase(), blankToNull(req.phone()),
                blankToNull(req.message()), area, LeadSource.BOOKING, req.consent());
        lead.setStatus(LeadStatus.BOOKED);
        leads.save(lead);

        Booking booking;
        try {
            booking = bookings.saveAndFlush(new Booking(lead, start, end));
        } catch (DataIntegrityViolationException e) {
            if (isOverlap(e)) {
                throw new ConflictException(SLOT_TAKEN);
            }
            throw e;
        } catch (PessimisticLockingFailureException e) {
            // Safety net (e.g. racing an admin re-activating an overlapping booking): report a conflict, not a 500.
            log.warn("Lock conflict while booking startAt={}: {}", start, e.getMostSpecificCause().getMessage());
            throw new ConflictException(SLOT_TAKEN);
        }
        log.info("Created booking id={} startAt={}", booking.getId(), start);
        events.publishEvent(new BookingCreated(new BookingNotification(booking.getId(), start, end, props.timezone(),
                lead.getFullName(), lead.getEmail())));
        return new BookingConfirmation(reference(booking.getId()), start, end, props.timezone());
    }

    /** Runs after commit, so a failed transaction never sends a confirmation. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onBookingCreated(BookingCreated event) {
        try {
            notifications.bookingCreated(event.notification());
        } catch (RuntimeException e) {
            log.error("Booking notification failed for bookingId={}", event.notification().bookingId(), e);
        }
    }

    record BookingCreated(BookingNotification notification) {
    }

    /** Arbitrary namespace for this app's advisory locks (first key of the two-int form). */
    static final int SLOT_LOCK_NAMESPACE = 0x41504C; // "APL"

    /** Transaction-scoped PostgreSQL advisory lock keyed by slot start (minutes since epoch). */
    private void lockSlot(Instant start) {
        int minute = Math.toIntExact(start.getEpochSecond() / 60);
        jdbc.query("select pg_advisory_xact_lock(?, ?)", rs -> null, SLOT_LOCK_NAMESPACE, minute);
    }

    static boolean isOverlap(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t.getMessage() != null && t.getMessage().contains(OVERLAP_CONSTRAINT)) {
                return true;
            }
        }
        return false;
    }

    static String reference(Long id) {
        return String.format("APL-%06d", id);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
