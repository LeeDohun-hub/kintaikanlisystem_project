package com.kintai.controller;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.EmployeeBatchDeleteRequest;
import com.kintai.dto.EmployeeCreateRequest;
import com.kintai.dto.EmployeeSummaryResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.EmployeeAccount;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.service.EmployeeMasterService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/employees")
@AdminOnly
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeRepository employeeRepository;
    private final EmployeeAccountRepository employeeAccountRepository;
    private final EmployeeMasterService employeeMasterService;

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        List<EmployeeSummaryResponse> rows = employeeRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
        return ResponseEntity.ok(rows);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody EmployeeCreateRequest req, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            return ResponseEntity.ok(employeeMasterService.create(req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    private static final int MAX_BATCH_DELETE = 200;

    /**
     * 選択した従業員（と紐づくアカウント・勤務データ等、DB の CASCADE 設定に従う）を削除する。
     */
    @PostMapping("/batch-delete")
    public ResponseEntity<?> batchDelete(@RequestBody EmployeeBatchDeleteRequest req, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        List<Long> ids = req.getEmployeeIds();
        if (ids == null || ids.isEmpty()) {
            return ApiResponses.badRequest("削除対象を選択してください。");
        }
        Set<Long> unique = new HashSet<>(ids);
        if (unique.size() > MAX_BATCH_DELETE) {
            return ApiResponses.badRequest("一度に削除できる件数は " + MAX_BATCH_DELETE + " 件までです。");
        }
        long selfId = user.getId();
        if (unique.contains(selfId)) {
            return ApiResponses.badRequest("ログイン中の自分自身のアカウントは削除できません。");
        }
        for (Long id : unique) {
            if (id == null || id <= 0) {
                return ApiResponses.badRequest("無効な従業員IDが含まれています。");
            }
        }
        for (Long id : unique) {
            if (employeeRepository.existsById(id)) {
                employeeRepository.deleteById(id);
            }
        }
        return ApiResponses.message(unique.size() + " 件の従業員を削除しました。");
    }

    private EmployeeSummaryResponse toSummary(Employee e) {
        return employeeAccountRepository.findById(e.getEmployeeId())
                .map(a -> toSummary(e, a))
                .orElseGet(() -> EmployeeSummaryResponse.builder()
                        .employeeId(e.getEmployeeId())
                        .employeeCode(e.getEmployeeCode())
                        .employeeName(e.getEmployeeName())
                        .department(e.getDepartment())
                        .hourlyCost(e.getHourlyCost())
                        .activeFlag(e.getActiveFlag())
                        .loginId(null)
                        .role(null)
                        .build());
    }

    private static EmployeeSummaryResponse toSummary(Employee e, EmployeeAccount a) {
        return EmployeeSummaryResponse.builder()
                .employeeId(e.getEmployeeId())
                .employeeCode(e.getEmployeeCode())
                .employeeName(e.getEmployeeName())
                .department(e.getDepartment())
                .hourlyCost(e.getHourlyCost())
                .activeFlag(e.getActiveFlag())
                .loginId(a.getLoginId())
                .role(a.getRole().name())
                .build();
    }
}
