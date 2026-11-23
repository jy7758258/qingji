package com.qingji.backend.ledger.mapper;

import com.qingji.backend.ledger.model.CategoryRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface LedgerCategoryMapper {

    @Select("""
            SELECT id, name, type, icon, color, sort, parent_id,
                   is_system AS `system`, hidden
            FROM ledger_categories
            WHERE user_id = #{userId}
              AND parent_id IS NULL
              AND deleted_at IS NULL
            ORDER BY type, sort, name
            """)
    List<CategoryRow> findTopLevel(@Param("userId") String userId);

    @Select("""
            SELECT id, name, type, icon, color, sort, parent_id,
                   is_system AS `system`, hidden
            FROM ledger_categories
            WHERE id = #{id}
              AND user_id = #{userId}
              AND deleted_at IS NULL
            """)
    CategoryRow findOwnedById(@Param("userId") String userId, @Param("id") String id);

    @Select("SELECT COUNT(*) FROM ledger_categories WHERE user_id = #{userId} AND deleted_at IS NULL")
    int countByUser(@Param("userId") String userId);
}
