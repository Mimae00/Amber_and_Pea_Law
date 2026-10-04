package com.amberpea.law.common;

import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.amberpea.law.config.RateLimitProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Fixed-window, per-IP rate limiting for form submissions and login.
 * State is in memory, so limits apply per instance. For multiple replicas,
 * move this to a shared store or the ingress.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MILLIS = 60_000;
    private static final int MAX_TRACKED_KEYS = 50_000;

    private final RateLimitProperties properties;
    private final ClientIpResolver ipResolver;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Autowired
    public RateLimitFilter(RateLimitProperties properties, ClientIpResolver ipResolver) {
        this(properties, ipResolver, Clock.systemUTC());
    }

    RateLimitFilter(RateLimitProperties properties, ClientIpResolver ipResolver, Clock clock) {
        this.properties = properties;
        this.ipResolver = ipResolver;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return group(request) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String group = group(request);
        int limit = "login".equals(group) ? properties.loginPerMinute() : properties.formsPerMinute();
        long now = clock.millis();
        long windowStart = now - (now % WINDOW_MILLIS);
        String key = group + "|" + ipResolver.resolve(request);

        if (windows.size() > MAX_TRACKED_KEYS) {
            windows.entrySet().removeIf(e -> e.getValue().start < windowStart);
        }
        Window w = windows.compute(key, (k, existing) ->
                existing == null || existing.start != windowStart ? new Window(windowStart) : existing);

        if (w.count.incrementAndGet() > limit) {
            long retryAfter = Math.max(1, (windowStart + WINDOW_MILLIS - now) / 1000);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", Long.toString(retryAfter));
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"Too Many Requests\",\"status\":429,"
                    + "\"detail\":\"Too many requests. Please wait a minute and try again.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    /** Returns the rate-limit group for a request, or null if not limited. */
    static String group(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return null;
        }
        String path = request.getRequestURI();
        return switch (path) {
            case "/api/leads", "/api/bookings" -> "forms";
            case "/api/auth/login" -> "login";
            default -> null;
        };
    }

    private static final class Window {
        final long start;
        final AtomicInteger count = new AtomicInteger();

        Window(long start) {
            this.start = start;
        }
    }
}
