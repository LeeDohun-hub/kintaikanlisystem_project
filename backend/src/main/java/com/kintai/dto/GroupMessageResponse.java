package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupMessageResponse {
    private Long messageId;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String content;
    private String systemType;
    private LocalDateTime createdAt;
}
