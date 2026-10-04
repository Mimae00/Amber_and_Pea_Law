package com.amberpea.law.config;

import java.nio.charset.StandardCharsets;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT and first-admin settings. All values come from environment variables.
 */
@ConfigurationProperties(prefix = "app.security")
public record SecurityProperties(
        String jwtSecret,
        String jwtIssuer,
        long jwtTtlMinutes,
        String adminEmail,
        String adminPassword,
        String adminDisplayName) {

    private static final int MIN_SECRET_BYTES = 32;

    public SecurityProperties {
        if (jwtSecret == null || jwtSecret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must be set and at least " + MIN_SECRET_BYTES + " bytes long");
        }
        if (jwtTtlMinutes <= 0) {
            throw new IllegalStateException("JWT_TTL_MINUTES must be positive");
        }
    }

    public byte[] jwtSecretBytes() {
        return jwtSecret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public String toString() {
        // Never log secrets.
        return "SecurityProperties[jwtIssuer=" + jwtIssuer + ", jwtTtlMinutes=" + jwtTtlMinutes + "]";
    }
}
