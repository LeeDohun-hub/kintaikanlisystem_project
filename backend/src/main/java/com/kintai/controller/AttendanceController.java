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
 * 713 詳細設計の API パス（/api/attendance/...）を提供するコントローラ。
 * 内部保存テーブルは work_time だが、外部 API は詳細設計ドキュメントのパスに従う。
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
            return ApiResponses.badRequest("Excel ファイルを選択してください。");
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
            return ApiResponses.badRequest("月の形式が正しくありません。（YYYY-MM）");
        }
    }
}

