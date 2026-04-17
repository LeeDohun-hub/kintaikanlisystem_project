package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.UserSummaryResponse;
import com.kintai.repository.EmployeeRepository;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 全認証ユーザー向けの社員一覧（メッセージ送信先選択などに使用）。
 * 管理者限定ではない。
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        LoginResponse me = LoginSessionSupport.requireAuthenticatedUser(session);
        if (me == null) return ApiResponses.unauthorized();

        List<UserSummaryResponse> users = employeeRepository.findAll().stream()
                .filter(e -> e.getActiveFlag() != null && e.getActiveFlag() == 1)
                .filter(e -> !e.getEmployeeId().equals(me.getId()))
                .sorted((a, b) -> a.getEmployeeName().compareTo(b.getEmployeeName()))
                .map(e -> UserSummaryResponse.builder()
                        .employeeId(e.getEmployeeId())
                        .employeeName(e.getEmployeeName())
                        .department(e.getDepartment())
                        .build())
                .toList();
        return ResponseEntity.ok(users);
    }
}
