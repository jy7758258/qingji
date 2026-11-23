package com.qingji.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecoverRequest(
        @NotBlank(message = "请输入用户名") String username,
        @NotBlank(message = "请输入恢复码") String recoveryCode,
        @NotBlank(message = "请输入新密码")
        @Size(min = 8, max = 64, message = "密码需为 8–64 位")
        String newPassword
) {
}
