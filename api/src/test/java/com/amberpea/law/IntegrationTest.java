package com.amberpea.law;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

/**
 * Full application context against a real PostgreSQL 16 (Testcontainers).
 * Test properties override api/.env, so local secrets are never used by tests.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
@TestPropertySource(properties = {
        // Placeholders so tests don't depend on api/.env; @ServiceConnection supplies the real container URL.
        "DB_URL=jdbc:postgresql://unused/unused",
        "DB_USERNAME=unused",
        "DB_PASSWORD=unused",
        "app.cors.allowed-origins=http://localhost:5173",
        "app.security.jwt-secret=test-secret-that-is-at-least-32-bytes-long!!",
        "app.security.jwt-issuer=amber-pea-law-api",
        "app.security.jwt-ttl-minutes=60",
        "app.security.admin-email=" + IntegrationTest.ADMIN_EMAIL,
        "app.security.admin-password=" + IntegrationTest.ADMIN_PASSWORD,
        "app.security.admin-display-name=Test Admin",
        "app.rate-limit.trust-forwarded-headers=true",
        "app.rate-limit.forms-per-minute=1000",
        "app.rate-limit.login-per-minute=1000",
})
public @interface IntegrationTest {
    String ADMIN_EMAIL = "admin@test.example";
    String ADMIN_PASSWORD = "test-admin-password-123";
}
