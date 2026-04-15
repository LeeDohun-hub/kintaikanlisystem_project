package com.kintai.service;

import com.kintai.auth.LoginFailureCode;
import com.kintai.auth.LoginRejectedException;
import com.kintai.dto.LoginRequest;
import com.kintai.dto.LoginResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.EmployeeAccount;
import com.kintai.repository.EmployeeAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final EmployeeAccountRepository employeeAccountRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String loginId = request.getLoginId() != null ? request.getLoginId().trim() : "";
        if (loginId.isEmpty()) {
            throw new LoginRejectedException(LoginFailureCode.BLANK_LOGIN_ID, null);
        }

        EmployeeAccount account = employeeAccountRepository.findByLoginId(loginId)
                .orElseThrow(() -> new LoginRejectedException(LoginFailureCode.UNKNOWN_LOGIN_ID, null));

        Employee employee = account.getEmployee();
        if (employee.getActiveFlag() == null || employee.getActiveFlag() == 0) {
            throw new LoginRejectedException(LoginFailureCode.ACCOUNT_INACTIVE, employee.getEmployeeId());
        }

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new LoginRejectedException(LoginFailureCode.BAD_PASSWORD, employee.getEmployeeId());
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            String selected = request.getRole().trim().toUpperCase();
            if (!account.getRole().name().equals(selected)) {
                throw new LoginRejectedException(LoginFailureCode.ROLE_MISMATCH, employee.getEmployeeId());
            }
        }

        return LoginResponse.builder()
                .id(employee.getEmployeeId())
                .employeeCode(employee.getEmployeeCode())
                .name(employee.getEmployeeName())
                .role(account.getRole().name())
                .build();
    }
}
