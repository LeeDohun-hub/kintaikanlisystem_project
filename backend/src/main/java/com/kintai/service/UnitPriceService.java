package com.kintai.service;

import com.kintai.entity.Employee;
import com.kintai.entity.UnitPrice;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.UnitPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UnitPriceService {

    private final UnitPriceRepository unitPriceRepository;
    private final EmployeeRepository employeeRepository;

    public List<UnitPrice> getByMonth(String month) {
        return unitPriceRepository.findByMonth(month);
    }

    public UnitPrice save(Long employeeId, String month, BigDecimal price) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeId));

        UnitPrice unitPrice = unitPriceRepository.findByEmployeeIdAndMonth(employeeId, month)
                .orElse(new UnitPrice());
        unitPrice.setEmployee(employee);
        unitPrice.setMonth(month);
        unitPrice.setPrice(price);
        return unitPriceRepository.save(unitPrice);
    }
}
