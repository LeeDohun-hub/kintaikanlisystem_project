package com.kintai.service;

import com.kintai.dto.LeaveBalanceResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationStatus;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveBalanceService {

    private static final BigDecimal GRANT_DAYS = new BigDecimal("10.0");
    private static final int ELIGIBLE_MONTHS = 6;

    private final EmployeeRepository employeeRepository;
    private final VacationRequestRepository vacationRequestRepository;

    @Transactional(readOnly = true)
    public LeaveBalanceResponse forEmployee(Long employeeId, LocalDate asOfDate) {
        if (employeeId == null) {
            throw new IllegalArgumentException("employeeId が必要です。");
        }
        Employee e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));

        LocalDate hire = e.getHireDate();
        if (hire == null) {
            // 理論上 null にならないが、既存 DB 互換のためガード
            hire = e.getCreatedAt() != null ? e.getCreatedAt().toLocalDate() : LocalDate.now();
        }

        LocalDate grantDate = hire.plusMonths(ELIGIBLE_MONTHS);
        LocalDate today = asOfDate != null ? asOfDate : LocalDate.now();
        boolean granted = !today.isBefore(grantDate);
        BigDecimal grantedDays = granted ? GRANT_DAYS : BigDecimal.ZERO;

        BigDecimal used = BigDecimal.ZERO;
        if (granted) {
            used = vacationRequestRepository.sumUsedDays(
                    employeeId,
                    grantDate,
                    List.of(VacationStatus.PENDING, VacationStatus.APPROVED)
            );
            if (used == null) {
                used = BigDecimal.ZERO;
            }
        }

        BigDecimal remaining = grantedDays.subtract(used);
        if (remaining.signum() < 0) {
            remaining = BigDecimal.ZERO;
        }

        // 0.5 単位に丸め（表示のブレ防止）
        remaining = remaining.setScale(1, RoundingMode.HALF_UP);
        used = used.setScale(1, RoundingMode.HALF_UP);
        grantedDays = grantedDays.setScale(1, RoundingMode.HALF_UP);

        return LeaveBalanceResponse.builder()
                .employeeId(employeeId)
                .hireDate(hire)
                .grantDate(grantDate)
                .granted(granted)
                .grantedDays(grantedDays)
                .usedDays(used)
                .remainingDays(remaining)
                .build();
    }

    /** 申請1件の必要消化数（FULL=1, HALF=0.5） */
    public static BigDecimal requiredUnits(String vacationTypeRaw) {
        if (vacationTypeRaw == null) return BigDecimal.ZERO;
        String t = vacationTypeRaw.trim().toUpperCase();
        return switch (t) {
            case "FULL" -> new BigDecimal("1.0");
            case "HALF_AM", "HALF_PM" -> new BigDecimal("0.5");
            default -> BigDecimal.ZERO;
        };
    }
}

