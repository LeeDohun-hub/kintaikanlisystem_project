package com.kintai.controller;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.LoginResponse;
import com.kintai.service.AdminAttendanceMetricsService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeParseException;

/**
 * 残業・休日労働・深夜・疲労指数（管理者専用）。
 */
@RestController
@RequestMapping("/api/admin/attendance-metrics")
@AdminOnly
@RequiredArgsConstructor
public class AdminAttendanceMetricsController {

    private final AdminAttendanceMetricsService adminAttendanceMetricsService;

    @GetMapping
    public ResponseEntity<?> get(
            @RequestParam("month") String month,
            @RequestParam(value = "standardMonthlyMinutes", required = false) Integer standardMonthlyMinutes,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            return ResponseEntity.ok(
                    adminAttendanceMetricsService.build(month, employeeId, standardMonthlyMinutes));
        } catch (DateTimeParseException e) {
            return ApiResponses.badRequest("月の形式が正しくありません。（YYYY-MM）");
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }
}
