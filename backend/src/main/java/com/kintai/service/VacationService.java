package com.kintai.service;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.VacationRejectRequest;
import com.kintai.dto.VacationRequestResponse;
import com.kintai.dto.VacationSubmitRequest;
import com.kintai.dto.LeaveBalanceResponse;
import com.kintai.entity.Employee;
import com.kintai.entity.Role;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.entity.VacationType;
import com.kintai.repository.EmployeeAccountRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VacationService {

    private static final int REASON_MAX_LEN = 500;
    private static final int MAX_RANGE_DAYS = 31;      // 年休・病欠
    private static final int MAX_RANGE_CONDOLENCE = 7; // 経弔休暇
    private static final int MAX_RANGE_MATERNITY = 730; // 産休育休（最大2年）
    private static final String MSG_VACATION_TYPE =
            "休暇区分が正しくありません。（FULL / HALF_AM / HALF_PM / " +
            "CONDOLENCE_OWN_MARRIAGE / CONDOLENCE_CHILD_MARRIAGE / CONDOLENCE_SPOUSE_BIRTH / " +
            "CONDOLENCE_FUNERAL_1ST / CONDOLENCE_FUNERAL_2ND / " +
            "MATERNITY_PRE / MATERNITY_POST / CHILDCARE_LEAVE / SICK_LEAVE）";
    private static final String MSG_STATUS_FILTER = "statusの値が不正です。";
    private static final String MSG_PENDING_APPROVE = "申請中の休暇申請のみ承認できます。";
    private static final String MSG_PENDING_REJECT = "申請中の休暇申請のみ却下できます。";

    private static final long MAX_ATTACHMENT_SIZE = 10L * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_ATTACHMENT_TYPES =
            Set.of("application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp");

    private final VacationRequestRepository vacationRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeAccountRepository employeeAccountRepository;
    private final LeaveBalanceService leaveBalanceService;

    @Value("${app.vacation.upload-dir:./uploads/vacation}")
    private String vacationUploadDir;

    // ── 社員向け ────────────────────────────────────────────────

    @Transactional
    public Object submit(LoginResponse loginUser, VacationSubmitRequest req, MultipartFile file) {
        VacationType type = parseVacationType(req.getVacationType());
        String reason = normalizeOptionalBounded(req.getReason(), REASON_MAX_LEN, "申請理由は500文字以内で入力してください。");

        Employee employee = findEmployee(loginUser.getId());
        ensureEnoughLeave(loginUser.getId(), type);

        // 添付ファイルの保存（送られた場合のみ）
        String savedPath = null;
        String savedName = null;
        if (file != null && !file.isEmpty()) {
            var attachment = storeAttachment(file);
            savedPath = attachment[0];
            savedName = attachment[1];
        }

        LocalDate start = req.getVacationStartDate();
        LocalDate end = req.getVacationEndDate();
        if (start == null && end == null) {
            LocalDate single = req.getVacationDate();
            validateSubmitDates(single);
            assertNoDuplicateActiveRequest(loginUser.getId(), single);
            VacationRequest saved = vacationRequestRepository.save(
                    VacationRequest.builder()
                            .employee(employee)
                            .vacationType(type)
                            .vacationDate(single)
                            .reason(reason)
                            .status(VacationStatus.PENDING)
                            .attachmentPath(savedPath)
                            .attachmentName(savedName)
                            .build()
            );
            return toResponse(saved);
        }

        if (start == null || end == null) {
            throw new IllegalArgumentException("休暇の開始日と終了日を入力してください。");
        }
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("終了日は開始日以降の日付を指定してください。");
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
        int maxDays = maxRangeDays(type);
        if (days > maxDays) {
            throw new IllegalArgumentException("一度に申請できる日数は最大" + maxDays + "日です。");
        }

        // 区間申請：全レコードに同じ添付パスを保存
        java.util.List<VacationRequest> toSave = new java.util.ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            validateSubmitDates(d);
            assertNoDuplicateActiveRequest(loginUser.getId(), d);
            toSave.add(VacationRequest.builder()
                    .employee(employee)
                    .vacationType(type)
                    .vacationDate(d)
                    .reason(reason)
                    .status(VacationStatus.PENDING)
                    .attachmentPath(savedPath)
                    .attachmentName(savedName)
                    .build());
        }
        return vacationRequestRepository.saveAll(toSave).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VacationRequestResponse> getMyRequests(Long employeeId) {
        return vacationRequestRepository.findByEmployeeId(employeeId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void cancel(LoginResponse loginUser, Long requestId) {
        VacationRequest v = findRequest(requestId);
        v.assertCancellableBy(loginUser.getId());
        vacationRequestRepository.delete(v);
    }

    // ── 管理者向け ──────────────────────────────────────────────

    @Transactional
    public void adminDelete(LoginResponse loginUser, Long requestId) {
        requireAdmin(loginUser);
        VacationRequest v = findRequest(requestId);
        vacationRequestRepository.delete(v);
    }

    @Transactional(readOnly = true)
    public List<VacationRequestResponse> getAllRequests(String statusFilter) {
        if (statusFilter != null && !statusFilter.isBlank()) {
            VacationStatus status = parseVacationStatusFilter(statusFilter);
            return vacationRequestRepository.findByStatus(status).stream()
                    .map(this::toResponse).toList();
        }
        return vacationRequestRepository.findAllWithDetails().stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public VacationRequestResponse approve(LoginResponse loginUser, Long requestId) {
        requireAdmin(loginUser);
        VacationRequest v = findRequest(requestId);
        Employee approver = findEmployee(loginUser.getId());

        // 承認直前にも残数チェック（同時申請対策）
        ensureEnoughLeave(v.getEmployee().getEmployeeId(), v.getVacationType());

        v.applyApproval(approver, MSG_PENDING_APPROVE);
        return toResponse(vacationRequestRepository.save(v));
    }

    @Transactional
    public VacationRequestResponse reject(LoginResponse loginUser, Long requestId, VacationRejectRequest req) {
        requireAdmin(loginUser);
        VacationRequest v = findRequest(requestId);
        String storedReason = normalizeOptionalBounded(
                req.getRejectReason() != null ? req.getRejectReason() : "",
                REASON_MAX_LEN,
                "却下理由は500文字以内で入力してください。");
        Employee approver = findEmployee(loginUser.getId());
        v.applyRejection(approver, storedReason, MSG_PENDING_REJECT);
        return toResponse(vacationRequestRepository.save(v));
    }

    // ── 内部 ────────────────────────────────────────────────────

    private void validateSubmitDates(LocalDate vacationDate) {
        if (vacationDate == null) {
            throw new IllegalArgumentException("休暇日を入力してください。");
        }
        if (vacationDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("過去の日付には申請できません。");
        }
    }

    private VacationType parseVacationType(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException(MSG_VACATION_TYPE);
        }
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

    private void assertNoDuplicateActiveRequest(Long employeeId, LocalDate vacationDate) {
        boolean duplicate = vacationRequestRepository
                .existsByEmployeeEmployeeIdAndVacationDateAndStatusIn(
                        employeeId,
                        vacationDate,
                        List.of(VacationStatus.PENDING, VacationStatus.APPROVED));
        if (duplicate) {
            throw new IllegalArgumentException("指定日にすでに申請中または承認済の休暇申請があります。");
        }
    }

    /**
     * 前後の空白を除去し、最大長を超えたら例外。入力 null は空文字として扱う。
     */
    private String normalizeOptionalBounded(String raw, int maxLen, String tooLongMessage) {
        String s = raw != null ? raw.trim() : "";
        if (s.length() > maxLen) {
            throw new IllegalArgumentException(tooLongMessage);
        }
        return s.isEmpty() ? null : s;
    }

    private void requireAdmin(LoginResponse user) {
        if (!"ADMIN".equals(user.getRole())) {
            throw new IllegalArgumentException("管理者のみ実行できます。");
        }
    }

    private void ensureEnoughLeave(Long employeeId, VacationType type) {
        // 経弔・産休育休・病欠は年休残数を消費しない
        if (!isAnnualLeaveType(type)) {
            return;
        }
        boolean adminAccount = employeeAccountRepository.findById(employeeId)
                .map(acc -> acc.getRole() == Role.ADMIN)
                .orElse(false);
        if (adminAccount) {
            return;
        }
        BigDecimal need = switch (type) {
            case FULL    -> new BigDecimal("1.0");
            case HALF_AM,
                 HALF_PM -> new BigDecimal("0.5");
            default      -> BigDecimal.ZERO;
        };
        LeaveBalanceResponse bal = leaveBalanceService.forEmployee(employeeId, LocalDate.now());
        if (!bal.isGranted()) {
            throw new IllegalArgumentException("入社から6ヶ月経過後に年休が付与されます。現在は申請できません。");
        }
        if (bal.getRemainingDays() == null || bal.getRemainingDays().compareTo(need) < 0) {
            throw new IllegalArgumentException("年休残数が不足しています。（残り: " + bal.getRemainingDays() + "）");
        }
    }

    private static boolean isAnnualLeaveType(VacationType type) {
        return type == VacationType.FULL
                || type == VacationType.HALF_AM
                || type == VacationType.HALF_PM;
    }

    private static int maxRangeDays(VacationType type) {
        return switch (type) {
            case CONDOLENCE_OWN_MARRIAGE,
                 CONDOLENCE_CHILD_MARRIAGE,
                 CONDOLENCE_SPOUSE_BIRTH,
                 CONDOLENCE_FUNERAL_1ST,
                 CONDOLENCE_FUNERAL_2ND  -> MAX_RANGE_CONDOLENCE;
            case MATERNITY_PRE,
                 MATERNITY_POST,
                 CHILDCARE_LEAVE         -> MAX_RANGE_MATERNITY;
            default                      -> MAX_RANGE_DAYS;
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
                .build();
    }

    /**
     * 添付ファイルを保存し、[保存パス, 元のファイル名] を返す。
     */
    public String[] storeAttachment(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("ファイルが空です。");
        }
        if (file.getSize() > MAX_ATTACHMENT_SIZE) {
            throw new IllegalArgumentException("添付ファイルは10MB以下にしてください。");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_ATTACHMENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("添付ファイルは PDF / JPEG / PNG / GIF / WebP のみ対応しています。");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment";
        String ext = "";
        int dot = originalName.lastIndexOf('.');
        if (dot >= 0) ext = originalName.substring(dot);
        String storedName = UUID.randomUUID() + ext;

        try {
            Path dir = Paths.get(vacationUploadDir);
            Files.createDirectories(dir);
            Path dest = dir.resolve(storedName);
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
            return new String[]{storedName, originalName};
        } catch (IOException e) {
            throw new IllegalStateException("ファイルの保存に失敗しました。", e);
        }
    }

    /** 添付ファイルの物理パスを取得する（ダウンロード用） */
    public Path resolveAttachmentPath(Long requestId, Long requesterId, boolean isAdmin) {
        VacationRequest v = findRequest(requestId);
        if (!isAdmin && !v.getEmployee().getEmployeeId().equals(requesterId)) {
            throw new IllegalArgumentException("アクセス権限がありません。");
        }
        if (v.getAttachmentPath() == null) {
            throw new IllegalArgumentException("添付ファイルが存在しません。");
        }
        return Paths.get(vacationUploadDir).resolve(v.getAttachmentPath());
    }
}
