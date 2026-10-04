package com.amberpea.law.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.DayOfWeek;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import com.amberpea.law.config.BookingProperties;
import com.amberpea.law.config.CorsProperties;
import com.amberpea.law.config.RateLimitProperties;
import com.amberpea.law.config.SecurityProperties;

/** Small pure-logic units: config validation, client IP resolution, rate-limit grouping. */
class HelpersTest {

    @Test
    void corsRejectsWildcards() {
        assertThatThrownBy(() -> new CorsProperties(List.of("*"))).isInstanceOf(IllegalStateException.class);
        assertThat(new CorsProperties(List.of(" http://localhost:5173 ")).allowedOrigins())
                .containsExactly("http://localhost:5173");
    }

    @Test
    void jwtSecretMustBeLongEnough() {
        assertThatThrownBy(() -> new SecurityProperties("short", "iss", 60, null, null, null))
                .isInstanceOf(IllegalStateException.class);
        var ok = new SecurityProperties("x".repeat(32), "iss", 60, "a@example.com", "secret-password", "Admin");
        assertThat(ok.toString()).doesNotContain("xxxx").doesNotContain("secret-password");
    }

    @Test
    void bookingPropertiesValidateHours() {
        assertThatThrownBy(() -> new BookingProperties("America/Chicago", List.of(DayOfWeek.MONDAY), "17:00", "09:00", 30, 0, 30))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new BookingProperties("Not/AZone", List.of(DayOfWeek.MONDAY), "09:00", "17:00", 30, 0, 30))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void forwardedHeaderOnlyTrustedWhenEnabled() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.1");
        req.addHeader("X-Forwarded-For", "203.0.113.9, 10.0.0.1");

        assertThat(new ClientIpResolver(new RateLimitProperties(false, 5, 5)).resolve(req)).isEqualTo("10.0.0.1");
        assertThat(new ClientIpResolver(new RateLimitProperties(true, 5, 5)).resolve(req)).isEqualTo("203.0.113.9");
    }

    @Test
    void rateLimitGroups() {
        assertThat(RateLimitFilter.group(new MockHttpServletRequest("POST", "/api/leads"))).isEqualTo("forms");
        assertThat(RateLimitFilter.group(new MockHttpServletRequest("POST", "/api/bookings"))).isEqualTo("forms");
        assertThat(RateLimitFilter.group(new MockHttpServletRequest("POST", "/api/auth/login"))).isEqualTo("login");
        assertThat(RateLimitFilter.group(new MockHttpServletRequest("GET", "/api/leads"))).isNull();
        assertThat(RateLimitFilter.group(new MockHttpServletRequest("GET", "/api/reviews"))).isNull();
    }
}
