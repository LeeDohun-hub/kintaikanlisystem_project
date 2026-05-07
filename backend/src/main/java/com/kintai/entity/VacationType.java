package com.kintai.entity;

public enum VacationType {

    // ── 年次有給休暇（遡及不可） ────────────────────────────────────
    FULL(false, 0, false),
    HALF_AM(false, 0, false),
    HALF_PM(false, 0, false),

    // ── 経弔休暇 ────────────────────────────────────────────────────
    CONDOLENCE_OWN_MARRIAGE(false, 0, false),
    CONDOLENCE_CHILD_MARRIAGE(false, 0, false),
    CONDOLENCE_SPOUSE_BIRTH(true, 3, false),   // 緊急: 遡及可 / 証明任意
    CONDOLENCE_FUNERAL_1ST(true, 3, true),     // 緊急: 遡及可 / 証明必須
    CONDOLENCE_FUNERAL_2ND(true, 3, true),     // 緊急: 遡及可 / 証明必須

    // ── 産休・育休（遡及可） ────────────────────────────────────────
    MATERNITY_PRE(true, 7, true),
    MATERNITY_POST(true, 7, true),
    CHILDCARE_LEAVE(true, 7, true),

    // ── 病欠（遡及可 / 証明必須） ───────────────────────────────────
    SICK_LEAVE(true, 7, true);

    /** 社員が過去日付で自己申請できるか */
    private final boolean retroAllowed;
    /** 遡及申請の最大日数（retroAllowed=false の場合は 0） */
    private final int retroMaxDays;
    /** 承認後に証明書提出が必要か */
    private final boolean proofRequired;

    VacationType(boolean retroAllowed, int retroMaxDays, boolean proofRequired) {
        this.retroAllowed  = retroAllowed;
        this.retroMaxDays  = retroMaxDays;
        this.proofRequired = proofRequired;
    }

    public boolean isRetroAllowed()  { return retroAllowed; }
    public int    getRetroMaxDays()  { return retroMaxDays; }
    public boolean isProofRequired() { return proofRequired; }
}
