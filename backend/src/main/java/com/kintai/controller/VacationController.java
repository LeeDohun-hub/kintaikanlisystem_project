package com.kintai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kintai.auth.AdminOnly;
import com.kintai.dto.*;
import com.kintai.service.LeaveBalanceService;
import com.kintai.service.VacationService;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService      vacationService;
    private final LeaveBalanceService  leaveBalanceService;
    private final ObjectMapper         objectMapper;

    // ── 社員向け ────────────────────────────────────────────────

    @GetMapping("/my")
    public ResponseEntity<?> myRequests(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(vacationService.getMyRequests(user.getId()));
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> submit(
            @RequestPart("request") String requestJson,
            @RequestPart(value = "file", required = false) MultipartFile file,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            VacationSubmitRequest req = objectMapper.readValue(requestJson, VacationSubmitRequest.class);
            return ResponseEntity.ok(vacationService.submit(user, req, file));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        } catch (IOException e) {
            return ApiResponses.badRequest("リクエストのパースに失敗しました。");
        }
    }

    /** 管理者による添付ファイルの追加・更新（ステータス問わず） */
    @PostMapping(value = "/{requestId}/admin-attachment", consumes = "multipart/form-data")
    @AdminOnly
    public ResponseEntity<?> adminUpdateAttachment(
            @PathVariable("requestId") Long requestId,
            @RequestPart("file") MultipartFile file,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.adminUpdateAttachment(user, requestId, file));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /** 証明書のアップロード（APPROVED_PENDING_PROOF の申請に対して社員本人が実行） */
    @PostMapping(value = "/{requestId}/proof", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadProof(
            @PathVariable("requestId") Long requestId,
            @RequestPart("file") MultipartFile file,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.uploadProof(user, requestId, file));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @GetMapping("/{requestId}/attachment")
    public ResponseEntity<?> downloadAttachment(
            @PathVariable("requestId") Long requestId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            boolean isAdmin = "ADMIN".equals(user.getRole());
            Path filePath = vacationService.resolveAttachmentPath(requestId, user.getId(), isAdmin);
            if (!Files.exists(filePath)) return ApiResponses.error(HttpStatus.NOT_FOUND, "ファイルが見つかりません。");
            Resource resource = new PathResource(filePath);
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            String encodedName = URLEncoder.encode(filePath.getFileName().toString(), StandardCharsets.UTF_8)
                    .replace("+", "%20");
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.attachment().filename(encodedName).build().toString())
                    .body(resource);
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        } catch (IOException e) {
            return ApiResponses.error(HttpStatus.INTERNAL_SERVER_ERROR, "ファイルの読み込みに失敗しました。");
        }
    }

    @GetMapping("/balance")
    public ResponseEntity<?> myBalance(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(leaveBalanceService.forEmployee(user.getId(), java.time.LocalDate.now()));
    }

    @GetMapping("/balance/admin")
    @AdminOnly
    public ResponseEntity<?> balanceForEmployee(
            @RequestParam(name = "employeeId") Long employeeId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(leaveBalanceService.forEmployee(employeeId, java.time.LocalDate.now()));
    }

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

    @GetMapping
    @AdminOnly
    public ResponseEntity<?> allRequests(
            @RequestParam(name = "status", required = false) String status,
            HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.getAllRequests(status));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PutMapping("/{requestId}/approve")
    @AdminOnly
    public ResponseEntity<?> approve(@PathVariable("requestId") Long requestId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.approve(user, requestId));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    @PutMapping("/{requestId}/reject")
    @AdminOnly
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

    /** 証明書の確認 → 最終承認（APPROVED_PENDING_PROOF → APPROVED） */
    @PutMapping("/{requestId}/proof-verify")
    @AdminOnly
    public ResponseEntity<?> verifyProof(@PathVariable("requestId") Long requestId, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.verifyProof(user, requestId));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /** 管理者代理申請 */
    @PostMapping("/proxy-submit")
    @AdminOnly
    public ResponseEntity<?> proxySubmit(
            @RequestBody VacationProxySubmitRequest req, HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        try {
            return ResponseEntity.ok(vacationService.adminProxySubmit(user, req));
        } catch (IllegalArgumentException e) {
            return ApiResponses.badRequest(e.getMessage());
        }
    }

    /** 証明書待ち一覧（管理者向け） */
    @GetMapping("/pending-proof")
    @AdminOnly
    public ResponseEntity<?> pendingProof(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return ResponseEntity.ok(vacationService.getPendingProofRequests(user));
    }

    @DeleteMapping("/{requestId}/admin")
    @AdminOnly
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
}
