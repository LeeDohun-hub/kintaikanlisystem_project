package com.kintai.entity;

public enum VacationType {

    // ── 年次有給休暇（年休残数を消費する） ────────────────────────
    FULL,                       // 全休
    HALF_AM,                    // 午前半休
    HALF_PM,                    // 午後半休

    // ── 経弔休暇（年休残数を消費しない） ──────────────────────────
    CONDOLENCE_OWN_MARRIAGE,    // 本人結婚   最大5日
    CONDOLENCE_CHILD_MARRIAGE,  // 子供結婚   最大1日
    CONDOLENCE_SPOUSE_BIRTH,    // 配偶者出産 最大3日
    CONDOLENCE_FUNERAL_1ST,     // 忌引き（親・配偶者・子）最大5日
    CONDOLENCE_FUNERAL_2ND,     // 忌引き（祖父母・兄弟） 最大3日

    // ── 産休・育休（年休残数を消費しない） ────────────────────────
    MATERNITY_PRE,              // 産前休暇
    MATERNITY_POST,             // 産後休暇
    CHILDCARE_LEAVE,            // 育児休職

    // ── 病欠（会社独自・年休残数を消費しない） ────────────────────
    SICK_LEAVE                  // 病欠
}
