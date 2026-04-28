package com.kintai.service;

import com.kintai.dto.TotpSetupResponse;
import com.kintai.entity.EmployeeAccount;
import com.kintai.repository.EmployeeAccountRepository;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.binary.Base32;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
@RequiredArgsConstructor
public class TotpService {

    private static final String ISSUER = "SmarteeJapan";
    /** 検証に許容する時間ウィンドウ (±N ステップ × 30秒) */
    private static final int WINDOW = 3;

    private final EmployeeAccountRepository employeeAccountRepository;
    private final GoogleAuthenticator googleAuthenticator;

    /**
     * RFC 6238 (TOTP) に従って検証する。
     * googleAuthenticator.authorize() の内部実装に依存せず、
     * 標準 Java Crypto API で直接計算するため確実に動作する。
     */
    public boolean verify(String base32Secret, int code) {
        String normalized = normalizeBase32Secret(base32Secret);
        if (normalized == null) {
            return false;
        }
        long currentStep = System.currentTimeMillis() / 30_000L;
        for (int i = -WINDOW; i <= WINDOW; i++) {
            if (computeTotp(normalized, currentStep + i) == code) {
                return true;
            }
        }
        return false;
    }

    /** 空白・ハイフン除去、大文字化。Base32 として不正なら null */
    private static String normalizeBase32Secret(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.trim().replace(" ", "").replace("-", "").toUpperCase();
        // Base32 パディングはデコード前に除去（検証ループで '=' を弾かないため）
        s = s.replace("=", "");
        if (s.isEmpty()) {
            return null;
        }
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if ((c < 'A' || c > 'Z') && (c < '2' || c > '7')) {
                return null;
            }
        }
        return s;
    }

    private int computeTotp(String base32Secret, long timeStep) {
        try {
            byte[] key = new Base32().decode(base32Secret);
            byte[] msg = new byte[8];
            long t = timeStep;
            for (int i = 7; i >= 0; i--) {
                msg[i] = (byte) (t & 0xFF);
                t >>= 8;
            }
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(msg);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset]     & 0x7F) << 24)
                       | ((hash[offset + 1] & 0xFF) << 16)
                       | ((hash[offset + 2] & 0xFF) << 8)
                       |  (hash[offset + 3] & 0xFF);
            return binary % 1_000_000;
        } catch (Exception e) {
            return -1;
        }
    }

    @Transactional(readOnly = true)
    public TotpSetupResponse generateSetup(Long employeeId, String loginId) {
        GoogleAuthenticatorKey credentials = googleAuthenticator.createCredentials();
        String secret = credentials.getKey();
        // otpauth URI を手動構築: issuer:account の ":" はリテラルのままにする（spec 準拠）
        String encodedIssuer = URLEncoder.encode(ISSUER, StandardCharsets.UTF_8).replace("+", "%20");
        String encodedAccount = URLEncoder.encode(loginId, StandardCharsets.UTF_8).replace("+", "%20");
        String label = encodedIssuer + ":" + encodedAccount;
        String qrUri = "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=" + encodedIssuer
                + "&algorithm=SHA1&digits=6&period=30";
        return new TotpSetupResponse(secret, qrUri, null);
    }

    @Transactional
    public void enable(Long employeeId, String secret) {
        EmployeeAccount account = employeeAccountRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        account.setTotpSecret(secret);
        account.setTotpEnabled(true);
        employeeAccountRepository.save(account);
    }

    @Transactional
    public void disable(Long employeeId) {
        EmployeeAccount account = employeeAccountRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        account.setTotpSecret(null);
        account.setTotpEnabled(false);
        employeeAccountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public boolean isEnabled(Long employeeId) {
        return employeeAccountRepository.findById(employeeId)
                .map(EmployeeAccount::isTotpEnabled)
                .orElse(false);
    }
}
