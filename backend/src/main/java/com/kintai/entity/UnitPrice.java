package com.kintai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "unit_price")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnitPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false, length = 7)
    private String month; // YYYY-MM

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
}
