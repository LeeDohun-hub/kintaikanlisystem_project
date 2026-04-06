package com.kintai.service;

import com.kintai.dto.LoginRequest;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.RegisterRequest;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request) {
        Employee employee = employeeRepository.findByEmployeeCode(request.getEmployeeCode())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), employee.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        return LoginResponse.builder()
                .id(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .name(employee.getName())
                .role(employee.getRole().name())
                .build();
    }

    public LoginResponse register(RegisterRequest request) {
        String code = request.getEmployeeCode().trim();
        if (code.isEmpty()) {
            throw new IllegalArgumentException("직원 코드를 입력해 주세요.");
        }
        if ("admin".equalsIgnoreCase(code)) {
            throw new IllegalArgumentException("사용할 수 없는 직원 코드입니다.");
        }
        if (employeeRepository.existsByEmployeeCode(code)) {
            throw new IllegalArgumentException("이미 사용 중인 직원 코드입니다.");
        }

        String email = request.getEmail();
        if (email != null && !email.isBlank()) {
            email = email.trim();
            if (!email.matches("^[\\w.%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
                throw new IllegalArgumentException("올바른 이메일 형식이 아닙니다.");
            }
        } else {
            email = null;
        }

        Employee employee = Employee.builder()
                .employeeCode(code)
                .name(request.getName().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(email)
                .role(Employee.Role.EMPLOYEE)
                .build();
        employeeRepository.save(employee);

        return LoginResponse.builder()
                .id(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .name(employee.getName())
                .role(employee.getRole().name())
                .build();
    }
}
