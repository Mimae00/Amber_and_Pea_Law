package com.amberpea.law;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

@IntegrationTest
class AdminIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ObjectMapper json;

    private String token;

    @BeforeEach
    void login() throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(IntegrationTest.ADMIN_EMAIL, IntegrationTest.ADMIN_PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        token = json.readTree(body).get("token").asText();
    }

    private String bearer() {
        return "Bearer " + token;
    }

    @Test
    void firstAdminIsCreatedFromEnvironmentWithBcrypt() {
        String hash = jdbc.queryForObject("select password_hash from admin_user where email = ?", String.class,
                IntegrationTest.ADMIN_EMAIL);
        assertThat(hash).startsWith("$2a$12$").doesNotContain(IntegrationTest.ADMIN_PASSWORD);
    }

    @Test
    void wrongPasswordIs401() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"wrong-password\"}".formatted(IntegrationTest.ADMIN_EMAIL)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpointsRequireValidToken() throws Exception {
        mvc.perform(get("/api/admin/leads")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/leads").header("Authorization", "Bearer not.a.jwt")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(IntegrationTest.ADMIN_EMAIL));
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() throws Exception {
        // Header.payload from a real token, with a forged signature.
        String forged = token.substring(0, token.lastIndexOf('.') + 1) + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
        mvc.perform(get("/api/admin/leads").header("Authorization", "Bearer " + forged)).andExpect(status().isUnauthorized());
    }

    @Test
    void filterLeadsAndUpdateStatus() throws Exception {
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Filter Me\",\"email\":\"filter-me@example.com\",\"source\":\"CHATBOT\",\"consent\":true}"))
                .andExpect(status().isCreated());

        String body = mvc.perform(get("/api/admin/leads").header("Authorization", bearer())
                        .param("source", "CHATBOT").param("q", "filter-me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].status").value("NEW"))
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).at("/content/0/id").asLong();

        mvc.perform(patch("/api/admin/leads/{id}/status", id).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONTACTED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONTACTED"));
        mvc.perform(get("/api/admin/leads").header("Authorization", bearer()).param("status", "CONTACTED").param("q", "filter-me"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(patch("/api/admin/leads/{id}/status", id).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void searchTreatsLikeWildcardsLiterally() throws Exception {
        mvc.perform(get("/api/admin/leads").header("Authorization", bearer()).param("q", "%"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void unpublishedReviewsAreHiddenPublicly() throws Exception {
        String body = mvc.perform(post("/api/admin/reviews").header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authorName\":\"Hidden R.\",\"rating\":4,\"content\":\"Draft\",\"reviewDate\":\"2026-01-01\",\"published\":false}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();

        mvc.perform(get("/api/reviews").param("limit", "100")).andExpect(jsonPath("$[*].id", not(hasItem((int) id))));
        mvc.perform(put("/api/admin/reviews/{id}", id).header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authorName\":\"Hidden R.\",\"rating\":4,\"content\":\"Live\",\"reviewDate\":\"2026-01-01\",\"published\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/reviews").param("limit", "100")).andExpect(jsonPath("$[*].id", hasItem((int) id)));

        mvc.perform(post("/api/admin/reviews").header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authorName\":\"X\",\"rating\":6,\"content\":\"x\",\"reviewDate\":\"2026-01-01\",\"published\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.rating").exists());
    }

    @Test
    void practiceAreaSlugsAreValidatedAndUnique() throws Exception {
        String valid = "{\"slug\":\"%s\",\"name\":\"Test\",\"summary\":\"S\",\"description\":\"D\",\"sortOrder\":99,\"active\":false}";
        mvc.perform(post("/api/admin/practice-areas").header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(valid.formatted("estate-planning")))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/practice-areas/estate-planning")).andExpect(status().isNotFound()); // inactive
        mvc.perform(post("/api/admin/practice-areas").header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(valid.formatted("divorce")))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/practice-areas").header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(valid.formatted("Bad Slug!")))
                .andExpect(status().isBadRequest());
    }
}
