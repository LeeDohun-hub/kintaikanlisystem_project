package com.kintai.controller;

import com.kintai.entity.UnitPrice;
import com.kintai.service.UnitPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/unit-prices")
@RequiredArgsConstructor
public class UnitPriceController {

    private final UnitPriceService unitPriceService;

    @GetMapping
    public ResponseEntity<List<UnitPrice>> getByMonth(@RequestParam String month) {
        return ResponseEntity.ok(unitPriceService.getByMonth(month));
    }

    @PostMapping
    public ResponseEntity<UnitPrice> save(@RequestBody Map<String, Object> request) {
        Long employeeId = Long.valueOf(request.get("employeeId").toString());
        String month = (String) request.get("month");
        BigDecimal price = new BigDecimal(request.get("price").toString());
        return ResponseEntity.ok(unitPriceService.save(employeeId, month, price));
    }
}
