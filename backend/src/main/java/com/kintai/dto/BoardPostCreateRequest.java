package com.kintai.dto;

import lombok.Data;

@Data
public class BoardPostCreateRequest {
    private String title;
    private String content;
}
