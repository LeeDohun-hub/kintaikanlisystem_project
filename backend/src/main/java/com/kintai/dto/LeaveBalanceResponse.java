package com.kintai.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveBalanceResponse {

    private Long employeeId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate hireDate;

    /** 最初の年休付与日（入社日 + 6ヶ月） */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate grantDate;

    /** 付与済みか（入社6ヶ月経過後） */
    private boolean granted;

    /** 現在有効な付与の合計日数（2年消滅後は除外済み） */
    private BigDecimal grantedDays;

    /** 消化済み日数（PENDING/APPROVED の年休のみ） */
    private BigDecimal usedDays;

    /** 年休残数（管理者で無制限のときは null） */
    private BigDecimal remainingDays;

    /** true のとき年休残数チェックなし（管理者） */
    private boolean unlimitedAnnualLeave;

    // ── 次回付与情報 ──────────────────────────────────────────────

    /** 次回付与日（最大20日に到達済みの場合も次の更新日を示す） */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate nextGrantDate;

    /** 次回付与予定日数 */
    private Integer nextGrantDays;

    // ── 消滅時効 ──────────────────────────────────────────────────

    /** 現在有効な付与のうち最も早く消滅する日（2年時効） */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate earliestExpiryDate;

    // ── 義務使用追跡（年5日） ─────────────────────────────────────

    /** 現在の付与期間の開始日（最新の付与日） */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate currentPeriodStart;

    /** 現在の付与期間の終了日（次回付与日） */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate currentPeriodEnd;

    /** 現在の付与期間内に消化した年休日数 */
    private BigDecimal currentPeriodUsed;

    /** 義務使用日数（現在の付与が10日以上なら5、そうでなければ0） */
    private int mandatoryUseDays;

    /** 義務使用が充足されているか */
    private boolean mandatoryUseSatisfied;

    // ── 後方互換（フロントが参照しているフィールド） ─────────────

    /** @deprecated 段階制付与移行により意味が変わるため非推奨。grantedDays を使用すること */
    @Deprecated
    private long monthsSinceGrant;
}
