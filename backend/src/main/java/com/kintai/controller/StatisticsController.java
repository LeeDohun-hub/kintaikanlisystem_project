package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.MonthlyStatisticsResponse;
import com.kintai.service.StatisticsService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    @GetMapping("/monthly")
    public ResponseEntity<?> monthly(@RequestParam("month") String month, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        if (!"ADMIN".equals(user.getRole())) {
            return ApiResponses.error(HttpStatus.FORBIDDEN, "관리자만 조회할 수 있습니다.");
        }
        try {
            MonthlyStatisticsResponse data = statisticsService.monthly(month);
            return ResponseEntity.ok(data);
        } catch (DateTimeParseException e) {
            return ApiResponses.badRequest("월 형식이 올바르지 않습니다. (YYYY-MM)");
        }
    }
}
