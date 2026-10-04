package com.amberpea.law;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import com.amberpea.law.booking.SlotCalculator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@IntegrationTest
class BookingIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ObjectMapper json;

    @Autowired
    SlotCalculator slots;

    /** Each test uses its own business day so tests don't interfere. */
    private static final AtomicInteger dayOffset = new AtomicInteger(3);

    private LocalDate nextFreeBusinessDay() {
        LocalDate d = slots.today().plusDays(dayOffset.getAndIncrement());
        while (d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY) {
            d = slots.today().plusDays(dayOffset.getAndIncrement());
        }
        return d;
    }

    private List<String> availableSlots(LocalDate date) throws Exception {
        String body = mvc.perform(get("/api/bookings/availability").param("date", date.toString()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<String> out = new ArrayList<>();
        json.readTree(body).get("slots").forEach(s -> out.add(s.get("startAt").asText()));
        return out;
    }

    private static String booking(String startAt, String email) {
        return """
                {"startAt":"%s","fullName":"Booking Tester","email":"%s","phone":"555-010-0101",
                 "practiceAreaSlug":"child-custody","message":"Test","consent":true,"website":""}
                """.formatted(startAt, email);
    }

    @Test
    void configExposesBookingWindow() throws Exception {
        mvc.perform(get("/api/bookings/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timezone").value("America/Chicago"))
                .andExpect(jsonPath("$.slotMinutes").value(30))
                .andExpect(jsonPath("$.minDate").value(slots.today().toString()));
    }

    @Test
    void bookingCreatesLeadAndBookingAndRemovesSlot() throws Exception {
        LocalDate day = nextFreeBusinessDay();
        List<String> before = availableSlots(day);
        assertThat(before).hasSize(16);
        String slot = before.get(2);

        String body = mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(booking(slot, "book1@example.com")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reference").value(org.hamcrest.Matchers.matchesPattern("APL-\\d{6}")))
                .andReturn().getResponse().getContentAsString();
        JsonNode res = json.readTree(body);
        assertThat(Instant.parse(res.get("startAt").asText())).isEqualTo(Instant.parse(slot));

        var row = jdbc.queryForMap("""
                select l.source, l.status as lead_status, b.status as booking_status from booking b
                join lead l on l.id = b.lead_id where l.email = 'book1@example.com'""");
        assertThat(row).containsEntry("source", "BOOKING").containsEntry("lead_status", "BOOKED").containsEntry("booking_status", "NEW");
        assertThat(availableSlots(day)).hasSize(15).doesNotContain(slot);
    }

    @Test
    void sameSlotTwiceReturns409() throws Exception {
        String slot = availableSlots(nextFreeBusinessDay()).get(0);
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(booking(slot, "first@example.com")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(booking(slot, "second@example.com")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("just booked")));
        assertThat(jdbc.queryForObject("select count(*) from lead where email = 'second@example.com'", Integer.class)).isZero();
    }

    /**
     * Regression test: concurrent inserts used to deadlock inside the exclusion-constraint check
     * (SQLState 40P01) and surface as HTTP 500. Repeated to make the race likely to occur.
     */
    @RepeatedTest(5)
    void concurrentRequestsForOneSlotProduceExactlyOneBooking() throws Exception {
        String slot = availableSlots(nextFreeBusinessDay()).get(4);
        int n = 16;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Integer>> results = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                String email = "racer" + i + "-" + Instant.parse(slot).getEpochSecond() + "@example.com";
                Callable<Integer> call = () -> {
                    start.await();
                    return mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON)
                            .content(booking(slot, email))).andReturn().getResponse().getStatus();
                };
                results.add(pool.submit(call));
            }
            start.countDown();
            List<Integer> codes = new ArrayList<>();
            for (Future<Integer> f : results) {
                codes.add(f.get());
            }
            assertThat(codes).containsOnly(201, 409);
            assertThat(codes.stream().filter(c -> c == 201)).hasSize(1);
        } finally {
            pool.shutdownNow();
        }
        assertThat(jdbc.queryForObject("select count(*) from booking where start_at = ?", Integer.class,
                Timestamp.from(Instant.parse(slot)))).isEqualTo(1);
    }

    @Test
    void databaseConstraintRejectsOverlapsButAllowsCancelled() {
        Instant start = Instant.parse("2031-06-02T15:00:00Z");
        Long leadId = jdbc.queryForObject("""
                insert into lead (full_name, email, source, consent) values ('DB', 'db@example.com', 'BOOKING', true) returning id""", Long.class);
        String insert = "insert into booking (lead_id, start_at, end_at, status) values (?, ?, ?, ?)";
        jdbc.update(insert, leadId, Timestamp.from(start), Timestamp.from(start.plusSeconds(1800)), "NEW");

        assertThatThrownBy(() -> jdbc.update(insert, leadId, Timestamp.from(start.plusSeconds(900)),
                Timestamp.from(start.plusSeconds(2700)), "NEW"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("booking_no_overlap");

        // Adjacent slots ([) ranges) and cancelled overlaps are allowed.
        jdbc.update(insert, leadId, Timestamp.from(start.plusSeconds(1800)), Timestamp.from(start.plusSeconds(3600)), "NEW");
        jdbc.update(insert, leadId, Timestamp.from(start), Timestamp.from(start.plusSeconds(1800)), "CANCELLED");
    }

    @Test
    void invalidTimesAndDatesAreRejected() throws Exception {
        LocalDate day = nextFreeBusinessDay();
        String slot = availableSlots(day).get(0);
        String misaligned = Instant.parse(slot).plusSeconds(600).toString();
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(booking(misaligned, "mis@example.com")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/bookings/availability").param("date", slots.today().plusDays(365).toString()))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/bookings/availability").param("date", "not-a-date"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void weekendHasNoSlots() throws Exception {
        LocalDate d = slots.today().plusDays(1);
        while (d.getDayOfWeek() != DayOfWeek.SATURDAY) {
            d = d.plusDays(1);
        }
        mvc.perform(get("/api/bookings/availability").param("date", d.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessDay").value(false))
                .andExpect(jsonPath("$.slots").isEmpty());
    }

    @Test
    void honeypotBookingIsNotSaved() throws Exception {
        String slot = availableSlots(nextFreeBusinessDay()).get(1);
        String body = booking(slot, "honeybot@example.com").replace("\"website\":\"\"", "\"website\":\"spam\"");
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select count(*) from lead where email = 'honeybot@example.com'", Integer.class)).isZero();
    }
}
