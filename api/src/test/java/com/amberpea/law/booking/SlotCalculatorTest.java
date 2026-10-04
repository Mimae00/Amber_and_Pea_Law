package com.amberpea.law.booking;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.amberpea.law.config.BookingProperties;

class SlotCalculatorTest {

    private static final List<DayOfWeek> WEEKDAYS = List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY, DayOfWeek.FRIDAY);

    /** Monday 2030-01-07 08:00 in Chicago (14:00 UTC, CST = UTC-6). */
    private static final Instant MONDAY_8AM_CHICAGO = Instant.parse("2030-01-07T14:00:00Z");

    private static SlotCalculator calculator(Instant now, int slotMinutes, int minNoticeHours) {
        var props = new BookingProperties("America/Chicago", WEEKDAYS, "09:00", "17:00", slotMinutes, minNoticeHours, 30);
        return new SlotCalculator(props, Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void generatesSlotsBetweenOpenAndCloseInFirmTimezone() {
        var calc = calculator(MONDAY_8AM_CHICAGO, 30, 0);
        List<Instant> slots = calc.candidateSlots(LocalDate.of(2030, 1, 8));

        assertThat(slots).hasSize(16); // 9:00 .. 16:30
        assertThat(slots.get(0)).isEqualTo(Instant.parse("2030-01-08T15:00:00Z")); // 09:00 CST
        assertThat(slots.get(15)).isEqualTo(Instant.parse("2030-01-08T22:30:00Z")); // 16:30 CST
    }

    @Test
    void lastSlotMustEndByClosingTime() {
        var calc = calculator(MONDAY_8AM_CHICAGO, 45, 0);
        List<Instant> slots = calc.candidateSlots(LocalDate.of(2030, 1, 8));

        // 9:00, 9:45, ... 15:45 ends 16:30; 16:30 would end 17:15, so it is excluded.
        assertThat(slots).last().isEqualTo(Instant.parse("2030-01-08T21:45:00Z"));
        assertThat(slots).hasSize(10);
    }

    @Test
    void noSlotsOnWeekends() {
        var calc = calculator(MONDAY_8AM_CHICAGO, 30, 0);
        assertThat(calc.candidateSlots(LocalDate.of(2030, 1, 12))).isEmpty(); // Saturday
        assertThat(calc.candidateSlots(LocalDate.of(2030, 1, 13))).isEmpty(); // Sunday
        assertThat(calc.isBusinessDay(LocalDate.of(2030, 1, 12))).isFalse();
    }

    @Test
    void minimumNoticeRemovesEarlySlotsToday() {
        // Now: Monday 10:15 Chicago; with 2h notice the first slot is 12:30.
        var calc = calculator(Instant.parse("2030-01-07T16:15:00Z"), 30, 2);
        List<Instant> slots = calc.candidateSlots(LocalDate.of(2030, 1, 7));

        assertThat(slots).first().isEqualTo(Instant.parse("2030-01-07T18:30:00Z")); // 12:30 CST
    }

    @Test
    void datesOutsideTheBookingWindowHaveNoSlots() {
        var calc = calculator(MONDAY_8AM_CHICAGO, 30, 0);
        assertThat(calc.isWithinWindow(LocalDate.of(2030, 1, 6))).isFalse(); // yesterday
        assertThat(calc.isWithinWindow(LocalDate.of(2030, 2, 6))).isTrue(); // today + 30
        assertThat(calc.isWithinWindow(LocalDate.of(2030, 2, 7))).isFalse(); // today + 31
        assertThat(calc.candidateSlots(LocalDate.of(2030, 2, 7))).isEmpty();
    }

    @Test
    void validSlotRequiresExactSlotStart() {
        var calc = calculator(MONDAY_8AM_CHICAGO, 30, 0);
        assertThat(calc.isValidSlot(Instant.parse("2030-01-08T15:30:00Z"))).isTrue();
        assertThat(calc.isValidSlot(Instant.parse("2030-01-08T15:10:00Z"))).isFalse(); // misaligned
        assertThat(calc.isValidSlot(Instant.parse("2030-01-08T14:00:00Z"))).isFalse(); // 08:00, before opening
        assertThat(calc.isValidSlot(Instant.parse("2030-01-12T15:00:00Z"))).isFalse(); // Saturday
    }

    @Test
    void handlesDaylightSavingChange() {
        // US DST starts Sunday 2030-03-10; Monday 2030-03-11 09:00 CDT = 14:00 UTC.
        var calc = calculator(Instant.parse("2030-03-08T12:00:00Z"), 30, 0);
        assertThat(calc.candidateSlots(LocalDate.of(2030, 3, 11))).first()
                .isEqualTo(Instant.parse("2030-03-11T14:00:00Z"));
    }
}
