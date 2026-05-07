package com.kintai.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
public class ChatRoomMemberId implements Serializable {

    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "employee_id")
    private Long employeeId;
}
