package com.kintai.controller;

import com.kintai.auth.LoginRejectedException;
import com.kintai.auth.LoginValidationResult;
import com.kintai.dto.*;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.service.AuthService;
import com.kintai.service.LoginAttemptService;
import com.kintai.service.TotpPendingSetupStore;
import com.kintai.service.TotpService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final TotpService totpService;
    private final TotpPendingSetupStore totpPendingSetupStore;
    private final LoginAttemptService loginAttemptService;
    private final EmployeeAccountRepository employeeAccountRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request,
            HttpSession session,
            HttpServletRequest httpRequest
    ) {
        String loginId = request.getLoginId() != null ? request.getLoginId().trim() : "";
        String ip = clientIp(httpRequest);
        String ua = truncateUserAgent(httpRequest.getHeader("User-Agent"));

        try {
            LoginValidationResult result = authService.login(request);

            if (result.totpRequired()) {
                // 2FA 設定済み: コード入力ステップへ
                session.setAttribute("preAuthUser", result.user());
                session.setAttribute("preAuthTotpSecret", result.totpSecret());
                return ResponseEntity.ok(LoginResponse.builder().requireTotp(true).build());
            }

            if (result.totpSetupRequired()) {
                // 2FA 未設定: ログイン画面内でセットアップを強制
                session.setAttribute("preAuthUser", result.user());
                TotpSetupResponse setup = totpService.generateSetup(result.user().getId(), loginId);
                String setupToken = totpPendingSetupStore.register(result.user().getId(), setup.getSecret());
                session.setAttribute("pendingTotpSecret", setup.getSecret());
                return ResponseEntity.ok(LoginResponse.builder()
                        .requireTotpSetup(true)
                        .setupSecret(setup.getSecret())
                        .setupQrUri(setup.getQrUri())
                        .setupToken(setupToken)
                        .build());
            }

            // 通常ログイン完了（将来的にここには来ない想定）
            loginAttemptService.recordSuccess(loginId, result.user().getId(), ip, ua);
            session.setAttribute("loginUser", result.user());
            return ResponseEntity.ok(result.user());

        } catch (LoginRejectedException e) {
            loginAttemptService.recordFailure(loginId, e.getFailureCode(), e.getEmployeeId(), ip, ua);
            return ApiResponses.error(
                    HttpStatus.UNAUTHORIZED,
                    "ログインIDまたはパスワードが正しくありません。");
        }
    }

    /** 既存 2FA コード検証（2FA 設定済みユーザーのログイン） */
    @PostMapping("/totp/verify")
    public ResponseEntity<?> verifyTotp(
            @RequestBody TotpVerifyRequest request,
            HttpSession session,
            HttpServletRequest httpRequest
    ) {
        LoginResponse preAuth = (LoginResponse) session.getAttribute("preAuthUser");
        String secret = (String) session.getAttribute("preAuthTotpSecret");

        if (preAuth == null || secret == null) {
            return ApiResponses.error(HttpStatus.UNAUTHORIZED, "セッションが無効です。再度ログインしてください。");
        }

        int code;
        try {
            code = Integer.parseInt(request.getTotpCode().trim());
        } catch (NumberFormatException e) {
            return ApiResponses.error(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません。");
        }

        if (!totpService.verify(secret, code)) {
            return ApiResponses.error(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません。");
        }

        String ip = clientIp(httpRequest);
        String ua = truncateUserAgent(httpRequest.getHeader("User-Agent"));
        loginAttemptService.recordSuccess(null, preAuth.getId(), ip, ua);

        session.removeAttribute("preAuthUser");
        session.removeAttribute("preAuthTotpSecret");
        session.setAttribute("loginUser", preAuth);
        return ResponseEntity.ok(preAuth);
    }

    /** 初回 2FA セットアップ完了 → ログイン完了（2FA 未設定ユーザーのログイン） */
    @PostMapping("/totp/enroll")
    public ResponseEntity<?> enrollTotp(
            @RequestBody TotpVerifyRequest request,
            HttpSession session,
            HttpServletRequest httpRequest
    ) {
        LoginResponse preAuth = (LoginResponse) session.getAttribute("preAuthUser");
        if (preAuth == null) {
            return ApiResponses.error(HttpStatus.UNAUTHORIZED, "セッションが無効です。再度ログインしてください。");
        }

        String setupToken = request.getSetupToken() != null ? request.getSetupToken().trim() : "";
        String secret = null;
        if (!setupToken.isEmpty()) {
            secret = totpPendingSetupStore.peekSecret(setupToken, preAuth.getId()).orElse(null);
        }
        if (secret == null) {
            secret = (String) session.getAttribute("pendingTotpSecret");
        }
        if (secret == null) {
            return ApiResponses.error(HttpStatus.UNAUTHORIZED, "セッションが無効です。再度ログインしてください。");
        }

        int code;
        try {
            code = Integer.parseInt(request.getTotpCode().trim());
        } catch (NumberFormatException e) {
            return ApiResponses.error(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません。");
        }

        if (!totpService.verify(secret, code)) {
            return ApiResponses.error(HttpStatus.UNAUTHORIZED, "認証コードが正しくありません。Authenticatorアプリを確認してください。");
        }

        // 2FA を有効化してログイン完了
        totpService.enable(preAuth.getId(), secret);
        if (!setupToken.isEmpty()) {
            totpPendingSetupStore.remove(setupToken);
        }

        String ip = clientIp(httpRequest);
        String ua = truncateUserAgent(httpRequest.getHeader("User-Agent"));
        loginAttemptService.recordSuccess(null, preAuth.getId(), ip, ua);

        session.removeAttribute("preAuthUser");
        session.removeAttribute("pendingTotpSecret");
        session.setAttribute("loginUser", preAuth);
        return ResponseEntity.ok(preAuth);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ApiResponses.message("ログアウトしました。");
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        return employeeAccountRepository.findById(user.getId())
                .map(acc -> {
                    String status = acc.getCurrentStatus() != null ? acc.getCurrentStatus().name() : "PRESENT";
                    LoginResponse fresh = LoginResponse.builder()
                            .id(user.getId())
                            .employeeCode(user.getEmployeeCode())
                            .name(user.getName())
                            .role(user.getRole())
                            .status(status)
                            .build();
                    return ResponseEntity.ok((Object) fresh);
                })
                .orElse(ResponseEntity.ok(user));
    }

    /** プロフィール: 2FA リセット用 QR コード生成（ログイン必須） */
    @GetMapping("/totp/setup")
    public ResponseEntity<?> totpSetup(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();

        return employeeAccountRepository.findById(user.getId())
                .map(acc -> {
                    TotpSetupResponse setup = totpService.generateSetup(user.getId(), acc.getLoginId());
                    String setupToken = totpPendingSetupStore.register(user.getId(), setup.getSecret());
                    session.setAttribute("pendingTotpSecret", setup.getSecret());
                    TotpSetupResponse body = new TotpSetupResponse(setup.getSecret(), setup.getQrUri(), setupToken);
                    return ResponseEntity.ok((Object) body);
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /** プロフィール: 2FA 有効化（ログイン必須） */
    @PostMapping("/totp/enable")
    public ResponseEntity<?> totpEnable(
            @RequestBody TotpVerifyRequest request,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();

        String setupToken = request.getSetupToken() != null ? request.getSetupToken().trim() : "";
        String pendingSecret = null;
        if (!setupToken.isEmpty()) {
            pendingSecret = totpPendingSetupStore.peekSecret(setupToken, user.getId()).orElse(null);
        }
        if (pendingSecret == null) {
            pendingSecret = (String) session.getAttribute("pendingTotpSecret");
        }
        if (pendingSecret == null) {
            return ApiResponses.error(HttpStatus.BAD_REQUEST, "QRコードを先に表示してください。");
        }

        int code;
        try {
            code = Integer.parseInt(request.getTotpCode().trim());
        } catch (NumberFormatException e) {
            return ApiResponses.error(HttpStatus.BAD_REQUEST, "認証コードが正しくありません。");
        }

        if (!totpService.verify(pendingSecret, code)) {
            return ApiResponses.error(HttpStatus.BAD_REQUEST, "認証コードが正しくありません。Authenticatorアプリを確認してください。");
        }

        totpService.enable(user.getId(), pendingSecret);
        if (!setupToken.isEmpty()) {
            totpPendingSetupStore.remove(setupToken);
        }
        session.removeAttribute("pendingTotpSecret");
        return ApiResponses.message("2段階認証を有効にしました。");
    }

    /** プロフィール: 2FA 無効化＝デバイス変更用リセット（ログイン必須） */
    @PostMapping("/totp/disable")
    public ResponseEntity<?> totpDisable(
            @RequestBody TotpVerifyRequest request,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();

        if (!totpService.isEnabled(user.getId())) {
            return ApiResponses.error(HttpStatus.BAD_REQUEST, "2段階認証は有効になっていません。");
        }

        return employeeAccountRepository.findById(user.getId())
                .map(acc -> {
                    int code;
                    try {
                        code = Integer.parseInt(request.getTotpCode().trim());
                    } catch (NumberFormatException e) {
                        return ApiResponses.error(HttpStatus.BAD_REQUEST, "認証コードが正しくありません。");
                    }
                    if (!totpService.verify(acc.getTotpSecret(), code)) {
                        return ApiResponses.error(HttpStatus.BAD_REQUEST, "認証コードが正しくありません。");
                    }
                    totpService.disable(user.getId());
                    return ApiResponses.message("2段階認証をリセットしました。次回ログイン時に再設定が必要です。");
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /** 2FA 有効状態確認（ログイン必須） */
    @GetMapping("/totp/status")
    public ResponseEntity<?> totpStatus(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(Map.of("enabled", totpService.isEnabled(user.getId())));
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        String raw;
        if (xff != null && !xff.isBlank()) {
            raw = xff.split(",")[0].trim();
        } else {
            raw = req.getRemoteAddr();
        }
        return normalizeIpV4Dotted(raw);
    }

    private static String truncateUserAgent(String ua) {
        if (ua == null) return null;
        return ua.length() <= 500 ? ua : ua.substring(0, 500);
    }

    private static String normalizeIpV4Dotted(String ip) {
        if (ip == null || ip.isBlank()) return null;
        String s = ip.trim();
        if (s.matches("^\\d{1,3}(?:\\.\\d{1,3}){3}$")) return s;
        if ("::1".equals(s) || "0:0:0:0:0:0:0:1".equalsIgnoreCase(s)) return "127.0.0.1";
        if (s.regionMatches(true, 0, "::ffff:", 0, 7)) {
            String candidate = s.substring(7);
            if (candidate.matches("^\\d{1,3}(?:\\.\\d{1,3}){3}$")) return candidate;
        }
        try {
            InetAddress addr = InetAddress.getByName(s);
            String hostAddress = addr.getHostAddress();
            if (hostAddress != null && hostAddress.matches("^\\d{1,3}(?:\\.\\d{1,3}){3}$")) return hostAddress;
            if (addr instanceof Inet6Address && addr.isLoopbackAddress()) return "127.0.0.1";
        } catch (UnknownHostException ignored) {}
        return "0.0.0.0";
    }
}
