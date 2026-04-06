package com.kintai.service;

import com.kintai.dto.LoginRequest;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.RegisterRequest;
import com.kintai.entity.Employee;
import com.kintai.entity.Role;
import com.kintai.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public void register(RegisterRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }
        if (employeeRepository.existsByEmployeeCode(request.getEmployeeCode().trim())) {
            throw new IllegalArgumentException("이미 사용 중인 직원 코드입니다.");
        }
        Employee employee = Employee.builder()
                .employeeCode(request.getEmployeeCode().trim())
                .name(request.getName().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.EMPLOYEE)
                .build();
        employeeRepository.save(employee);
    }
}
