package com.kintai.service;

import com.kintai.dto.LoginRequest;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.RegisterRequest;
import com.kintai.entity.Employee;
import com.kintai.entity.EmployeeAccount;
import com.kintai.entity.Role;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeAccountRepository employeeAccountRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request) {
        Employee employee = employeeRepository.findByEmployeeCode(request.getEmployeeCode())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (employee.getActiveFlag() == null || employee.getActiveFlag() == 0) {
            throw new RuntimeException("Invalid credentials");
        }

        EmployeeAccount account = employeeAccountRepository.findById(employee.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            String selected = request.getRole().trim().toUpperCase();
            if (!account.getRole().name().equals(selected)) {
                throw new RuntimeException("Invalid credentials");
            }
        }

        return LoginResponse.builder()
                .id(employee.getEmployeeId())
                .employeeCode(employee.getEmployeeCode())
                .name(employee.getEmployeeName())
                .role(account.getRole().name())
                .build();
    }

    @Transactional
    public void register(RegisterRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }
        if (employeeRepository.existsByEmployeeCode(request.getEmployeeCode().trim())) {
            throw new IllegalArgumentException("이미 사용 중인 직원 코드입니다.");
        }

        BigDecimal hourly = request.getHourlyCost() != null ? request.getHourlyCost() : BigDecimal.ZERO;
        Role role;
        try {
            role = Role.valueOf(request.getRole().trim().toUpperCase());
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("역할이 올바르지 않습니다. (ADMIN 또는 EMPLOYEE)");
        }

        Employee employee = Employee.builder()
                .employeeCode(request.getEmployeeCode().trim())
                .employeeName(request.getName().trim())
                .department(request.getDepartment() != null && !request.getDepartment().isBlank()
                        ? request.getDepartment().trim()
                        : null)
                .hourlyCost(hourly)
                .build();
        employeeRepository.save(employee);

        EmployeeAccount account = EmployeeAccount.builder()
                .employee(employee)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();
        employeeAccountRepository.save(account);
    }
}
