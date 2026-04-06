package com.kintai.controller;

import com.kintai.dto.AttendanceRequest;
import com.kintai.dto.AttendanceResponse;
import com.kintai.dto.LoginResponse;
import com.kintai.service.AttendanceService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<List<AttendanceResponse>> getAll(
            @RequestParam(required = false) String month,
            HttpSession session) {
        LoginResponse user = (LoginResponse) session.getAttribute("loginUser");

        if ("ADMIN".equals(user.getRole())) {
            if (month != null) {
                return ResponseEntity.ok(attendanceService.getAllAttendanceByMonth(month));
            }
            return ResponseEntity.ok(attendanceService.getAllAttendance());
        } else {
            if (month != null) {
                return ResponseEntity.ok(attendanceService.getMyAttendanceByMonth(user.getId(), month));
            }
            return ResponseEntity.ok(attendanceService.getMyAttendance(user.getId()));
        }
    }

    @PostMapping
    public ResponseEntity<AttendanceResponse> create(@RequestBody AttendanceRequest request, HttpSession session) {
        LoginResponse user = (LoginResponse) session.getAttribute("loginUser");
        // 관리자가 employeeId를 지정한 경우 해당 직원, 아니면 본인
        Long targetId = ("ADMIN".equals(user.getRole()) && request.getEmployeeId() != null)
                ? request.getEmployeeId()
                : user.getId();
        return ResponseEntity.ok(attendanceService.createAttendance(targetId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AttendanceResponse> update(@PathVariable Long id, @RequestBody AttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.updateAttendance(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        attendanceService.deleteAttendance(id);
        return ResponseEntity.noContent().build();
    }
}
