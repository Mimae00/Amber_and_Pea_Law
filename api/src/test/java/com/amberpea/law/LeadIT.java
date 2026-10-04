package com.amberpea.law;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class LeadIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    private static String lead(String email, String source, boolean consent, String website) {
        return """
                {"fullName":"Lead Tester","email":"%s","phone":"555-010-0100","message":"Hello",
                 "practiceAreaSlug":"divorce","source":"%s","consent":%s,"website":"%s"}
                """.formatted(email, source, consent, website);
    }

    private int countByEmail(String email) {
        return jdbc.queryForObject("select count(*) from lead where email = ?", Integer.class, email);
    }

    @Test
    void savesLeadWithSourceAndPracticeArea() throws Exception {
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                        .content(lead("Saved@Example.com", "CONTACT_FORM", true, "")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("received"));

        var row = jdbc.queryForMap("""
                select l.source, l.status, l.email, p.slug as area from lead l
                left join practice_area p on p.id = l.practice_area_id where l.email = ?""", "saved@example.com");
        assertThat(row).containsEntry("source", "CONTACT_FORM").containsEntry("status", "NEW").containsEntry("area", "divorce");
    }

    @Test
    void chatbotSourceIsAccepted() throws Exception {
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                        .content(lead("chat@example.com", "CHATBOT", true, "")))
                .andExpect(status().isCreated());
        assertThat(countByEmail("chat@example.com")).isEqualTo(1);
    }

    @Test
    void consentIsRequired() throws Exception {
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                        .content(lead("noconsent@example.com", "CONTACT_FORM", false, "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.consent").exists());
        assertThat(countByEmail("noconsent@example.com")).isZero();
    }

    @Test
    void validationErrorsAreReturnedPerField() throws Exception {
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"\",\"email\":\"not-an-email\",\"phone\":\"abc\",\"source\":\"CONTACT_FORM\",\"consent\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.fullName").exists())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.phone").exists());
    }

    @Test
    void bookingSourceIsRejectedOnLeadEndpoint() throws Exception {
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                        .content(lead("fake-booking@example.com", "BOOKING", true, "")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void honeypotSubmissionLooksSuccessfulButIsNotSaved() throws Exception {
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                        .content(lead("bot@example.com", "CONTACT_FORM", true, "http://spam.example")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("received"));
        assertThat(countByEmail("bot@example.com")).isZero();
    }

    @Test
    void sqlInjectionAttemptIsStoredAsPlainText() throws Exception {
        String name = "Robert'); DROP TABLE lead;--";
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"" + name + "\",\"email\":\"bobby@example.com\",\"source\":\"CONTACT_FORM\",\"consent\":true}"))
                .andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select full_name from lead where email = 'bobby@example.com'", String.class))
                .isEqualTo(name);
    }
}
