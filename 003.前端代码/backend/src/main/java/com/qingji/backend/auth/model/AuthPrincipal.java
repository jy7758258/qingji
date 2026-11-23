package com.qingji.backend.auth.model;

public record AuthPrincipal(String sessionId, String userId, String username) {
}
