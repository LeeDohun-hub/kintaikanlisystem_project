package com.kintai.controller;

import com.kintai.auth.LoginRejectedException;
import com.kintai.dto.LoginRequest;
import com.kintai.dto.LoginResponse;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.service.AuthService;
import com.kintai.service.LoginAttemptService;
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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
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
            LoginResponse response = authService.login(request);
            loginAttemptService.recordSuccess(loginId, response.getId(), ip, ua);
            session.setAttribute("loginUser", response);
            return ResponseEntity.ok(response);
        } catch (LoginRejectedException e) {
            loginAttemptService.recordFailure(loginId, e.getFailureCode(), e.getEmployeeId(), ip, ua);
            return ApiResponses.error(
                    HttpStatus.UNAUTHORIZED,
                    "ログインIDまたはパスワードが正しくありません。");
        }
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
        // Fetch live status from DB
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
        if (ua == null) {
            return null;
        }
        return ua.length() <= 500 ? ua : ua.substring(0, 500);
    }

    /**
     * 監査用途の表示を「0.0.0.0」形式に寄せる。
     * - IPv4 はそのまま
     * - IPv6 loopback は 127.0.0.1
     * - IPv6-mapped IPv4 は IPv4 に変換
     * - その他 IPv6 は 0.0.0.0 にフォールバック
     */
    private static String normalizeIpV4Dotted(String ip) {
        if (ip == null || ip.isBlank()) {
            return null;
        }
        String s = ip.trim();

        // Fast-path: already IPv4 dotted decimal
        if (s.matches("^\\d{1,3}(?:\\.\\d{1,3}){3}$")) {
            return s;
        }
        // Common dev loopback forms
        if ("::1".equals(s) || "0:0:0:0:0:0:0:1".equalsIgnoreCase(s)) {
            return "127.0.0.1";
        }
        // IPv6-mapped IPv4, e.g. ::ffff:192.168.0.10
        if (s.regionMatches(true, 0, "::ffff:", 0, 7)) {
            String candidate = s.substring(7);
            if (candidate.matches("^\\d{1,3}(?:\\.\\d{1,3}){3}$")) {
                return candidate;
            }
        }

        try {
            InetAddress addr = InetAddress.getByName(s);
            // If InetAddress resolves to IPv4, hostAddress will be dotted.
            String hostAddress = addr.getHostAddress();
            if (hostAddress != null && hostAddress.matches("^\\d{1,3}(?:\\.\\d{1,3}){3}$")) {
                return hostAddress;
            }
            if (addr instanceof Inet6Address && addr.isLoopbackAddress()) {
                return "127.0.0.1";
            }
        } catch (UnknownHostException ignored) {
            // fall through
        }
        return "0.0.0.0";
    }
}
