package com.kintai.controller;

import com.kintai.dto.EmployeeSummaryResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        if (!"ADMIN".equals(user.getRole())) {
            return ApiResponses.error(HttpStatus.FORBIDDEN, "관리자만 조회할 수 있습니다.");
        }
        List<EmployeeSummaryResponse> rows = employeeRepository.findAll().stream()
                .map(EmployeeController::toSummary)
                .toList();
        return ResponseEntity.ok(rows);
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
