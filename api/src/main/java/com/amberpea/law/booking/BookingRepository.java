package com.amberpea.law.booking;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long>, JpaSpecificationExecutor<Booking> {

    /** Active (non-cancelled) bookings overlapping [from, to). */
    @Query("""
            select b from Booking b
            where b.status <> com.amberpea.law.booking.BookingStatus.CANCELLED
              and b.startAt < :to and b.endAt > :from
            """)
    List<Booking> findActiveOverlapping(@Param("from") Instant from, @Param("to") Instant to);
}
