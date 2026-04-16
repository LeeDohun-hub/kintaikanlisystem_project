package com.kintai.dto;

import lombok.Data;

/**
 * 招待メール送信リクエスト。
 * initialPassword を渡すとメール本文に初期パスワードを記載する（初回登録時のみ想定）。
 */
@Data
public class EmployeeInviteEmailSendRequest {

    /** 招待メール送付先（未保存の場合に同時保存する） */
    private String inviteEmail;

    /** メールに記載するログインID（任意） */
    private String loginId;

    /** メールに記載する初期パスワード（任意・初回登録時のみ） */
    private String initialPassword;
}
