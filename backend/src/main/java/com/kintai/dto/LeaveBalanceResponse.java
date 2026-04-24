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

    /** 対象社員 */
    private Long employeeId;

    /** 年休の起算となる入社日 */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate hireDate;

    /** 付与日（入社日 + 6ヶ月） */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate grantDate;

    /** 付与済みか */
    private boolean granted;

    /** 付与数（付与前は 0）: 10 + 付与日からの完了月数 */
    private BigDecimal grantedDays;

    /** 付与日から今日までの完了月数（毎月+1日の算出基準） */
    private long monthsSinceGrant;

    /** 申請/承認済み消化数（FULL=1, HALF=0.5） */
    private BigDecimal usedDays;

    /** 残数（付与前は 0）。管理者で無制限のときは null */
    private BigDecimal remainingDays;

    /** true のとき年休残数・付与前制限によらず休暇申請可（管理者本人向け） */
    private boolean unlimitedAnnualLeave;
}

