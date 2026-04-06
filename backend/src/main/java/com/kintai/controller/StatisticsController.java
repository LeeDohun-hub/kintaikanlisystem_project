package com.kintai.controller;

import com.kintai.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    @GetMapping("/monthly")
    public ResponseEntity<Map<String, Object>> getMonthly(@RequestParam String month) {
        return ResponseEntity.ok(statisticsService.getMonthlySummary(month));
    }
}
