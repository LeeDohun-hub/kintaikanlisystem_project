package com.kintai.config;

import com.kintai.entity.Employee;
import com.kintai.entity.Project;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!employeeRepository.existsByEmployeeCode("admin")) {
            employeeRepository.save(Employee.builder()
                    .employeeCode("admin")
                    .name("관리자")
                    .password(passwordEncoder.encode("admin123"))
                    .role(Employee.Role.ADMIN)
                    .build());
        }

        if (!employeeRepository.existsByEmployeeCode("emp001")) {
            employeeRepository.save(Employee.builder()
                    .employeeCode("emp001")
                    .name("김철수")
                    .password(passwordEncoder.encode("emp123"))
                    .email("kim@example.com")
                    .role(Employee.Role.EMPLOYEE)
                    .unitPrice(new BigDecimal("5000"))
                    .build());
        }

        if (!employeeRepository.existsByEmployeeCode("emp002")) {
            employeeRepository.save(Employee.builder()
                    .employeeCode("emp002")
                    .name("이영희")
                    .password(passwordEncoder.encode("emp123"))
                    .email("lee@example.com")
                    .role(Employee.Role.EMPLOYEE)
                    .unitPrice(new BigDecimal("4500"))
                    .build());
        }

        if (projectRepository.count() == 0) {
            projectRepository.save(Project.builder().name("프로젝트 A").description("메인 개발 프로젝트").build());
            projectRepository.save(Project.builder().name("프로젝트 B").description("유지보수 프로젝트").build());
        }
    }
}
