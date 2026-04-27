package com.kintai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(
        name = "work_time_outing",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_work_time_outing_segment", columnNames = {"work_id", "start_time", "end_time"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkTimeOuting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "outing_id")
    private Long outingId;

    @Column(name = "work_id", nullable = false)
    private Long workId;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

