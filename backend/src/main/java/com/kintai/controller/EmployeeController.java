package com.kintai.controller;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.EmployeeCreateRequest;
import com.kintai.dto.EmployeeSummaryResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.List;

@RestController
@RequestMapping("/api/employees")
@AdminOnly
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        List<EmployeeSummaryResponse> rows = employeeRepository.findAll().stream()
                .map(EmployeeController::toSummary)
                .toList();
        return ResponseEntity.ok(rows);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody EmployeeCreateRequest req, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }

        String code = req.getEmployeeCode() != null ? req.getEmployeeCode().trim() : "";
        String name = req.getEmployeeName() != null ? req.getEmployeeName().trim() : "";
        if (code.isBlank() || name.isBlank()) {
            return ApiResponses.badRequest("社員コードと氏名は必須です。");
        }
        if (code.length() > 20) {
            return ApiResponses.badRequest("社員コードは20文字以下です。");
        }
        if (name.length() > 50) {
            return ApiResponses.badRequest("氏名は50文字以下です。");
        }
        if (employeeRepository.existsByEmployeeCode(code)) {
            return ApiResponses.badRequest("既に使用されている社員コードです。");
        }

        BigDecimal hourly = Objects.requireNonNullElse(req.getHourlyCost(), BigDecimal.ZERO);
        Integer active = req.getActiveFlag() != null ? req.getActiveFlag() : 1;
        if (active != 0 && active != 1) {
            return ApiResponses.badRequest("activeFlag は 0 または 1 である必要があります。");
        }

        Employee e = Employee.builder()
                .employeeCode(code)
                .employeeName(name)
                .department(req.getDepartment() != null && !req.getDepartment().isBlank() ? req.getDepartment().trim() : null)
                .hourlyCost(hourly)
                .activeFlag(active)
                .build();
        employeeRepository.save(e);
        return ResponseEntity.ok(toSummary(e));
    }

    private static EmployeeSummaryResponse toSummary(Employee e) {
        return EmployeeSummaryResponse.builder()
                .employeeId(e.getEmployeeId())
                .employeeCode(e.getEmployeeCode())
                .employeeName(e.getEmployeeName())
                .department(e.getDepartment())
                .hourlyCost(e.getHourlyCost())
                .activeFlag(e.getActiveFlag())
                .build();
    }
}
