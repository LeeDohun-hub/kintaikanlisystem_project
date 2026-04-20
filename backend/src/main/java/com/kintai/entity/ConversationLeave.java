package com.kintai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_leave")
@IdClass(ConversationLeaveId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationLeave {

    @Id
    @Column(name = "leaver_id", nullable = false)
    private Long leaverId;

    @Id
    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Column(name = "left_at", nullable = false)
    private LocalDateTime leftAt;

    @PrePersist
    void prePersist() {
        if (leftAt == null) {
            leftAt = LocalDateTime.now();
        }
    }
}
