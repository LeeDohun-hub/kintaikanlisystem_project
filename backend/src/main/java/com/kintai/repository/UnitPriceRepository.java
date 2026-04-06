package com.kintai.repository;

import com.kintai.entity.UnitPrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UnitPriceRepository extends JpaRepository<UnitPrice, Long> {
    List<UnitPrice> findByEmployeeId(Long employeeId);
    Optional<UnitPrice> findByEmployeeIdAndMonth(Long employeeId, String month);
    List<UnitPrice> findByMonth(String month);
}
