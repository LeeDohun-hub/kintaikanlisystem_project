package com.kintai.service;

import com.kintai.dto.*;
import com.kintai.entity.*;
import com.kintai.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VacationService {

    private static final int  REASON_MAX_LEN       = 500;
    private static final int  MAX_RANGE_DAYS        = 31;
    private static final int  MAX_RANGE_CONDOLENCE  = 7;
    private static final int  MAX_RANGE_MATERNITY   = 730;
    private static final int  PROOF_DUE_DAYS        = 7;
    private static final long MAX_ATTACHMENT_SIZE   = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_ATTACHMENT_TYPES =
            Set.of("application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp");

    private static final String MSG_VACATION_TYPE =
            "休暇区分が正しくありません。（FULL / HALF_AM / HALF_PM / " +
            "CONDOLENCE_OWN_MARRIAGE / CONDOLENCE_CHILD_MARRIAGE / CONDOLENCE_SPOUSE_BIRTH / " +
            "CONDOLENCE_FUNERAL_1ST / CONDOLENCE_FUNERAL_2ND / " +
            "MATERNITY_PRE / MATERNITY_POST / CHILDCARE_LEAVE / SICK_LEAVE）";
    private static final String MSG_STATUS_FILTER  = "statusの値が不正です。";
    private static final String MSG_PENDING_APPROVE = "申請中の休暇申請のみ承認できます。";
    private static final String MSG_PENDING_REJECT  = "申請中の休暇申請のみ却下できます。";

    private final VacationRequestRepository  vacationRequestRepository;
    private final EmployeeRepository         employeeRepository;
    private final EmployeeAccountRepository  employeeAccountRepository;
    private final LeaveBalanceService        leaveBalanceService;
    private final VacationAuditLogRepository auditLogRepository;

    @Value("${app.vacation.upload-dir:./uploads/vacation}")
    private String vacationUploadDir;

    // ── 社員向け ────────────────────────────────────────────────

    @Transactional
    public Object submit(LoginResponse loginUser, VacationSubmitRequest req, MultipartFile file) {
        VacationType type   = parseVacationType(req.getVacationType());
        String reason       = normalizeOptionalBounded(req.getReason(),       REASON_MAX_LEN, "申請理由は500文字以内で入力してください。");
        String retroReason  = normalizeOptionalBounded(req.getRetroReason(),  REASON_MAX_LEN, "遡及事由は500文字以内で入力してください。");

        Employee employee = findEmployee(loginUser.getId());
        ensureEnoughLeave(loginUser.getId(), type);

        String savedPath = null, savedName = null;
        if (file != null && !file.isEmpty()) {
            var att = storeAttachment(file);
            savedPath = att[0];
            savedName = att[1];
        }

        LocalDate start = req.getVacationStartDate();
        LocalDate end   = req.getVacationEndDate();
        if (start == null && end == null) {
            LocalDate single = req.getVacationDate();
            boolean retro = isRetroDate(single);
            validateRetroConditions(single, type, retroReason, false);
            assertNoDuplicateActiveRequest(loginUser.getId(), single);
            VacationRequest saved = vacationRequestRepository.save(
                    buildRequest(employee, type, single, reason, savedPath, savedName, retro, retroReason, null));
            writeAuditLog(saved, loginUser.getId(), employee.getEmployeeName(), "SUBMITTED", null, VacationStatus.PENDING.name(), retro, false, retroReason);
            return toResponse(saved);
        }

        if (start == null || end == null) throw new IllegalArgumentException("休暇の開始日と終了日を入力してください。");
        if (end.isBefore(start))          throw new IllegalArgumentException("終了日は開始日以降の日付を指定してください。");
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        if (days > maxRangeDays(type))    throw new IllegalArgumentException("一度に申請できる日数は最大" + maxRangeDays(type) + "日です。");

        boolean retro = isRetroDate(start);
        // Validate retroactive conditions once (based on start date)
        validateRetroConditions(start, type, retroReason, false);

        List<VacationRequest> toSave = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            assertNoDuplicateActiveRequest(loginUser.getId(), d);
            toSave.add(buildRequest(employee, type, d, reason, savedPath, savedName, retro, retroReason, null));
        }
        List<VacationRequest> saved = vacationRequestRepository.saveAll(toSave);
        if (!saved.isEmpty()) {
            writeAuditLog(saved.get(0), loginUser.getId(), employee.getEmployeeName(), "SUBMITTED", null, VacationStatus.PENDING.name(), retro, false, retroReason);
        }
        return saved.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VacationRequestResponse> getMyRequests(Long employeeId) {
        return vacationRequestRepository.findByEmployeeId(employeeId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public void cancel(LoginResponse loginUser, Long requestId) {
        VacationRequest v = findRequest(requestId);
        v.assertCancellableBy(loginUser.getId());
        vacationRequestRepository.delete(v);
    }

    /** 管理者による添付ファイルの追加・更新（ステータス問わず） */
    @Transactional
    public VacationRequestResponse adminUpdateAttachment(LoginResponse loginUser, Long requestId, MultipartFile file) {
        requireAdmin(loginUser);
        VacationRequest v = findRequest(requestId);
        Employee admin = findEmployee(loginUser.getId());
        var att = storeAttachment(file);
        v.setAttachmentPath(att[0]);
        v.setAttachmentName(att[1]);
        vacationRequestRepository.save(v);
        writeAuditLog(v, loginUser.getId(), admin.getEmployeeName(),
                "ADMIN_ATTACHMENT_UPDATED", v.getStatus().name(), v.getStatus().name(),
                v.isRetroactive(), v.getProxySubmitter() != null, "管理者が添付ファイルを更新");
        return toResponse(v);
    }

    /** 証明書のアップロード（APPROVED_PENDING_PROOF 状態の申請に対して社員本人が実行） */
    @Transactional
    public VacationRequestResponse uploadProof(LoginResponse loginUser, Long requestId, MultipartFile file) {
        VacationRequest v = findRequest(requestId);
        if (!v.getEmployee().getEmployeeId().equals(loginUser.getId())) {
            throw new IllegalArgumentException("アクセス権限がありません。");
        }
        if (v.getStatus() != VacationStatus.APPROVED_PENDING_PROOF) {
            throw new IllegalArgumentException("証明書のアップロードが必要な申請のみ実行できます。");
        }
        var att = storeAttachment(file);
        v.setAttachmentPath(att[0]);
        v.setAttachmentName(att[1]);
        vacationRequestRepository.save(v);
        writeAuditLog(v, loginUser.getId(), v.getEmployee().getEmployeeName(),
                "PROOF_UPLOADED", VacationStatus.APPROVED_PENDING_PROOF.name(), VacationStatus.APPROVED_PENDING_PROOF.name(),
                true, false, null);
        return toResponse(v);
    }

    // ── 管理者向け ──────────────────────────────────────────────

    @Transactional
    public void adminDelete(LoginResponse loginUser, Long requestId) {
        requireAdmin(loginUser);
        vacationRequestRepository.delete(findRequest(requestId));
    }

    @Transactional(readOnly = true)
    public List<VacationRequestResponse> getAllRequests(String statusFilter) {
        if (statusFilter != null && !statusFilter.isBlank()) {
            VacationStatus status = parseVacationStatusFilter(statusFilter);
            return vacationRequestRepository.findByStatus(status).stream().map(this::toResponse).toList();
        }
        return vacationRequestRepository.findAllWithDetails().stream().map(this::toResponse).toList();
    }

    @Transactional
    public VacationRequestResponse approve(LoginResponse loginUser, Long requestId) {
        requireAdmin(loginUser);
        VacationRequest v        = findRequest(requestId);
        Employee        approver = findEmployee(loginUser.getId());
        ensureEnoughLeave(v.getEmployee().getEmployeeId(), v.getVacationType());

        VacationStatus oldStatus = v.getStatus();

        // 遡及 + 証明必要 + 未添付 → APPROVED_PENDING_PROOF
        boolean needsProof = v.isRetroactive()
                && v.getVacationType().isProofRequired()
                && v.getAttachmentPath() == null;

        if (needsProof) {
            v.applyApprovalPendingProof(approver, LocalDate.now().plusDays(PROOF_DUE_DAYS), MSG_PENDING_APPROVE);
            writeAuditLog(v, loginUser.getId(), approver.getEmployeeName(),
                    "APPROVED_PENDING_PROOF", oldStatus.name(), VacationStatus.APPROVED_PENDING_PROOF.name(),
                    true, false, "証明書の提出期限: " + v.getProofDueDate());
        } else {
            v.applyApproval(approver, MSG_PENDING_APPROVE);
            writeAuditLog(v, loginUser.getId(), approver.getEmployeeName(),
                    "APPROVED", oldStatus.name(), VacationStatus.APPROVED.name(),
                    v.isRetroactive(), false, null);
        }
        return toResponse(vacationRequestRepository.save(v));
    }

    @Transactional
    public VacationRequestResponse reject(LoginResponse loginUser, Long requestId, VacationRejectRequest req) {
        requireAdmin(loginUser);
        VacationRequest v = findRequest(requestId);
        String storedReason = normalizeOptionalBounded(
                req.getRejectReason() != null ? req.getRejectReason() : "",
                REASON_MAX_LEN, "却下理由は500文字以内で入力してください。");
        Employee approver = findEmployee(loginUser.getId());
        VacationStatus oldStatus = v.getStatus();
        v.applyRejection(approver, storedReason, MSG_PENDING_REJECT);
        writeAuditLog(v, loginUser.getId(), approver.getEmployeeName(),
                "REJECTED", oldStatus.name(), VacationStatus.REJECTED.name(),
                v.isRetroactive(), false, storedReason);
        return toResponse(vacationRequestRepository.save(v));
    }

    /** 証明書の確認 → 最終承認（APPROVED_PENDING_PROOF → APPROVED） */
    @Transactional
    public VacationRequestResponse verifyProof(LoginResponse loginUser, Long requestId) {
        requireAdmin(loginUser);
        VacationRequest v        = findRequest(requestId);
        Employee        verifier = findEmployee(loginUser.getId());
        v.applyProofVerification(verifier);
        writeAuditLog(v, loginUser.getId(), verifier.getEmployeeName(),
                "PROOF_VERIFIED", VacationStatus.APPROVED_PENDING_PROOF.name(), VacationStatus.APPROVED.name(),
                true, false, null);
        return toResponse(vacationRequestRepository.save(v));
    }

    /** 管理者代理申請（日付制限なし・即時承認） */
    @Transactional
    public Object adminProxySubmit(LoginResponse loginUser, VacationProxySubmitRequest req) {
        requireAdmin(loginUser);
        VacationType type        = parseVacationType(req.getVacationType());
        Employee     target      = findEmployee(req.getEmployeeId());
        Employee     admin       = findEmployee(loginUser.getId());
        String       reason      = normalizeOptionalBounded(req.getReason(),       REASON_MAX_LEN, "申請理由は500文字以内で入力してください。");
        String       retroReason = normalizeOptionalBounded(req.getRetroReason(),  REASON_MAX_LEN, "遡及事由は500文字以内で入力してください。");

        LocalDate start = req.getVacationStartDate() != null ? req.getVacationStartDate() : req.getVacationDate();
        LocalDate end   = req.getVacationEndDate()   != null ? req.getVacationEndDate()   : start;
        if (start == null) throw new IllegalArgumentException("休暇日を指定してください。");
        if (end.isBefore(start)) throw new IllegalArgumentException("終了日は開始日以降の日付を指定してください。");

        boolean retro = isRetroDate(start);

        List<VacationRequest> toSave = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            assertNoDuplicateActiveRequest(target.getEmployeeId(), d);
            VacationRequest vr = buildRequest(target, type, d, reason, null, null, retro, retroReason, admin);
            vr.setStatus(VacationStatus.APPROVED);
            vr.setApprovedBy(admin);
            vr.setApprovedAt(LocalDateTime.now());
            toSave.add(vr);
        }
        List<VacationRequest> saved = vacationRequestRepository.saveAll(toSave);
        if (!saved.isEmpty()) {
            writeAuditLog(saved.get(0), loginUser.getId(), admin.getEmployeeName(),
                    "PROXY_SUBMITTED", null, VacationStatus.APPROVED.name(), retro, true, retroReason);
        }
        return saved.stream().map(this::toResponse).toList();
    }

    /** 証明書一覧（APPROVED_PENDING_PROOF の申請）- 管理者向け */
    @Transactional(readOnly = true)
    public List<VacationRequestResponse> getPendingProofRequests(LoginResponse loginUser) {
        requireAdmin(loginUser);
        return vacationRequestRepository.findByStatus(VacationStatus.APPROVED_PENDING_PROOF)
                .stream().map(this::toResponse).toList();
    }

    // ── 内部ヘルパー ────────────────────────────────────────────

    private VacationRequest buildRequest(Employee employee, VacationType type, LocalDate date,
                                         String reason, String attachPath, String attachName,
                                         boolean retro, String retroReason, Employee proxySubmitter) {
        return VacationRequest.builder()
                .employee(employee)
                .vacationType(type)
                .vacationDate(date)
                .reason(reason)
                .status(VacationStatus.PENDING)
                .attachmentPath(attachPath)
                .attachmentName(attachName)
                .retroactive(retro)
                .retroReason(retro ? retroReason : null)
                .proxySubmitter(proxySubmitter)
                .build();
    }

    private static boolean isRetroDate(LocalDate date) {
        return date != null && date.isBefore(LocalDate.now());
    }

    private void validateRetroConditions(LocalDate date, VacationType type, String retroReason, boolean isAdmin) {
        if (date == null) throw new IllegalArgumentException("休暇日を入力してください。");
        if (!isRetroDate(date)) return;
        if (isAdmin) return;

        if (!type.isRetroAllowed()) {
            throw new IllegalArgumentException(
                    "「" + type.name() + "」は遡及申請できません。管理者に代理申請を依頼してください。");
        }
        long daysBack = ChronoUnit.DAYS.between(date, LocalDate.now());
        if (daysBack > type.getRetroMaxDays()) {
            throw new IllegalArgumentException(
                    "遡及申請の期限（最大" + type.getRetroMaxDays() + "日前）を超えています。（現在: " + daysBack + "日前）");
        }
        if (retroReason == null || retroReason.isBlank()) {
            throw new IllegalArgumentException("遡及申請には申請事由の入力が必要です。");
        }
    }

    private VacationType parseVacationType(String raw) {
        if (raw == null) throw new IllegalArgumentException(MSG_VACATION_TYPE);
        try {
            return VacationType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(MSG_VACATION_TYPE);
        }
    }

    private VacationStatus parseVacationStatusFilter(String raw) {
        try {
            return VacationStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(MSG_STATUS_FILTER);
        }
    }

    private void assertNoDuplicateActiveRequest(Long employeeId, LocalDate date) {
        boolean dup = vacationRequestRepository
                .existsByEmployeeEmployeeIdAndVacationDateAndStatusIn(
                        employeeId, date,
                        List.of(VacationStatus.PENDING, VacationStatus.APPROVED, VacationStatus.APPROVED_PENDING_PROOF));
        if (dup) throw new IllegalArgumentException("指定日にすでに申請中または承認済の休暇申請があります。");
    }

    private String normalizeOptionalBounded(String raw, int maxLen, String tooLongMessage) {
        String s = raw != null ? raw.trim() : "";
        if (s.length() > maxLen) throw new IllegalArgumentException(tooLongMessage);
        return s.isEmpty() ? null : s;
    }

    private void requireAdmin(LoginResponse user) {
        if (!"ADMIN".equals(user.getRole())) throw new IllegalArgumentException("管理者のみ実行できます。");
    }

    private void ensureEnoughLeave(Long employeeId, VacationType type) {
        if (!isAnnualLeaveType(type)) return;
        boolean adminAccount = employeeAccountRepository.findById(employeeId)
                .map(acc -> acc.getRole() == Role.ADMIN).orElse(false);
        if (adminAccount) return;
        BigDecimal need = switch (type) {
            case FULL    -> new BigDecimal("1.0");
            case HALF_AM, HALF_PM -> new BigDecimal("0.5");
            default      -> BigDecimal.ZERO;
        };
        LeaveBalanceResponse bal = leaveBalanceService.forEmployee(employeeId, LocalDate.now());
        if (!bal.isGranted()) throw new IllegalArgumentException("入社から6ヶ月経過後に年休が付与されます。現在は申請できません。");
        if (bal.getRemainingDays() == null || bal.getRemainingDays().compareTo(need) < 0)
            throw new IllegalArgumentException("年休残数が不足しています。（残り: " + bal.getRemainingDays() + "）");
    }

    private static boolean isAnnualLeaveType(VacationType type) {
        return type == VacationType.FULL || type == VacationType.HALF_AM || type == VacationType.HALF_PM;
    }

    private static int maxRangeDays(VacationType type) {
        return switch (type) {
            case CONDOLENCE_OWN_MARRIAGE, CONDOLENCE_CHILD_MARRIAGE,
                 CONDOLENCE_SPOUSE_BIRTH, CONDOLENCE_FUNERAL_1ST,
                 CONDOLENCE_FUNERAL_2ND  -> MAX_RANGE_CONDOLENCE;
            case MATERNITY_PRE, MATERNITY_POST, CHILDCARE_LEAVE -> MAX_RANGE_MATERNITY;
            default -> MAX_RANGE_DAYS;
        };
    }

    private VacationRequest findRequest(Long requestId) {
        return vacationRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("休暇申請が見つかりません。"));
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));
    }

    private VacationRequestResponse toResponse(VacationRequest v) {
        return VacationRequestResponse.builder()
                .requestId(v.getRequestId())
                .employeeId(v.getEmployee().getEmployeeId())
                .employeeName(v.getEmployee().getEmployeeName())
                .vacationType(v.getVacationType().name())
                .vacationDate(v.getVacationDate())
                .reason(v.getReason())
                .status(v.getStatus().name())
                .approvedById(v.getApprovedBy() != null ? v.getApprovedBy().getEmployeeId() : null)
                .approvedByName(v.getApprovedBy() != null ? v.getApprovedBy().getEmployeeName() : null)
                .approvedAt(v.getApprovedAt())
                .rejectReason(v.getRejectReason())
                .createdAt(v.getCreatedAt())
                .hasAttachment(v.getAttachmentPath() != null)
                .attachmentName(v.getAttachmentName())
                .retroactive(v.isRetroactive())
                .retroReason(v.getRetroReason())
                .proofDueDate(v.getProofDueDate())
                .proxy(v.getProxySubmitter() != null)
                .proxySubmitterName(v.getProxySubmitter() != null ? v.getProxySubmitter().getEmployeeName() : null)
                .build();
    }

    public String[] storeAttachment(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("ファイルが空です。");
        if (file.getSize() > MAX_ATTACHMENT_SIZE) throw new IllegalArgumentException("添付ファイルは10MB以下にしてください。");
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_ATTACHMENT_TYPES.contains(contentType))
            throw new IllegalArgumentException("添付ファイルは PDF / JPEG / PNG / GIF / WebP のみ対応しています。");
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment";
        int dot = originalName.lastIndexOf('.');
        String ext = dot >= 0 ? originalName.substring(dot) : "";
        String storedName = UUID.randomUUID() + ext;
        try {
            Path dir = Paths.get(vacationUploadDir);
            Files.createDirectories(dir);
            Files.copy(file.getInputStream(), dir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
            return new String[]{storedName, originalName};
        } catch (IOException e) {
            throw new IllegalStateException("ファイルの保存に失敗しました。", e);
        }
    }

    public Path resolveAttachmentPath(Long requestId, Long requesterId, boolean isAdmin) {
        VacationRequest v = findRequest(requestId);
        if (!isAdmin && !v.getEmployee().getEmployeeId().equals(requesterId))
            throw new IllegalArgumentException("アクセス権限がありません。");
        if (v.getAttachmentPath() == null) throw new IllegalArgumentException("添付ファイルが存在しません。");
        return Paths.get(vacationUploadDir).resolve(v.getAttachmentPath());
    }

    private void writeAuditLog(VacationRequest v, Long actorId, String actorName,
                                String action, String oldStatus, String newStatus,
                                boolean retro, boolean proxy, String detail) {
        auditLogRepository.save(VacationAuditLog.builder()
                .vacationRequestId(v.getRequestId())
                .actorId(actorId)
                .actorName(actorName)
                .applicantId(v.getEmployee().getEmployeeId())
                .applicantName(v.getEmployee().getEmployeeName())
                .action(action)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .retroactive(retro)
                .proxy(proxy)
                .detail(detail)
                .build());
    }
}
