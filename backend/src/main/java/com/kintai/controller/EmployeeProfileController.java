package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.MyProfileUpdateRequest;
import com.kintai.service.EmployeeSelfProfileService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ログイン本人のプロフィール（個人情報の参照・更新）。管理者専用APIではない。
 */
@RestController
@RequestMapping("/api/employees/me/profile")
@RequiredArgsConstructor
public class EmployeeProfileController {

    private final EmployeeSelfProfileService employeeSelfProfileService;

    @GetMapping
    public ResponseEntity<?> get(HttpSession session) {
        LoginResponse me = LoginSessionSupport.requireAuthenticatedUser(session);
        if (me == null) {
            return ApiResponses.unauthorized();
        }
        try {
            return ResponseEntity.ok(employeeSelfProfileService.getProfile(me.getId()));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PatchMapping
    public ResponseEntity<?> patch(@RequestBody MyProfileUpdateRequest req, HttpSession session) {
        LoginResponse me = LoginSessionSupport.requireAuthenticatedUser(session);
        if (me == null) {
            return ApiResponses.unauthorized();
        }
        try {
            return ResponseEntity.ok(employeeSelfProfileService.updateProfile(me.getId(), req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }
}
