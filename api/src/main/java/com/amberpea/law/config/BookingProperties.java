package com.amberpea.law.config;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configurable business hours and slot rules for consultation booking.
 */
@ConfigurationProperties(prefix = "app.booking")
public record BookingProperties(
        String timezone,
        List<DayOfWeek> businessDays,
        String open,
        String close,
        int slotMinutes,
        int minNoticeHours,
        int maxDaysAhead) {

    public BookingProperties {
        ZoneId.of(timezone); // fail fast on invalid zone
        if (businessDays == null || businessDays.isEmpty()) {
            throw new IllegalStateException("BOOKING_BUSINESS_DAYS must list at least one day");
        }
        LocalTime o = LocalTime.parse(open);
        LocalTime c = LocalTime.parse(close);
        if (!c.isAfter(o)) {
            throw new IllegalStateException("BOOKING_CLOSE must be after BOOKING_OPEN");
        }
        if (slotMinutes < 5 || slotMinutes > 240) {
            throw new IllegalStateException("BOOKING_SLOT_MINUTES must be between 5 and 240");
        }
        if (minNoticeHours < 0 || maxDaysAhead < 1) {
            throw new IllegalStateException("Invalid booking notice/window configuration");
        }
    }

    public ZoneId zoneId() {
        return ZoneId.of(timezone);
    }

    public LocalTime openTime() {
        return LocalTime.parse(open);
    }

    public LocalTime closeTime() {
        return LocalTime.parse(close);
    }

    public Set<DayOfWeek> businessDaySet() {
        return EnumSet.copyOf(businessDays);
    }
}
