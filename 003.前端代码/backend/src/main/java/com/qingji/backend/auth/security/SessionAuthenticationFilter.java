package com.qingji.backend.auth.security;

import com.qingji.backend.auth.mapper.SessionMapper;
import com.qingji.backend.auth.model.AuthPrincipal;
import com.qingji.backend.auth.model.SessionRow;
import com.qingji.backend.common.HashUtil;
import com.qingji.backend.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class SessionAuthenticationFilter extends OncePerRequestFilter {

    private final SessionMapper sessionMapper;
    private final AppProperties appProperties;

    public SessionAuthenticationFilter(SessionMapper sessionMapper, AppProperties appProperties) {
        this.sessionMapper = sessionMapper;
        this.appProperties = appProperties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = readSessionCookie(request);
            if (token != null && !token.isBlank()) {
                SessionRow session = sessionMapper.findValidByTokenHash(HashUtil.sha256Hex(token));
                if (session != null && "active".equals(session.getStatus())) {
                    AuthPrincipal principal = new AuthPrincipal(
                            session.getSessionId(),
                            session.getUserId(),
                            session.getUsername()
                    );
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    principal,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_USER"))
                            );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private String readSessionCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        String cookieName = appProperties.getSession().getCookieName();
        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
