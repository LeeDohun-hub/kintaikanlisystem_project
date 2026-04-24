package com.kintai.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** ログイン本人のプロフィール参照用（編集不可項目含む） */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyProfileResponse {

    private String employeeCode;
    private String employeeName;
    private String department;

    private String address;
    private String phoneNumber;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;

    private String gender;

    /** アップロード済みのプロフィール写真があるか（未設定なら UI はデフォルトアイコン） */
    private boolean hasPhoto;
}
