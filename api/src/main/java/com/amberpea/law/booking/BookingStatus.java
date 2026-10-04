package com.amberpea.law.booking;

public enum BookingStatus {
    NEW,
    CONTACTED,
    BOOKED,
    CLOSED,
    /** Frees the slot: cancelled bookings are excluded from the no-overlap constraint. */
    CANCELLED
}
