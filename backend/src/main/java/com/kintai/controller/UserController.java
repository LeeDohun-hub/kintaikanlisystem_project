package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.UserSummaryResponse;
import com.kintai.entity.EmployeeAccount;
import com.kintai.repository.EmployeeAccountRepository;
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
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 全認証ユーザー向けの社員一覧（メッセージ送信先選択などに使用）。
 * 管理者限定ではない。
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final EmployeeRepository employeeRepository;
    private final EmployeeAccountRepository employeeAccountRepository;

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        LoginResponse me = LoginSessionSupport.requireAuthenticatedUser(session);
        if (me == null) return ApiResponses.unauthorized();

        Map<Long, String> statusMap = employeeAccountRepository.findAll().stream()
                .collect(Collectors.toMap(
                        EmployeeAccount::getEmployeeId,
                        acc -> acc.getCurrentStatus() != null ? acc.getCurrentStatus().name() : "PRESENT"
                ));

        List<UserSummaryResponse> users = employeeRepository.findAll().stream()
                .filter(e -> e.getActiveFlag() != null && e.getActiveFlag() == 1)
                .filter(e -> !e.getEmployeeId().equals(me.getId()))
                .sorted((a, b) -> a.getEmployeeName().compareTo(b.getEmployeeName()))
                .map(e -> UserSummaryResponse.builder()
                        .employeeId(e.getEmployeeId())
                        .employeeName(e.getEmployeeName())
                        .department(e.getDepartment())
                        .status(statusMap.getOrDefault(e.getEmployeeId(), "PRESENT"))
                        .photoFilename(e.getPhotoFilename())
                        .build())
                .toList();
        return ResponseEntity.ok(users);
    }
}
