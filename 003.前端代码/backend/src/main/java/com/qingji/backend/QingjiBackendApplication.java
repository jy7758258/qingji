package com.qingji.backend;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
@MapperScan({"com.qingji.backend.auth.mapper", "com.qingji.backend.ledger.mapper"})
public class QingjiBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(QingjiBackendApplication.class, args);
    }
}
