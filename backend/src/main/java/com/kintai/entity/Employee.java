package com.kintai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Long employeeId;

    @Column(name = "employee_code", nullable = false, unique = true, length = 20)
    private String employeeCode;

    @Column(name = "employee_name", nullable = false, length = 50)
    private String employeeName;

    @Column(length = 50)
    private String department;

    /** 未登録者向け招待メールの送付先（任意） */
    @Column(name = "invite_email", length = 254)
    private String inviteEmail;

    @Column(name = "hourly_cost", nullable = false, precision = 8, scale = 2)
    private BigDecimal hourlyCost;

    @Column(name = "active_flag", nullable = false)
    private Integer activeFlag;

    /** 入社日（年休付与の起算日）。未指定時は登録日を使用。 */
    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "photo_filename", length = 255)
    private String photoFilename;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (activeFlag == null) {
            activeFlag = 1;
        }
        if (hireDate == null) {
            hireDate = createdAt.toLocalDate();
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
