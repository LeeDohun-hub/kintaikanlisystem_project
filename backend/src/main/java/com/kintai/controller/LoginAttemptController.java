package com.kintai.controller;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.LoginAttemptRowResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.service.LoginAttemptService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/login-attempts")
@AdminOnly
@RequiredArgsConstructor
public class LoginAttemptController {

    private final LoginAttemptService loginAttemptService;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(value = "limit", defaultValue = "200") int limit,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        List<LoginAttemptRowResponse> rows = loginAttemptService.listRecent(limit);
        return ResponseEntity.ok(rows);
    }
}
