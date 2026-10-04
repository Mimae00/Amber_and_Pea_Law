package com.amberpea.law.lead;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Lead submitted from the consultation form, contact form or chatbot.
 * {@code website} is a honeypot: real users never see or fill it.
 */
public record CreateLeadRequest(
        @NotBlank(message = "Please enter your name") @Size(max = 120) String fullName,
        @NotBlank(message = "Please enter your email") @Email(message = "Please enter a valid email") @Size(max = 254) String email,
        @Size(max = 40) @Pattern(regexp = "^$|^[0-9+()\\-.\\s]{7,40}$", message = "Please enter a valid phone number") String phone,
        @Size(max = 2000, message = "Message must be 2000 characters or fewer") String message,
        @Size(max = 80) String practiceAreaSlug,
        @NotNull(message = "Source is required") LeadSource source,
        @AssertTrue(message = "Please confirm we may contact you") boolean consent,
        @Size(max = 200) String website) {

    @AssertTrue(message = "Bookings must be created through the booking endpoint")
    public boolean isSourceAllowed() {
        return source != LeadSource.BOOKING;
    }

    public boolean isHoneypotFilled() {
        return website != null && !website.isBlank();
    }
}
