package com.qingji.backend.ledger.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateTransactionRequest(
        @NotBlank(message = "请选择收支类型")
        String type,

        @NotNull(message = "请输入金额")
        @Min(value = 1, message = "金额必须大于 0")
        @Max(value = 999999999, message = "金额超出上限")
        Long amountCents,

        @NotBlank(message = "请选择分类")
        String categoryId,

        @Size(max = 200, message = "备注最多 200 个字符")
        String note,

        LocalDate occurredOn
) {
}
