package com.kintai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupRoomResponse {
    private Long roomId;
    private String roomName;
    private int memberCount;
    private List<MemberInfo> members;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private int unreadCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private Long employeeId;
        private String employeeName;
    }
}
