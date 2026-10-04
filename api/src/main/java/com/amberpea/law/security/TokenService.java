package com.amberpea.law.security;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.amberpea.law.config.SecurityProperties;

/**
 * Issues short-lived HS256 access tokens for admins.
 */
@Service
public class TokenService {

    public static final String ROLES_CLAIM = "roles";

    private final JwtEncoder encoder;
    private final SecurityProperties properties;

    public TokenService(JwtEncoder encoder, SecurityProperties properties) {
        this.encoder = encoder;
        this.properties = properties;
    }

    public IssuedToken issue(String subject, String displayName) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofMinutes(properties.jwtTtlMinutes()));
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.jwtIssuer())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(subject)
                .claim("name", displayName)
                .claim(ROLES_CLAIM, List.of("ADMIN"))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }
}
