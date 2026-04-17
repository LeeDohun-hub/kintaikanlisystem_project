package com.kintai.dto;

import lombok.Data;

@Data
public class MessageSendRequest {
    private Long receiverId;
    private String content;
}
