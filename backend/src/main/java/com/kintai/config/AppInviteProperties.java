package com.kintai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 招待メールに記載するログイン画面URLの基底（フロントの公開URL）。
 */
@Data
@ConfigurationProperties(prefix = "app.invite")
public class AppInviteProperties {

    /**
     * 例: https://kintai.example.com または開発時 http://localhost:5173（末尾スラッシュなし推奨）
     */
    private String publicBaseUrl = "";

    /**
     * From ヘッダ（未設定時は spring.mail.username を使用）
     */
    private String fromAddress = "";

    /**
     * 月次勤怠レポートの送付先管理者メールアドレス（未設定時は spring.mail.username を使用）
     */
    private String adminEmail = "";
}
