package com.amberpea.law.booking;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.amberpea.law.config.BookingProperties;

/**
 * Pure slot rules: business days and hours, slot length, minimum notice and booking window.
 * Existing bookings are applied by {@link BookingService}.
 */
@Component
public class SlotCalculator {

    private final BookingProperties props;
    private final Clock clock;

    public SlotCalculator(BookingProperties props, Clock clock) {
        this.props = props;
        this.clock = clock;
    }

    public ZoneId zone() {
        return props.zoneId();
    }

    public Duration slotLength() {
        return Duration.ofMinutes(props.slotMinutes());
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(zone()));
    }

    public LocalDate firstBookableDate() {
        return today();
    }

    public LocalDate lastBookableDate() {
        return today().plusDays(props.maxDaysAhead());
    }

    public boolean isBusinessDay(LocalDate date) {
        return props.businessDaySet().contains(date.getDayOfWeek());
    }

    public boolean isWithinWindow(LocalDate date) {
        return !date.isBefore(firstBookableDate()) && !date.isAfter(lastBookableDate());
    }

    /** Candidate slot start times for a date, ignoring existing bookings. */
    public List<Instant> candidateSlots(LocalDate date) {
        List<Instant> slots = new ArrayList<>();
        if (!isWithinWindow(date) || !isBusinessDay(date)) {
            return slots;
        }
        Instant earliest = clock.instant().plus(Duration.ofHours(props.minNoticeHours()));
        LocalTime close = props.closeTime();
        Duration len = slotLength();
        ZonedDateTime start = date.atTime(props.openTime()).atZone(zone());
        ZonedDateTime dayClose = date.atTime(close).atZone(zone());
        while (!start.plus(len).isAfter(dayClose)) {
            Instant s = start.toInstant();
            if (!s.isBefore(earliest)) {
                slots.add(s);
            }
            start = start.plus(len);
        }
        return slots;
    }

    /** True when the instant is exactly one of the generated slot starts. */
    public boolean isValidSlot(Instant startAt) {
        LocalDate date = startAt.atZone(zone()).toLocalDate();
        return candidateSlots(date).contains(startAt);
    }
}
