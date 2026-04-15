package com.kintai.service;

import com.kintai.auth.LoginFailureCode;
import com.kintai.dto.LoginAttemptRowResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.LoginAttempt;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.LoginAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private static final int MAX_LIST = 500;

    private final LoginAttemptRepository loginAttemptRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public void recordSuccess(String loginId, Long employeeId, String ipAddress, String userAgent) {
        LoginAttempt row = LoginAttempt.builder()
                .loginId(truncateLoginId(loginId))
                .successFlag(1)
                .failureCode(null)
                .employeeId(employeeId)
                .ipAddress(truncate(ipAddress, 45))
                .userAgent(truncate(userAgent, 500))
                .build();
        loginAttemptRepository.save(row);
    }

    @Transactional
    public void recordFailure(
            String loginId,
            LoginFailureCode code,
            Long employeeId,
            String ipAddress,
            String userAgent
    ) {
        LoginAttempt row = LoginAttempt.builder()
                .loginId(truncateLoginId(loginId))
                .successFlag(0)
                .failureCode(code != null ? code.name() : "UNKNOWN")
                .employeeId(employeeId)
                .ipAddress(truncate(ipAddress, 45))
                .userAgent(truncate(userAgent, 500))
                .build();
        loginAttemptRepository.save(row);
    }

    @Transactional(readOnly = true)
    public List<LoginAttemptRowResponse> listRecent(int limit) {
        int cap = Math.min(Math.max(limit, 1), MAX_LIST);
        List<LoginAttempt> attempts = loginAttemptRepository.findAllByOrderByAttemptedAtDesc(PageRequest.of(0, cap));
        Set<Long> empIds = attempts.stream()
                .map(LoginAttempt::getEmployeeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Employee> byId = empIds.isEmpty()
                ? Collections.emptyMap()
                : employeeRepository.findAllById(empIds).stream()
                        .collect(Collectors.toMap(Employee::getEmployeeId, Function.identity()));
        return attempts.stream()
                .map(a -> toRow(a, byId.get(a.getEmployeeId())))
                .toList();
    }

    private static LoginAttemptRowResponse toRow(LoginAttempt a, Employee employee) {
        String employeeName = employee != null ? employee.getEmployeeName() : null;
        String department = employee != null ? employee.getDepartment() : null;
        return LoginAttemptRowResponse.builder()
                .attemptId(a.getAttemptId())
                .attemptedAt(a.getAttemptedAt())
                .loginId(a.getLoginId())
                .employeeName(employeeName)
                .department(department)
                .success(a.getSuccessFlag() != null && a.getSuccessFlag() == 1)
                .failureCode(a.getFailureCode())
                .employeeId(a.getEmployeeId())
                .ipAddress(a.getIpAddress())
                .build();
    }

    private static String truncateLoginId(String loginId) {
        if (loginId == null || loginId.isEmpty()) {
            return "";
        }
        return truncate(loginId, 100);
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) {
            return null;
        }
        if (s.length() <= maxLen) {
            return s;
        }
        return s.substring(0, maxLen);
    }
}
