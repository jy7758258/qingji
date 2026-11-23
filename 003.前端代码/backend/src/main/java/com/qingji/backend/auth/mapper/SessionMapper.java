package com.qingji.backend.auth.mapper;

import com.qingji.backend.auth.model.SessionRow;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

@Mapper
public interface SessionMapper {

    @Insert("""
            INSERT INTO identity_sessions
                (id, user_id, token_hash, expires_at, ip_hash, user_agent_hash)
            VALUES
                (#{id}, #{userId}, #{tokenHash}, #{expiresAt}, #{ipHash}, #{userAgentHash})
            """)
    int insert(@Param("id") String id,
               @Param("userId") String userId,
               @Param("tokenHash") String tokenHash,
               @Param("expiresAt") LocalDateTime expiresAt,
               @Param("ipHash") String ipHash,
               @Param("userAgentHash") String userAgentHash);

    @Select("""
            SELECT s.id AS session_id, s.user_id, u.username, u.status,
                   s.expires_at, s.revoked_at
            FROM identity_sessions s
            JOIN identity_users u ON u.id = s.user_id
            WHERE s.token_hash = #{tokenHash}
              AND s.revoked_at IS NULL
              AND s.expires_at > NOW(3)
            """)
    SessionRow findValidByTokenHash(@Param("tokenHash") String tokenHash);

    @Update("""
            UPDATE identity_sessions
            SET revoked_at = NOW(3)
            WHERE id = #{id} AND revoked_at IS NULL
            """)
    int revoke(@Param("id") String id);

    @Update("""
            UPDATE identity_sessions
            SET revoked_at = NOW(3)
            WHERE user_id = #{userId}
              AND id <> #{keepSessionId}
              AND revoked_at IS NULL
            """)
    int revokeAllExcept(@Param("userId") String userId,
                        @Param("keepSessionId") String keepSessionId);

    @Update("""
            UPDATE identity_sessions
            SET revoked_at = NOW(3)
            WHERE user_id = #{userId} AND revoked_at IS NULL
            """)
    int revokeAll(@Param("userId") String userId);
}
