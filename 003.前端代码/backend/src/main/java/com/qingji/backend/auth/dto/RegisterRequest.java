package com.qingji.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "请输入用户名")
        @Size(min = 2, max = 20, message = "用户名需为 2–20 个字符")
        String username,

        @NotBlank(message = "请输入密码")
        @Size(min = 8, max = 64, message = "密码需为 8–64 位")
        String password
) {
}
