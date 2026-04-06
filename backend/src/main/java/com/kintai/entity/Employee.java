package com.kintai.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
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
    private Long id;

    @Column(unique = true, nullable = false, length = 20)
    private String employeeCode;

    @Column(nullable = false, length = 100)
    private String name;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(length = 100)
    private String email;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.EMPLOYEE;

    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum Role {
        EMPLOYEE, ADMIN
    }
}
