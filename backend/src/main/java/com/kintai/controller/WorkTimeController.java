package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.WorkTimeCreateRequest;
import com.kintai.dto.WorkTimeResponse;
import com.kintai.service.WorkTimeService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping({"/api/worktime", "/api/work-time"})
@RequiredArgsConstructor
public class WorkTimeController {

    private final WorkTimeService workTimeService;

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
            return ApiResponses.badRequest("월 형식이 올바르지 않습니다. (YYYY-MM)");
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody WorkTimeCreateRequest request, HttpSession session) {
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
}
