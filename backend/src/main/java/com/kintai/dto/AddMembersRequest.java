package com.kintai.dto;

import lombok.Data;

import java.util.List;

@Data
public class AddMembersRequest {
    private List<Long> memberIds;
}
