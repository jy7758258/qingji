package com.qingji.backend.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qingji.backend.common.ApiError;
import com.qingji.backend.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/**
 * 基于 Origin/Referer 的写请求防护。
 * 同时依赖 SameSite=Lax Cookie，避免跨站表单和跨站 fetch 携带登录态。
 */
public class OriginCheckFilter extends OncePerRequestFilter {

    private final Set<String> allowedOrigins;
    private final ObjectMapper objectMapper;

    public OriginCheckFilter(AppProperties appProperties, ObjectMapper objectMapper) {
        this.allowedOrigins = new HashSet<>(appProperties.getCors().getAllowedOrigins());
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (isStateChanging(request.getMethod())) {
            String origin = request.getHeader("Origin");
            if (origin != null && !origin.isBlank() && !allowedOrigins.contains(origin)) {
                reject(response);
                return;
            }
            if (origin == null || origin.isBlank()) {
                String referer = request.getHeader("Referer");
                if (referer != null && !referer.isBlank() && !allowedOrigins.contains(originOf(referer))) {
                    reject(response);
                    return;
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean isStateChanging(String method) {
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);
    }

    private String originOf(String referer) {
        try {
            URI uri = URI.create(referer);
            int port = uri.getPort();
            return uri.getScheme() + "://" + uri.getHost() + (port > 0 ? ":" + port : "");
        } catch (IllegalArgumentException e) {
            return "";
        }
    }

    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiError.of("forbidden", "请求来源不受信任"));
    }
}
