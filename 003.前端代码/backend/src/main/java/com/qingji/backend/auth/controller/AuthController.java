package com.qingji.backend.auth.controller;

import com.qingji.backend.auth.dto.ChangePasswordRequest;
import com.qingji.backend.auth.dto.LoginRequest;
import com.qingji.backend.auth.dto.RecoverRequest;
import com.qingji.backend.auth.dto.RegisterRequest;
import com.qingji.backend.auth.dto.RegisterResponse;
import com.qingji.backend.auth.dto.UserResponse;
import com.qingji.backend.auth.model.AuthPrincipal;
import com.qingji.backend.auth.service.AuthService;
import com.qingji.backend.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AppProperties appProperties;

    public AuthController(AuthService authService, AppProperties appProperties) {
        this.authService = authService;
        this.appProperties = appProperties;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request,
                                                     HttpServletRequest httpRequest,
                                                     HttpServletResponse httpResponse) {
        AuthService.RegisterOutcome outcome = authService.register(
                request.username(),
                request.password(),
                clientIp(httpRequest),
                httpRequest.getHeader("User-Agent")
        );
        setSessionCookie(httpResponse, outcome.token());
        return ResponseEntity.status(201)
                .body(new RegisterResponse(outcome.user(), outcome.recoveryCode()));
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest httpRequest,
                                              HttpServletResponse httpResponse) {
        AuthService.LoginOutcome outcome = authService.login(
                request.username(),
                request.password(),
                clientIp(httpRequest),
                httpRequest.getHeader("User-Agent")
        );
        setSessionCookie(httpResponse, outcome.token());
        return ResponseEntity.ok(outcome.user());
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(authService.me(principal));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal AuthPrincipal principal,
                                       HttpServletResponse httpResponse) {
        authService.logout(principal);
        clearSessionCookie(httpResponse);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal AuthPrincipal principal,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal, request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/recover")
    public ResponseEntity<Void> recover(@Valid @RequestBody RecoverRequest request) {
        authService.recover(request.username(), request.recoveryCode(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    private void setSessionCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie
                .from(appProperties.getSession().getCookieName(), token)
                .httpOnly(true)
                .secure(appProperties.getSession().isCookieSecure())
                .sameSite(appProperties.getSession().getSameSite())
                .path("/")
                .maxAge(Duration.ofDays(appProperties.getSession().getTtlDays()))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearSessionCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie
                .from(appProperties.getSession().getCookieName(), "")
                .httpOnly(true)
                .secure(appProperties.getSession().isCookieSecure())
                .sameSite(appProperties.getSession().getSameSite())
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
