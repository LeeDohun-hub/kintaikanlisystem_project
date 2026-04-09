package com.kintai.controller;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.ImportAttendanceResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.MonthlyStatisticsResponse;
import com.kintai.service.AttendanceImportService;
import com.kintai.service.StatisticsService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.format.DateTimeParseException;

/**
 * 713 상세설계의 API 경로(/api/attendance/...)를 제공하기 위한 컨트롤러.
 * 내부 저장 테이블은 work_time 이지만, 외부 API는 상세설계 문서의 경로를 따릅니다.
 */
@RestController
@RequestMapping("/api/attendance")
@AdminOnly
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceImportService attendanceImportService;
    private final StatisticsService statisticsService;

    @PostMapping("/import")
    public ResponseEntity<?> importExcel(@RequestParam("file") MultipartFile file, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        if (file == null || file.isEmpty()) {
            return ApiResponses.badRequest("엑셀 파일을 선택하세요.");
        }
        ImportAttendanceResponse res = attendanceImportService.importExcel(file);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary(@RequestParam("month") String month, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            MonthlyStatisticsResponse data = statisticsService.monthly(month);
            return ResponseEntity.ok(data);
        } catch (DateTimeParseException e) {
            return ApiResponses.badRequest("월 형식이 올바르지 않습니다. (YYYY-MM)");
        }
    }
}

