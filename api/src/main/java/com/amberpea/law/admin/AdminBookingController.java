package com.amberpea.law.admin;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.amberpea.law.booking.Booking;
import com.amberpea.law.booking.BookingDtos.AdminBooking;
import com.amberpea.law.booking.BookingDtos.StatusUpdate;
import com.amberpea.law.booking.BookingRepository;
import com.amberpea.law.booking.BookingStatus;
import com.amberpea.law.common.ConflictException;
import com.amberpea.law.common.NotFoundException;
import com.amberpea.law.common.PageResponse;
import com.amberpea.law.config.BookingProperties;

import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@Validated
@RequestMapping("/api/admin/bookings")
public class AdminBookingController {

    private final BookingRepository bookings;
    private final ZoneId zone;

    public AdminBookingController(BookingRepository bookings, BookingProperties props) {
        this.bookings = bookings;
        this.zone = props.zoneId();
    }

    /** {@code from} / {@code to} are inclusive dates in the firm's timezone. */
    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<AdminBooking> list(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        var pageable = PageRequest.of(page, size, Sort.by("startAt").ascending().and(Sort.by("id")));
        return PageResponse.of(bookings.findAll(filter(status, from, to), pageable), AdminBooking::from);
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public AdminBooking updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdate body) {
        Booking booking = bookings.findById(id).orElseThrow(() -> new NotFoundException("Booking not found"));
        booking.setStatus(body.status());
        try {
            return AdminBooking.from(bookings.saveAndFlush(booking));
        } catch (DataIntegrityViolationException e) {
            // Re-activating a cancelled booking whose slot has since been taken.
            throw new ConflictException("That time slot is now taken by another booking.");
        }
    }

    private Specification<Booking> filter(BookingStatus status, LocalDate from, LocalDate to) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (from != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("startAt"), from.atStartOfDay(zone).toInstant()));
            }
            if (to != null) {
                p.add(cb.lessThan(root.get("startAt"), to.plusDays(1).atStartOfDay(zone).toInstant()));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
