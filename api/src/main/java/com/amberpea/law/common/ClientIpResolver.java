package com.amberpea.law.common;

import org.springframework.stereotype.Component;

import com.amberpea.law.config.RateLimitProperties;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the client IP. X-Forwarded-For is only trusted when explicitly enabled
 * (for example behind a known ingress), otherwise it could be spoofed to bypass rate limits.
 */
@Component
public class ClientIpResolver {

    private final boolean trustForwarded;

    public ClientIpResolver(RateLimitProperties properties) {
        this.trustForwarded = properties.trustForwardedHeaders();
    }

    public String resolve(HttpServletRequest request) {
        if (trustForwarded) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
