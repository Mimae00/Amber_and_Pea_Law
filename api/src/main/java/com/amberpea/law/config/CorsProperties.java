package com.amberpea.law.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Allowed browser origins, from CORS_ALLOWED_ORIGINS (comma-separated). Wildcards are rejected.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        if (allowedOrigins == null || allowedOrigins.isEmpty()) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS must list at least one origin");
        }
        allowedOrigins = allowedOrigins.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        if (allowedOrigins.stream().anyMatch(o -> o.contains("*"))) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS must not contain wildcards");
        }
    }
}
