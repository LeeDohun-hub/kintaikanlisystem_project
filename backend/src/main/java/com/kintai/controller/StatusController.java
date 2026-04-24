package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.entity.EmployeeStatus;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/employees/me")
@RequiredArgsConstructor
public class StatusController {

    private final EmployeeAccountRepository employeeAccountRepository;

    @PatchMapping("/status")
    public ResponseEntity<?> updateStatus(
            @RequestBody Map<String, String> body,
            HttpSession session
    ) {
        LoginResponse me = LoginSessionSupport.requireAuthenticatedUser(session);
        if (me == null) return ApiResponses.unauthorized();

        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            return ApiResponses.error(org.springframework.http.HttpStatus.BAD_REQUEST, "status は必須です。");
        }

        EmployeeStatus newStatus;
        try {
            newStatus = EmployeeStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ApiResponses.error(org.springframework.http.HttpStatus.BAD_REQUEST, "不正なステータス値です。");
        }

        return employeeAccountRepository.findById(me.getId())
                .map(acc -> {
                    acc.setCurrentStatus(newStatus);
                    employeeAccountRepository.save(acc);
                    return ResponseEntity.ok(Map.of("status", newStatus.name()));
                })
                .orElse(ApiResponses.error(org.springframework.http.HttpStatus.NOT_FOUND, "アカウントが見つかりません。"));
    }
}
