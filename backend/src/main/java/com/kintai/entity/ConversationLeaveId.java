package com.kintai.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConversationLeaveId implements Serializable {
    private Long leaverId;
    private Long partnerId;
}
