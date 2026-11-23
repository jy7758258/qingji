package com.qingji.backend.ledger.dto;

import com.qingji.backend.ledger.model.CategoryRow;

public record CategoryResponse(
        String id,
        String name,
        String type,
        String icon,
        String color,
        int sort,
        String parentId,
        boolean system,
        boolean hidden
) {

    public static CategoryResponse from(CategoryRow row) {
        return new CategoryResponse(
                row.getId(),
                row.getName(),
                row.getType(),
                row.getIcon(),
                row.getColor(),
                row.getSort(),
                row.getParentId(),
                row.isSystem(),
                row.isHidden()
        );
    }
}
