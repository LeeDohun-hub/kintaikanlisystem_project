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
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveBalanceService {

    /**
     * 年次有給休暇 付与日数テーブル（労働基準法第39条）
     * index = 付与回数（0始まり）, 値 = 付与日数
     *   0: 入社6ヶ月後  → 10日
     *   1: 1年6ヶ月後   → 11日
     *   2: 2年6ヶ月後   → 12日
     *   3: 3年6ヶ月後   → 14日
     *   4: 4年6ヶ月後   → 16日
     *   5: 5年6ヶ月後   → 18日
     *   6: 6年6ヶ月後以降 → 20日（上限）
     */
    private static final int[] GRANT_TIER = {10, 11, 12, 14, 16, 18, 20};

    /** 初回付与までの月数 */
    private static final int FIRST_GRANT_MONTHS = 6;

    /** 付与間隔（月） */
    private static final int GRANT_INTERVAL_MONTHS = 12;

    /** 消滅時効（月） */
    private static final int EXPIRY_MONTHS = 24;

    /** 義務使用日数（10日以上付与された場合） */
    private static final int MANDATORY_USE_DAYS = 5;

    private final EmployeeRepository employeeRepository;
    private final EmployeeAccountRepository employeeAccountRepository;
    private final VacationRequestRepository vacationRequestRepository;

    // ── 内部レコード ───────────────────────────────────────────────

    private record GrantRecord(int index, LocalDate grantDate, LocalDate expiryDate, int days) {}

    // ── 静的ユーティリティ ─────────────────────────────────────────

    /** 付与回数インデックス n に対応する付与日を返す */
    private static LocalDate grantDateForIndex(LocalDate hire, int n) {
        return hire.plusMonths(FIRST_GRANT_MONTHS + (long) GRANT_INTERVAL_MONTHS * n);
    }

    /** 付与回数インデックス n に対応する付与日数を返す */
    private static int daysForIndex(int n) {
        return n < GRANT_TIER.length ? GRANT_TIER[n] : 20;
    }

    /**
     * asOf 時点で有効（発生済み・未消滅）な付与レコードを昇順で返す。
     * 2年消滅時効を適用する。
     */
    private static List<GrantRecord> activeGrants(LocalDate hire, LocalDate asOf) {
        List<GrantRecord> result = new ArrayList<>();
        for (int n = 0; ; n++) {
            LocalDate grantDate = grantDateForIndex(hire, n);
            if (grantDate.isAfter(asOf)) break;
            LocalDate expiryDate = grantDate.plusMonths(EXPIRY_MONTHS);
            if (!expiryDate.isAfter(asOf)) continue; // 消滅済み
            result.add(new GrantRecord(n, grantDate, expiryDate, daysForIndex(n)));
        }
        return result;
    }

    /** 申請1件が消費する年休日数（年休以外は 0） */
    public static BigDecimal requiredUnits(String vacationTypeRaw) {
        if (vacationTypeRaw == null) return BigDecimal.ZERO;
        return switch (vacationTypeRaw.trim().toUpperCase()) {
            case "FULL"    -> new BigDecimal("1.0");
            case "HALF_AM",
                 "HALF_PM" -> new BigDecimal("0.5");
            default        -> BigDecimal.ZERO; // 経弔・産休・病欠は消費しない
        };
    }

    // ── 公開メソッド ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public LeaveBalanceResponse forEmployee(Long employeeId, LocalDate asOfDate) {
        if (employeeId == null) {
            throw new IllegalArgumentException("employeeId が必要です。");
        }
        Employee e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));

        LocalDate hire = e.getHireDate();
        if (hire == null) {
            hire = e.getCreatedAt() != null ? e.getCreatedAt().toLocalDate() : LocalDate.now();
        }

        LocalDate today = asOfDate != null ? asOfDate : LocalDate.now();
        LocalDate firstGrantDate = grantDateForIndex(hire, 0);

        boolean isAdmin = employeeAccountRepository.findById(employeeId)
                .map(acc -> acc.getRole() == Role.ADMIN)
                .orElse(false);

        if (isAdmin) {
            return buildAdminResponse(employeeId, hire, firstGrantDate, today);
        }

        List<GrantRecord> grants = activeGrants(hire, today);
        boolean granted = !grants.isEmpty();

        if (!granted) {
            return LeaveBalanceResponse.builder()
                    .employeeId(employeeId)
                    .hireDate(hire)
                    .grantDate(firstGrantDate)
                    .granted(false)
                    .grantedDays(BigDecimal.ZERO)
                    .usedDays(BigDecimal.ZERO)
                    .remainingDays(BigDecimal.ZERO)
                    .unlimitedAnnualLeave(false)
                    .nextGrantDate(firstGrantDate)
                    .nextGrantDays(10)
                    .monthsSinceGrant(0L)
                    .build();
        }

        // 有効付与の合計日数
        BigDecimal totalGranted = grants.stream()
                .map(g -> BigDecimal.valueOf(g.days()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 消化日数（最古の有効付与日から集計）
        LocalDate oldestGrantDate = grants.get(0).grantDate();
        BigDecimal used = sumUsedDays(employeeId, oldestGrantDate);

        BigDecimal remaining = totalGranted.subtract(used).max(BigDecimal.ZERO);

        // 最新付与レコード（現在の付与期間）
        GrantRecord lastGrant = grants.get(grants.size() - 1);
        int nextIdx = lastGrant.index() + 1;
        LocalDate nextGrantDate = grantDateForIndex(hire, nextIdx);
        int nextGrantDays = daysForIndex(nextIdx);

        // 現在の付与期間内の消化日数（義務使用チェック）
        BigDecimal currentPeriodUsed = sumUsedDays(employeeId, lastGrant.grantDate());
        int mandatoryUseDays = lastGrant.days() >= 10 ? MANDATORY_USE_DAYS : 0;
        boolean mandatoryUseSatisfied = currentPeriodUsed.compareTo(BigDecimal.valueOf(mandatoryUseDays)) >= 0;

        // 消滅時効（最古の有効付与の消滅日）
        LocalDate earliestExpiry = grants.get(0).expiryDate();

        return LeaveBalanceResponse.builder()
                .employeeId(employeeId)
                .hireDate(hire)
                .grantDate(firstGrantDate)
                .granted(true)
                .unlimitedAnnualLeave(false)
                .grantedDays(totalGranted.setScale(1, RoundingMode.HALF_UP))
                .usedDays(used.setScale(1, RoundingMode.HALF_UP))
                .remainingDays(remaining.setScale(1, RoundingMode.HALF_UP))
                .nextGrantDate(nextGrantDate)
                .nextGrantDays(nextGrantDays)
                .earliestExpiryDate(earliestExpiry)
                .currentPeriodStart(lastGrant.grantDate())
                .currentPeriodEnd(nextGrantDate)
                .currentPeriodUsed(currentPeriodUsed.setScale(1, RoundingMode.HALF_UP))
                .mandatoryUseDays(mandatoryUseDays)
                .mandatoryUseSatisfied(mandatoryUseSatisfied)
                .monthsSinceGrant(0L) // 後方互換（未使用）
                .build();
    }

    // ── 内部 ──────────────────────────────────────────────────────

    private LeaveBalanceResponse buildAdminResponse(Long employeeId, LocalDate hire,
                                                    LocalDate firstGrantDate, LocalDate today) {
        LocalDate oldestGrantDate = activeGrants(hire, today).stream()
                .findFirst()
                .map(GrantRecord::grantDate)
                .orElse(hire);
        BigDecimal used = sumUsedDays(employeeId, oldestGrantDate);
        return LeaveBalanceResponse.builder()
                .employeeId(employeeId)
                .hireDate(hire)
                .grantDate(firstGrantDate)
                .granted(true)
                .unlimitedAnnualLeave(true)
                .grantedDays(null)
                .usedDays(used.setScale(1, RoundingMode.HALF_UP))
                .remainingDays(null)
                .monthsSinceGrant(0L)
                .build();
    }

    private BigDecimal sumUsedDays(Long employeeId, LocalDate fromDate) {
        BigDecimal v = vacationRequestRepository.sumUsedDays(
                employeeId, fromDate, List.of(VacationStatus.PENDING, VacationStatus.APPROVED));
        return v != null ? v : BigDecimal.ZERO;
    }
}
