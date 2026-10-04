package com.amberpea.law.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Per-IP request limits per minute. In-memory, so limits apply per instance.
 */
@ConfigurationProperties(prefix = "app.rate-limit")
public record RateLimitProperties(boolean trustForwardedHeaders, int formsPerMinute, int loginPerMinute) {

    public RateLimitProperties {
        if (formsPerMinute <= 0 || loginPerMinute <= 0) {
            throw new IllegalStateException("Rate limits must be positive");
        }
    }
}
