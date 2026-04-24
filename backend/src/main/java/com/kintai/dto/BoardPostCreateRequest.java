package com.kintai.dto;

import lombok.Data;

@Data
public class BoardPostCreateRequest {
    /** NOTICE | FREE | QNA | EVENTS（省略時は FREE） */
    private String category;
    private String title;
    private String content;
}
