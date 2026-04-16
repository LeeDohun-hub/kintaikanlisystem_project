package com.kintai;

import com.kintai.config.AppInviteProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppInviteProperties.class)
public class KintaiApplication {

	public static void main(String[] args) {
		SpringApplication.run(KintaiApplication.class, args);
	}
}
