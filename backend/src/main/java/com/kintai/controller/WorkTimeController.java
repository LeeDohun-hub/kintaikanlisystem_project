package com.kintai.controller;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.ImportAttendanceResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.SendMonthlyReportRequest;
import com.kintai.dto.WorkTimeBulkRequest;
import com.kintai.dto.WorkTimeCreateRequest;
import com.kintai.dto.WorkTimeResponse;
import com.kintai.service.AttendanceImportService;
import com.kintai.service.AttendanceReportEmailService;
import com.kintai.service.WorkTimeService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping({"/api/worktime", "/api/work-time"})
@RequiredArgsConstructor
public class WorkTimeController {

    private final WorkTimeService workTimeService;
    private final AttendanceImportService attendanceImportService;
    private final AttendanceReportEmailService attendanceReportEmailService;

    private static Long targetEmployeeId(LoginResponse user, Long employeeIdParam) {
        if (user == null) return null;
        if ("ADMIN".equals(user.getRole()) && employeeIdParam != null) {
            return employeeIdParam;
        }
        return user.getId();
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam("month") String month,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            List<WorkTimeResponse> rows = workTimeService.listByMonth(month, user, employeeId);
            return ResponseEntity.ok(rows);
        } catch (DateTimeParseException e) {
            return ApiResponses.badRequest("月の形式が正しくありません。（YYYY-MM）");
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
            @Valid @RequestBody WorkTimeCreateRequest request,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            Long targetId = targetEmployeeId(user, employeeId);
            WorkTimeResponse saved = workTimeService.create(targetId, request);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /**
     * 월간 표 입력(여러 날짜)을 한 번에 저장/상書き.
     */
    @PostMapping("/bulk")
    public ResponseEntity<?> bulk(
            @Valid @RequestBody WorkTimeBulkRequest request,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            Long targetId = targetEmployeeId(user, employeeId);
            ImportAttendanceResponse res = workTimeService.bulkUpsert(
                    targetId,
                    request.getItems(),
                    request.isOverwriteExisting()
            );
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable("id") Long id,
            @Valid @RequestBody WorkTimeCreateRequest request,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            Long targetId = targetEmployeeId(user, employeeId);
            WorkTimeResponse saved = workTimeService.update(targetId, id, request);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable("id") Long id,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            HttpSession session
    ) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            Long targetId = targetEmployeeId(user, employeeId);
            workTimeService.delete(targetId, id);
            return ApiResponses.message("削除しました。");
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /**
     * 勤務表フォーマット (202604_勤務表(氏名).xlsx) のインポート（管理者のみ）。
     */
    @AdminOnly
    @PostMapping("/import-kintaihyo")
    public ResponseEntity<?> importKintaihyo(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        if (file == null || file.isEmpty()) return ApiResponses.badRequest("Excel ファイルを選択してください。");
        Long targetId = targetEmployeeId(user, employeeId);
        ImportAttendanceResponse res = attendanceImportService.importKintaihyo(file, targetId);
        return ResponseEntity.ok(res);
    }

    /**
     * 指定月の勤怠データをExcelにまとめ、管理者宛にメール送信する（社員のみ実行可）。
     */
    @PostMapping("/send-monthly-report")
    public ResponseEntity<?> sendMonthlyReport(
            @Valid @RequestBody SendMonthlyReportRequest request,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            attendanceReportEmailService.sendMonthlyReport(user.getId(), request.getMonth());
            return ApiResponses.message(request.getMonth() + " の勤怠レポートを管理者へ送信しました。");
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }
}
