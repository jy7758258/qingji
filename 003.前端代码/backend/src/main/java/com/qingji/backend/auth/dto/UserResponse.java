package com.qingji.backend.auth.dto;

import com.qingji.backend.auth.model.UserRow;

import java.time.LocalDateTime;

public record UserResponse(String id, String username, LocalDateTime createdAt) {

    public static UserResponse from(UserRow row) {
        return new UserResponse(row.getId(), row.getUsername(), row.getCreatedAt());
    }
}
