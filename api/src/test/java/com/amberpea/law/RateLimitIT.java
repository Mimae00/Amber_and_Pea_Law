package com.amberpea.law;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** Separate context with a low limit. X-Forwarded-For is trusted in tests to simulate different clients. */
@IntegrationTest
@TestPropertySource(properties = { "app.rate-limit.forms-per-minute=2", "app.rate-limit.login-per-minute=2" })
class RateLimitIT {

    @Autowired
    MockMvc mvc;

    private static final String LEAD = "{\"fullName\":\"Rate\",\"email\":\"rate@example.com\",\"source\":\"CONTACT_FORM\",\"consent\":true}";

    @Test
    void formsAreLimitedPerClientIp() throws Exception {
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/leads").header("X-Forwarded-For", "198.51.100.1")
                    .contentType(MediaType.APPLICATION_JSON).content(LEAD)).andExpect(status().isCreated());
        }
        mvc.perform(post("/api/leads").header("X-Forwarded-For", "198.51.100.1")
                        .contentType(MediaType.APPLICATION_JSON).content(LEAD))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
        // Another client is unaffected.
        mvc.perform(post("/api/leads").header("X-Forwarded-For", "198.51.100.2")
                .contentType(MediaType.APPLICATION_JSON).content(LEAD)).andExpect(status().isCreated());
    }

    @Test
    void loginIsLimited() throws Exception {
        String bad = "{\"email\":\"nobody@example.com\",\"password\":\"wrong\"}";
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/auth/login").header("X-Forwarded-For", "198.51.100.9")
                    .contentType(MediaType.APPLICATION_JSON).content(bad)).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").header("X-Forwarded-For", "198.51.100.9")
                .contentType(MediaType.APPLICATION_JSON).content(bad)).andExpect(status().isTooManyRequests());
    }
}
