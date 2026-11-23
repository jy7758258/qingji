package com.qingji.backend.auth.mapper;

import com.qingji.backend.auth.model.UserRow;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserMapper {

    @Select("""
            SELECT id, username, password_hash, status, failed_attempts,
                   locked_until, last_login_at, created_at, updated_at
            FROM identity_users
            WHERE username_key = #{usernameKey}
            """)
    UserRow findByUsernameKey(@Param("usernameKey") String usernameKey);

    @Select("""
            SELECT id, username, password_hash, status, failed_attempts,
                   locked_until, last_login_at, created_at, updated_at
            FROM identity_users
            WHERE id = #{id}
            """)
    UserRow findById(@Param("id") String id);

    @Insert("""
            INSERT INTO identity_users (id, username, password_hash)
            VALUES (#{id}, #{username}, #{passwordHash})
            """)
    int insert(@Param("id") String id,
               @Param("username") String username,
               @Param("passwordHash") String passwordHash);

    @Update("""
            UPDATE identity_users
            SET last_login_at = NOW(3), failed_attempts = 0, locked_until = NULL,
                updated_at = NOW(3)
            WHERE id = #{id}
            """)
    int recordSuccessfulLogin(@Param("id") String id);

    @Update("""
            UPDATE identity_users
            SET failed_attempts = failed_attempts + 1, updated_at = NOW(3)
            WHERE id = #{id}
            """)
    int incrementFailedAttempts(@Param("id") String id);

    @Update("""
            UPDATE identity_users
            SET password_hash = #{passwordHash}, updated_at = NOW(3)
            WHERE id = #{id}
            """)
    int updatePassword(@Param("id") String id, @Param("passwordHash") String passwordHash);
}
