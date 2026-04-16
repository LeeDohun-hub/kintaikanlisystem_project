package com.kintai.service;

import com.kintai.config.AppInviteProperties;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.repository.EmployeeRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class EmployeeInviteEmailService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeAccountRepository employeeAccountRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AppInviteProperties appInviteProperties;
    private final org.springframework.core.env.Environment environment;

    /**
     * 招待メールを送信する。
     * loginId・initialPassword を渡すとメール本文に記載する（初回登録時）。
     */
    @Transactional(readOnly = true)
    public void sendInvite(long employeeId, String loginId, String initialPassword) {
        Employee e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("従業員が見つかりません。"));

        String to = e.getInviteEmail();
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("招待メール送付先が未設定です。先にメールアドレスを保存してください。");
        }

        // loginId が渡されなかった場合はアカウントから取得
        String resolvedLoginId = (loginId != null && !loginId.isBlank()) ? loginId
                : employeeAccountRepository.findById(employeeId)
                        .map(a -> a.getLoginId())
                        .orElse(null);

        String base = appInviteProperties.getPublicBaseUrl() != null
                ? appInviteProperties.getPublicBaseUrl().trim()
                : "";
        if (base.isEmpty()) {
            throw new IllegalStateException(
                    "ログイン画面URLを組み立てられません。app.invite.public-base-url を設定してください。");
        }
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String loginUrl = base + "/login";

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new IllegalStateException(
                    "メール送信が利用できません。spring.mail.host 等を設定して JavaMailSender を有効にしてください。");
        }

        String from = resolveFromAddress();
        if (from == null || from.isBlank()) {
            throw new IllegalStateException(
                    "送信元メールアドレスが未設定です。app.invite.from-address または spring.mail.username を設定してください。");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(from));
            helper.setTo(new InternetAddress(to.trim()));
            helper.setSubject("勤怠入力システムへのご案内");

            String name = e.getEmployeeName() != null ? e.getEmployeeName().trim() : "";
            String greeting = name.isEmpty() ? "お世話になっております。"
                    : (name + " 様\n\nお世話になっております。");

            StringBuilder body = new StringBuilder();
            body.append(greeting).append("\n\n");
            body.append("勤怠入力システムへのご案内です。\n");
            body.append("以下のURLからログインしてください。\n\n");
            body.append("ログイン画面: ").append(loginUrl).append("\n");

            if (resolvedLoginId != null && !resolvedLoginId.isBlank()) {
                body.append("ログインID: ").append(resolvedLoginId).append("\n");
            }
            if (initialPassword != null && !initialPassword.isBlank()) {
                body.append("初期パスワード: ").append(initialPassword).append("\n");
                body.append("\nセキュリティのため、ログイン後にパスワードの変更を推奨します。\n");
            } else {
                body.append("\nパスワードは管理者より別途お知らせします。\n");
            }
            body.append("\n※このメールに心当たりがない場合は破棄してください。");

            helper.setText(body.toString(), false);
            mailSender.send(message);
        } catch (Exception ex) {
            throw new IllegalStateException("メールの送信に失敗しました: " + ex.getMessage(), ex);
        }
    }

    /** 再送用（パスワードなし）。 */
    public void sendInvite(long employeeId) {
        sendInvite(employeeId, null, null);
    }

    private String resolveFromAddress() {
        String configured = appInviteProperties.getFromAddress() != null
                ? appInviteProperties.getFromAddress().trim()
                : "";
        if (!configured.isEmpty()) {
            return configured;
        }
        return environment.getProperty("spring.mail.username", "");
    }
}
