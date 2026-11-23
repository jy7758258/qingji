package com.qingji.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qingji.backend.auth.mapper.SessionMapper;
import com.qingji.backend.auth.security.JsonAuthenticationEntryPoint;
import com.qingji.backend.auth.security.OriginCheckFilter;
import com.qingji.backend.auth.security.SessionAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final AppProperties appProperties;
    private final SessionMapper sessionMapper;
    private final ObjectMapper objectMapper;

    public SecurityConfig(AppProperties appProperties,
                          SessionMapper sessionMapper,
                          ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.sessionMapper = sessionMapper;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        var entryPoint = new JsonAuthenticationEntryPoint(objectMapper);
        var originFilter = new OriginCheckFilter(appProperties, objectMapper);
        var sessionFilter = new SessionAuthenticationFilter(sessionMapper, appProperties);

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/recover").permitAll()
                        .requestMatchers("/api/auth/me", "/api/auth/logout", "/api/auth/password").authenticated()
                        .requestMatchers("/api/ledger/**").authenticated()
                        .anyRequest().denyAll())
                .exceptionHandling(exception -> exception.authenticationEntryPoint(entryPoint))
                .addFilterBefore(originFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(sessionFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(appProperties.getCors().getAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "Accept", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
