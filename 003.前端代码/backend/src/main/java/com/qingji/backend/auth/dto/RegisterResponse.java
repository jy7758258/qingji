package com.qingji.backend.auth.dto;

public record RegisterResponse(UserResponse user, String recoveryCode) {
}
