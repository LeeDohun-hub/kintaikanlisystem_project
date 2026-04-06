package com.kintai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "attendance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false)
    private LocalDate workDate;

    private LocalTime startTime;
    private LocalTime endTime;

    @Builder.Default
    private Integer breakMinutes = 0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WorkType workType = WorkType.NORMAL;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id")
    private Project project;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum WorkType {
        NORMAL, OVERTIME, HOLIDAY
    }

    public double getWorkHours() {
        if (startTime == null || endTime == null) return 0;
        long minutes = Duration.between(startTime, endTime).toMinutes();
        int brk = breakMinutes != null ? breakMinutes : 0;
        return Math.max(0, (minutes - brk) / 60.0);
    }
}
