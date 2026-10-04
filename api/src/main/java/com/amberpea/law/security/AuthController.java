package com.amberpea.law.security;

import java.time.Instant;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final TokenService tokenService;
    private final AdminUserRepository adminUsers;

    public AuthController(AuthenticationManager authenticationManager, TokenService tokenService,
            AdminUserRepository adminUsers) {
        this.authenticationManager = authenticationManager;
        this.tokenService = tokenService;
        this.adminUsers = adminUsers;
    }

    public record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 200) String password) {
    }

    public record LoginResponse(String token, Instant expiresAt, String email, String displayName) {
    }

    public record MeResponse(String email, String displayName) {
    }

    /** Throws BadCredentialsException (mapped to 401) on failure. */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email().trim().toLowerCase(),
                        request.password()));
        String email = auth.getName();
        String displayName = adminUsers.findByEmailIgnoreCase(email).map(AdminUser::getDisplayName).orElse(email);
        TokenService.IssuedToken issued = tokenService.issue(email, displayName);
        return new LoginResponse(issued.token(), issued.expiresAt(), email, displayName);
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return new MeResponse(jwt.getSubject(), jwt.getClaimAsString("name"));
    }
}
