package com.amberpea.law.notification;

import java.time.Instant;

/**
 * Sends notifications about new bookings. Swap the logging stub for an email provider
 * (SMTP, SES, SendGrid...) by adding another implementation.
 */
public interface NotificationService {

    void bookingCreated(BookingNotification notification);

    /** Only what a notifier needs. Contact details are included so a real email can be sent, but must not be logged. */
    record BookingNotification(Long bookingId, Instant startAt, Instant endAt, String timezone, String clientName,
            String clientEmail) {
    }
}
