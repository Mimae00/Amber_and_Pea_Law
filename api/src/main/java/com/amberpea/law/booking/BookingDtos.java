package com.amberpea.law.booking;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.amberpea.law.lead.LeadDtos.LeadSummary;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class BookingDtos {

    private BookingDtos() {
    }

    public record BookingConfig(String timezone, int slotMinutes, List<DayOfWeek> businessDays, String open,
            String close, LocalDate minDate, LocalDate maxDate) {
    }

    public record Slot(Instant startAt, Instant endAt) {
    }

    public record Availability(LocalDate date, String timezone, int slotMinutes, boolean businessDay,
            List<Slot> slots) {
    }

    /** {@code website} is a honeypot field. */
    public record CreateBookingRequest(
            @NotNull(message = "Please choose a time") Instant startAt,
            @NotBlank(message = "Please enter your name") @Size(max = 120) String fullName,
            @NotBlank(message = "Please enter your email") @Email(message = "Please enter a valid email") @Size(max = 254) String email,
            @Size(max = 40) @Pattern(regexp = "^$|^[0-9+()\\-.\\s]{7,40}$", message = "Please enter a valid phone number") String phone,
            @Size(max = 2000, message = "Message must be 2000 characters or fewer") String message,
            @Size(max = 80) String practiceAreaSlug,
            @AssertTrue(message = "Please confirm we may contact you") boolean consent,
            @Size(max = 200) String website) {

        public boolean isHoneypotFilled() {
            return website != null && !website.isBlank();
        }
    }

    public record BookingConfirmation(String reference, Instant startAt, Instant endAt, String timezone) {
    }

    public record AdminBooking(Long id, Instant startAt, Instant endAt, BookingStatus status, Instant createdAt,
            LeadSummary lead) {

        public static AdminBooking from(Booking b) {
            return new AdminBooking(b.getId(), b.getStartAt(), b.getEndAt(), b.getStatus(), b.getCreatedAt(),
                    LeadSummary.from(b.getLead()));
        }
    }

    public record StatusUpdate(@NotNull(message = "Status is required") BookingStatus status) {
    }
}
