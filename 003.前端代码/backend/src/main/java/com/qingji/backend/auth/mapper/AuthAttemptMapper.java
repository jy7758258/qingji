package com.qingji.backend.auth.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AuthAttemptMapper {

    @Insert("""
            INSERT INTO identity_auth_attempts (username_key, ip_hash, action, success)
            VALUES (#{usernameKey}, #{ipHash}, #{action}, #{success})
            """)
    int insert(@Param("usernameKey") String usernameKey,
               @Param("ipHash") String ipHash,
               @Param("action") String action,
               @Param("success") boolean success);

    @Select("""
            SELECT COUNT(*)
            FROM identity_auth_attempts
            WHERE username_key = #{usernameKey}
              AND ip_hash = #{ipHash}
              AND action = 'login'
              AND success = 0
              AND created_at >= DATE_SUB(NOW(3), INTERVAL 15 MINUTE)
            """)
    int countRecentFailures(@Param("usernameKey") String usernameKey,
                            @Param("ipHash") String ipHash);
}
