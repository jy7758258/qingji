package com.qingji.backend.ledger.dto;

import com.qingji.backend.ledger.model.TransactionRow;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

public record TransactionResponse(
        String id,
        String type,
        long amountCents,
        String categoryId,
        String categoryName,
        String categoryIcon,
        String categoryColor,
        String note,
        LocalDate occurredOn,
        Instant createdAt
) {

    public static TransactionResponse from(TransactionRow row) {
        return new TransactionResponse(
                row.getId(),
                row.getType(),
                row.getAmountCents(),
                row.getCategoryId(),
                row.getCategoryName(),
                row.getCategoryIcon(),
                row.getCategoryColor(),
                row.getNote(),
                row.getOccurredOn(),
                row.getCreatedAt() == null ? null : row.getCreatedAt().toInstant(ZoneOffset.UTC)
        );
    }
}
