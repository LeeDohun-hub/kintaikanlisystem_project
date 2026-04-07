package com.kintai.controller;

import com.kintai.dto.LoginRequest;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.RegisterRequest;
import com.kintai.service.AuthService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            authService.register(request);
            return ApiResponses.message("회원가입이 완료되었습니다.");
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpSession session) {
        try {
            LoginResponse response = authService.login(request);
            session.setAttribute("loginUser", response);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ApiResponses.error(
                    HttpStatus.UNAUTHORIZED,
                    "아이디 또는 비밀번호가 올바르지 않습니다.");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ApiResponses.message("로그아웃 되었습니다.");
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        return ResponseEntity.ok(user);
    }
}
