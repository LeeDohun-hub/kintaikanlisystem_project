package com.kintai.dto;

import lombok.Data;

import java.time.LocalDate;

/** 本人のみ更新可能な項目 */
@Data
public class MyProfileUpdateRequest {

    private String address;
    private String phoneNumber;
    private LocalDate birthDate;
    private String gender;
}
