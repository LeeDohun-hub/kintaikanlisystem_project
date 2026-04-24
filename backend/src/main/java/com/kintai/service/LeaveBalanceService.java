package com.kintai.service;

import com.kintai.dto.LeaveBalanceResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.Role;
import com.kintai.entity.VacationStatus;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveBalanceService {

    private static final BigDecimal GRANT_DAYS = new BigDecimal("10.0");
    private static final int ELIGIBLE_MONTHS = 6;

    private final EmployeeRepository employeeRepository;
    private final EmployeeAccountRepository employeeAccountRepository;
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
        boolean isAdmin = employeeAccountRepository.findById(employeeId)
                .map(acc -> acc.getRole() == Role.ADMIN)
                .orElse(false);

        // 管理者は年休残数・入社6ヶ月ルールの対象外（申請・承認時の残数チェックもスキップ）
        if (isAdmin) {
            BigDecimal used = vacationRequestRepository.sumUsedDays(
                    employeeId,
                    hire,
                    List.of(VacationStatus.PENDING, VacationStatus.APPROVED)
            );
            if (used == null) {
                used = BigDecimal.ZERO;
            }
            used = used.setScale(1, RoundingMode.HALF_UP);
            return LeaveBalanceResponse.builder()
                    .employeeId(employeeId)
                    .hireDate(hire)
                    .grantDate(grantDate)
                    .granted(true)
                    .unlimitedAnnualLeave(true)
                    .grantedDays(null)
                    .monthsSinceGrant(0L)
                    .usedDays(used)
                    .remainingDays(null)
                    .build();
        }

        boolean granted = !today.isBefore(grantDate);

        long monthsSinceGrant = granted ? ChronoUnit.MONTHS.between(grantDate, today) : 0L;
        BigDecimal grantedDays = granted
                ? GRANT_DAYS.add(BigDecimal.valueOf(monthsSinceGrant))
                : BigDecimal.ZERO;

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

        remaining = remaining.setScale(1, RoundingMode.HALF_UP);
        used = used.setScale(1, RoundingMode.HALF_UP);
        grantedDays = grantedDays.setScale(1, RoundingMode.HALF_UP);

        return LeaveBalanceResponse.builder()
                .employeeId(employeeId)
                .hireDate(hire)
                .grantDate(grantDate)
                .granted(granted)
                .unlimitedAnnualLeave(false)
                .grantedDays(grantedDays)
                .monthsSinceGrant(monthsSinceGrant)
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

