package com.kintai.controller;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.LeaveBalanceResponse;
import com.kintai.dto.VacationRejectRequest;
import com.kintai.dto.VacationSubmitRequest;
import com.kintai.service.LeaveBalanceService;
import com.kintai.service.VacationService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;
    private final LeaveBalanceService leaveBalanceService;

    // ── 社員向け ────────────────────────────────────────────────

    /** 自分の申請一覧 */
    @GetMapping("/my")
    public ResponseEntity<?> myRequests(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(vacationService.getMyRequests(user.getId()));
    }

    /** 休暇申請 */
    @PostMapping
    public ResponseEntity<?> submit(@RequestBody VacationSubmitRequest req, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.submit(user, req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /** 年休残数（本人） */
    @GetMapping("/balance")
    public ResponseEntity<?> myBalance(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        LeaveBalanceResponse bal = leaveBalanceService.forEmployee(user.getId(), java.time.LocalDate.now());
        return ResponseEntity.ok(bal);
    }

    /** 年休残数（管理者: employeeId 指定） */
    @GetMapping("/balance/admin")
    public ResponseEntity<?> balanceForEmployee(@RequestParam("employeeId") Long employeeId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        if (!"ADMIN".equals(user.getRole())) {
            return ApiResponses.error(HttpStatus.FORBIDDEN, "管理者のみアクセスできます。");
        }
        LeaveBalanceResponse bal = leaveBalanceService.forEmployee(employeeId, java.time.LocalDate.now());
        return ResponseEntity.ok(bal);
    }

    /** 申請取消（申請中のみ） */
    @DeleteMapping("/{requestId}")
    public ResponseEntity<?> cancel(@PathVariable("requestId") Long requestId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            vacationService.cancel(user, requestId);
            return ApiResponses.message("申請をキャンセルしました。");
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    // ── 管理者向け ──────────────────────────────────────────────

    /** 申請削除（管理者） */
    @DeleteMapping("/{requestId}/admin")
    public ResponseEntity<?> adminDelete(@PathVariable("requestId") Long requestId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            vacationService.adminDelete(user, requestId);
            return ApiResponses.message("申請を削除しました。");
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /** 全申請一覧（?status=PENDING など） */
    @GetMapping
    public ResponseEntity<?> allRequests(
            @RequestParam(value = "status", required = false) String status,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        if (!"ADMIN".equals(user.getRole())) {
            return ApiResponses.error(HttpStatus.FORBIDDEN, "管理者のみアクセスできます。");
        }
        try {
            return ResponseEntity.ok(vacationService.getAllRequests(status));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /** 承認 */
    @PutMapping("/{requestId}/approve")
    public ResponseEntity<?> approve(@PathVariable("requestId") Long requestId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.approve(user, requestId));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /** 却下 */
    @PutMapping("/{requestId}/reject")
    public ResponseEntity<?> reject(
            @PathVariable("requestId") Long requestId,
            @RequestBody(required = false) VacationRejectRequest req,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.reject(user, requestId,
                    req != null ? req : new VacationRejectRequest()));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }
}
