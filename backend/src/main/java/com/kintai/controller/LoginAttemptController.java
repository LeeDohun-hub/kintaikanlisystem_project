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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @DeleteMapping
    public ResponseEntity<?> deleteAll(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        loginAttemptService.deleteAll();
        return ApiResponses.message("ログイン履歴を全件削除しました。");
    }

    @DeleteMapping("/batch")
    public ResponseEntity<?> deleteBatch(
            @RequestBody List<Long> ids,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        if (ids == null || ids.isEmpty()) {
            return ApiResponses.badRequest("削除対象を選択してください。");
        }
        loginAttemptService.deleteByIds(ids);
        return ApiResponses.message(ids.size() + " 件のログイン履歴を削除しました。");
    }
}
