package com.amberpea.law.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.amberpea.law.config.SecurityProperties;

/**
 * Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet.
 * Existing admins are never modified.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private static final int MIN_PASSWORD_LENGTH = 12;

    private final AdminUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityProperties properties;

    public AdminBootstrap(AdminUserRepository repository, PasswordEncoder passwordEncoder,
            SecurityProperties properties) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (repository.count() > 0) {
            log.info("Admin bootstrap skipped: an admin user already exists");
            return;
        }
        String email = trimToNull(properties.adminEmail());
        String password = properties.adminPassword();
        if (email == null || password == null || password.isBlank()) {
            log.warn("No admin user exists and ADMIN_EMAIL / ADMIN_PASSWORD are not set; admin login is unavailable");
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("ADMIN_PASSWORD must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        String displayName = trimToNull(properties.adminDisplayName());
        repository.save(new AdminUser(email.toLowerCase(), passwordEncoder.encode(password),
                displayName == null ? "Site Admin" : displayName));
        log.info("Created initial admin user from environment configuration");
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
