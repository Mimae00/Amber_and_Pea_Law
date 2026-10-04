package com.amberpea.law.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Stub notifier: logs that a confirmation would be sent. Never logs personal data.
 * Replace this class (or mark another implementation @Primary) to send real emails.
 */
@Service
public class LoggingNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationService.class);

    @Override
    public void bookingCreated(BookingNotification n) {
        log.info("[notification stub] Would send booking confirmation: bookingId={} startAt={} timezone={}",
                n.bookingId(), n.startAt(), n.timezone());
    }
}
