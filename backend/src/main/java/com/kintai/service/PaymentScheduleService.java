package com.kintai.service;

import com.kintai.entity.Employee;
import com.kintai.entity.PaymentSchedule;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.PaymentScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentScheduleService {

    private final PaymentScheduleRepository paymentScheduleRepository;
    private final EmployeeRepository employeeRepository;

    public List<PaymentSchedule> getByMonth(String month) {
        return paymentScheduleRepository.findByMonth(month);
    }

    public PaymentSchedule save(PaymentSchedule schedule, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeId));
        schedule.setEmployee(employee);
        return paymentScheduleRepository.save(schedule);
    }

    public PaymentSchedule update(Long id, PaymentSchedule updated) {
        PaymentSchedule schedule = paymentScheduleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PaymentSchedule not found: " + id));
        if (updated.getScheduledAmount() != null) schedule.setScheduledAmount(updated.getScheduledAmount());
        if (updated.getScheduledDate() != null) schedule.setScheduledDate(updated.getScheduledDate());
        if (updated.getIsReceived() != null) schedule.setIsReceived(updated.getIsReceived());
        return paymentScheduleRepository.save(schedule);
    }
}
