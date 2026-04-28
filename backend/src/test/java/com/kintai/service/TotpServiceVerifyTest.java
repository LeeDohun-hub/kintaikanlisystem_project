package com.kintai.service;

import com.kintai.repository.EmployeeAccountRepository;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.codec.binary.Base32;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * RFC 6238 と同一のカウンタ・HMAC 手順で生成したコードが verify で通ることのみ確認する。
 */
@ExtendWith(MockitoExtension.class)
class TotpServiceVerifyTest {

    @Mock
    EmployeeAccountRepository employeeAccountRepository;

    @Test
    void verifyAcceptsCodeForCurrentWindow() throws Exception {
        GoogleAuthenticator ga = new GoogleAuthenticator();
        TotpService svc = new TotpService(employeeAccountRepository, ga);

        String secret = "JBSWY3DPEHPK3PXP"; // 16 文字 Base32 例
        long step = System.currentTimeMillis() / 30_000L;
        int code = hotpAtStep(secret, step);

        assertTrue(svc.verify(secret, code));
    }

    private static int hotpAtStep(String base32Secret, long timeStep) throws Exception {
        byte[] key = new Base32().decode(base32Secret.toUpperCase());
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
        int binary = ((hash[offset] & 0x7F) << 24)
                | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8)
                | (hash[offset + 3] & 0xFF);
        return binary % 1_000_000;
    }
}
