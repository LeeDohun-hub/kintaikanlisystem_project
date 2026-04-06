package com.kintai.controller;

import com.kintai.entity.PaymentSchedule;
import com.kintai.service.PaymentScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payment-schedules")
@RequiredArgsConstructor
public class PaymentScheduleController {

    private final PaymentScheduleService paymentScheduleService;

    @GetMapping
    public ResponseEntity<List<PaymentSchedule>> getByMonth(@RequestParam String month) {
        return ResponseEntity.ok(paymentScheduleService.getByMonth(month));
    }

    @PostMapping
    public ResponseEntity<PaymentSchedule> create(@RequestBody Map<String, Object> request) {
        PaymentSchedule schedule = new PaymentSchedule();
        schedule.setMonth((String) request.get("month"));
        if (request.get("scheduledAmount") != null) {
            schedule.setScheduledAmount(new BigDecimal(request.get("scheduledAmount").toString()));
        }
        if (request.get("scheduledDate") != null && !request.get("scheduledDate").toString().isBlank()) {
            schedule.setScheduledDate(LocalDate.parse(request.get("scheduledDate").toString()));
        }
        Long employeeId = Long.valueOf(request.get("employeeId").toString());
        return ResponseEntity.ok(paymentScheduleService.save(schedule, employeeId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PaymentSchedule> update(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        PaymentSchedule updated = new PaymentSchedule();
        if (request.get("scheduledAmount") != null) {
            updated.setScheduledAmount(new BigDecimal(request.get("scheduledAmount").toString()));
        }
        if (request.get("scheduledDate") != null && !request.get("scheduledDate").toString().isBlank()) {
            updated.setScheduledDate(LocalDate.parse(request.get("scheduledDate").toString()));
        }
        if (request.get("isReceived") != null) {
            updated.setIsReceived((Boolean) request.get("isReceived"));
        }
        return ResponseEntity.ok(paymentScheduleService.update(id, updated));
    }
}
