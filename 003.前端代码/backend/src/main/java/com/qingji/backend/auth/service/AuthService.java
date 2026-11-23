package com.qingji.backend.auth.service;

import com.qingji.backend.auth.dto.UserResponse;
import com.qingji.backend.auth.mapper.AuthAttemptMapper;
import com.qingji.backend.auth.mapper.RecoveryCodeMapper;
import com.qingji.backend.auth.mapper.SessionMapper;
import com.qingji.backend.auth.mapper.UserMapper;
import com.qingji.backend.auth.model.AuthPrincipal;
import com.qingji.backend.auth.model.UserRow;
import com.qingji.backend.common.ApiException;
import com.qingji.backend.common.HashUtil;
import com.qingji.backend.config.AppProperties;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[\\p{L}\\p{N}_]{2,20}$");
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,64}$");

    private final UserMapper userMapper;
    private final SessionMapper sessionMapper;
    private final AuthAttemptMapper authAttemptMapper;
    private final RecoveryCodeMapper recoveryCodeMapper;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;
    private final String dummyHash;

    public AuthService(UserMapper userMapper,
                       SessionMapper sessionMapper,
                       AuthAttemptMapper authAttemptMapper,
                       RecoveryCodeMapper recoveryCodeMapper,
                       PasswordEncoder passwordEncoder,
                       AppProperties appProperties) {
        this.userMapper = userMapper;
        this.sessionMapper = sessionMapper;
        this.authAttemptMapper = authAttemptMapper;
        this.recoveryCodeMapper = recoveryCodeMapper;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
        this.dummyHash = passwordEncoder.encode("qingji-not-a-real-account-password");
    }

    @Transactional
    public RegisterOutcome register(String rawUsername, String password, String ip, String userAgent) {
        String username = normalizeUsername(rawUsername);
        validateUsername(username);
        validatePassword(password);

        String usernameKey = usernameKey(username);
        if (userMapper.findByUsernameKey(usernameKey) != null) {
            throw ApiException.conflict("这个用户名已经被使用了，换一个试试");
        }

        String userId = UUID.randomUUID().toString();
        String passwordHash = passwordEncoder.encode(password);
        userMapper.insert(userId, username, passwordHash);

        String recoveryCode = HashUtil.randomRecoveryCode();
        recoveryCodeMapper.upsert(userId, recoveryHash(recoveryCode));

        String token = createSession(userId, ip, userAgent);
        UserRow user = userMapper.findById(userId);
        return new RegisterOutcome(UserResponse.from(user), recoveryCode, token);
    }

    @Transactional
    public LoginOutcome login(String rawUsername, String password, String ip, String userAgent) {
        String username = normalizeUsername(rawUsername);
        if (!isValidUsernameShape(username)) {
            throw ApiException.unauthorized();
        }

        String usernameKey = usernameKey(username);
        String ipHash = hashOrNull(ip);
        if (authAttemptMapper.countRecentFailures(usernameKey, ipHash) >= 5) {
            throw ApiException.rateLimited();
        }

        UserRow user = userMapper.findByUsernameKey(usernameKey);
        boolean matches = user != null && passwordEncoder.matches(password, user.getPasswordHash());
        if (user == null) {
            // 与真实密码校验保持近似耗时，降低用户名枚举。
            passwordEncoder.matches(password, dummyHash);
        }

        if (!matches || !"active".equals(user.getStatus())) {
            authAttemptMapper.insert(usernameKey, ipHash, "login", false);
            if (user != null) {
                userMapper.incrementFailedAttempts(user.getId());
            }
            throw ApiException.unauthorized();
        }

        userMapper.recordSuccessfulLogin(user.getId());
        authAttemptMapper.insert(usernameKey, ipHash, "login", true);
        String token = createSession(user.getId(), ip, userAgent);
        return new LoginOutcome(UserResponse.from(user), token);
    }

    public UserResponse me(AuthPrincipal principal) {
        UserRow user = userMapper.findById(principal.userId());
        if (user == null || !"active".equals(user.getStatus())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", "登录状态已失效");
        }
        return UserResponse.from(user);
    }

    public void logout(AuthPrincipal principal) {
        if (principal != null) {
            sessionMapper.revoke(principal.sessionId());
        }
    }

    @Transactional
    public void recover(String rawUsername, String recoveryCode, String newPassword) {
        String username = normalizeUsername(rawUsername);
        if (!isValidUsernameShape(username)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", "用户名或恢复码不正确");
        }
        UserRow user = userMapper.findByUsernameKey(usernameKey(username));
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", "用户名或恢复码不正确");
        }

        String storedHash = recoveryCodeMapper.findHashByUserId(user.getId());
        String submittedHash = recoveryHash(recoveryCode);
        if (storedHash == null || !HashUtil.constantTimeEquals(storedHash, submittedHash)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", "用户名或恢复码不正确");
        }

        validatePassword(newPassword);
        userMapper.updatePassword(user.getId(), passwordEncoder.encode(newPassword));
        sessionMapper.revokeAll(user.getId());
    }

    @Transactional
    public void changePassword(AuthPrincipal principal, String currentPassword, String newPassword) {
        UserRow user = userMapper.findById(principal.userId());
        if (user == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw ApiException.badRequest("当前密码不正确");
        }
        validatePassword(newPassword);
        userMapper.updatePassword(user.getId(), passwordEncoder.encode(newPassword));
        sessionMapper.revokeAllExcept(user.getId(), principal.sessionId());
    }

    private String createSession(String userId, String ip, String userAgent) {
        String rawToken = HashUtil.randomToken();
        LocalDateTime expiresAt = LocalDateTime.now(ZoneOffset.UTC)
                .plusDays(appProperties.getSession().getTtlDays());
        sessionMapper.insert(
                UUID.randomUUID().toString(),
                userId,
                HashUtil.sha256Hex(rawToken),
                expiresAt,
                hashOrNull(ip),
                hashOrNull(userAgent)
        );
        return rawToken;
    }

    private String normalizeUsername(String rawUsername) {
        if (rawUsername == null) {
            return "";
        }
        return Normalizer.normalize(rawUsername.trim(), Normalizer.Form.NFKC);
    }

    private String usernameKey(String username) {
        return username.toLowerCase(Locale.ROOT);
    }

    private void validateUsername(String username) {
        if (!isValidUsernameShape(username)) {
            throw ApiException.badRequest("用户名需为 2–20 个字符，支持中文、字母、数字和下划线");
        }
    }

    private boolean isValidUsernameShape(String username) {
        return username != null && USERNAME_PATTERN.matcher(username).matches();
    }

    private void validatePassword(String password) {
        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            throw ApiException.badRequest("密码需为 8–64 位，并同时包含字母和数字");
        }
    }

    private String recoveryHash(String code) {
        return HashUtil.sha256Hex(HashUtil.normalizeRecoveryCode(code));
    }

    private String hashOrNull(String value) {
        return value == null || value.isBlank() ? null : HashUtil.sha256Hex(value);
    }

    public record RegisterOutcome(UserResponse user, String recoveryCode, String token) {
    }

    public record LoginOutcome(UserResponse user, String token) {
    }
}
