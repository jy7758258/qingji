package com.qingji.backend.auth.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface RecoveryCodeMapper {

    @Insert("""
            INSERT INTO identity_recovery_codes (user_id, code_hash)
            VALUES (#{userId}, #{codeHash})
            ON DUPLICATE KEY UPDATE
                code_hash = #{codeHash},
                created_at = CURRENT_TIMESTAMP(3),
                used_at = NULL
            """)
    int upsert(@Param("userId") String userId, @Param("codeHash") String codeHash);

    @Select("""
            SELECT code_hash
            FROM identity_recovery_codes
            WHERE user_id = #{userId}
            """)
    String findHashByUserId(@Param("userId") String userId);
}
