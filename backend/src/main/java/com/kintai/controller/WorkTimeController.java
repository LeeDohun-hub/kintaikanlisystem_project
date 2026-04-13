package com.kintai.controller;

import com.kintai.dto.ImportAttendanceResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.dto.WorkTimeCreateRequest;
import com.kintai.dto.WorkTimeResponse;
import com.kintai.service.AttendanceImportService;
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

    @GetMapping
    public ResponseEntity<?> list(@RequestParam("month") String month, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            List<WorkTimeResponse> rows = workTimeService.listByMonth(month, user);
            return ResponseEntity.ok(rows);
        } catch (DateTimeParseException e) {
            return ApiResponses.badRequest("月の形式が正しくありません。（YYYY-MM）");
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody WorkTimeCreateRequest request, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            WorkTimeResponse saved = workTimeService.create(user.getId(), request);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable("id") Long id,
            @Valid @RequestBody WorkTimeCreateRequest request,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            WorkTimeResponse saved = workTimeService.update(user.getId(), id, request);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable("id") Long id, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) {
            return ApiResponses.unauthorized();
        }
        try {
            workTimeService.delete(user.getId(), id);
            return ApiResponses.message("削除しました。");
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /**
     * 勤務表フォーマット (202604_勤務表(氏名).xlsx) のインポート。
     * 一般社員もアクセス可能（セッションの employeeId を使用）。
     */
    @PostMapping("/import-kintaihyo")
    public ResponseEntity<?> importKintaihyo(
            @RequestParam("file") MultipartFile file,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        if (file == null || file.isEmpty()) return ApiResponses.badRequest("Excel ファイルを選択してください。");
        ImportAttendanceResponse res = attendanceImportService.importKintaihyo(file, user.getId());
        return ResponseEntity.ok(res);
    }
}
