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
public class ConversationResponse {
    private Long partnerId;
    private String partnerName;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private int unreadCount;
}
