package com.kintai.repository;

import com.kintai.entity.PaymentSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentScheduleRepository extends JpaRepository<PaymentSchedule, Long> {
    List<PaymentSchedule> findByMonth(String month);
    List<PaymentSchedule> findByEmployeeIdOrderByMonthDesc(Long employeeId);
}
