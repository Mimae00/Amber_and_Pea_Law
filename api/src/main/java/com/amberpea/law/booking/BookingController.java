package com.amberpea.law.booking;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.amberpea.law.booking.BookingDtos.Availability;
import com.amberpea.law.booking.BookingDtos.BookingConfig;
import com.amberpea.law.booking.BookingDtos.BookingConfirmation;
import com.amberpea.law.booking.BookingDtos.CreateBookingRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService service;

    public BookingController(BookingService service) {
        this.service = service;
    }

    /** Booking window and rules, so the frontend can build the date picker. */
    @GetMapping("/config")
    public BookingConfig config() {
        return service.config();
    }

    @GetMapping("/availability")
    public Availability availability(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.availability(date);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingConfirmation create(@Valid @RequestBody CreateBookingRequest request) {
        return service.create(request);
    }
}
