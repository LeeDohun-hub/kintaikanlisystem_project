package com.kintai.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRoomRequest {
    private String roomName;
    private List<Long> memberIds;
}
