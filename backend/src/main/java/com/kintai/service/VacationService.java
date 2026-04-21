package com.kintai.service;

import com.kintai.dto.LoginResponse;
import com.kintai.dto.VacationRejectRequest;
import com.kintai.dto.VacationRequestResponse;
import com.kintai.dto.VacationSubmitRequest;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.entity.VacationType;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VacationService {

    private static final int REASON_MAX_LEN = 500;
    private static final int MAX_RANGE_DAYS = 31;
    private static final String MSG_VACATION_TYPE = "休暇区分が正しくありません。（FULL / HALF_AM / HALF_PM）";
    private static final String MSG_STATUS_FILTER = "statusの値が不正です。";
    private static final String MSG_PENDING_APPROVE = "申請中の休暇申請のみ承認できます。";
    private static final String MSG_PENDING_REJECT = "申請中の休暇申請のみ却下できます。";

    private final VacationRequestRepository vacationRequestRepository;
    private final EmployeeRepository employeeRepository;

    // ── 社員向け ────────────────────────────────────────────────

    @Transactional
    public Object submit(LoginResponse loginUser, VacationSubmitRequest req) {
        VacationType type = parseVacationType(req.getVacationType());
        String reason = normalizeOptionalBounded(req.getReason(), REASON_MAX_LEN, "申請理由は500文字以内で入力してください。");

        Employee employee = findEmployee(loginUser.getId());

        LocalDate start = req.getVacationStartDate();
        LocalDate end = req.getVacationEndDate();
        if (start == null && end == null) {
            // 旧仕様（単日）
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
                            .build()
            );
            return toResponse(saved);
        }

        // 新仕様（区間）: 両方必須
        if (start == null || end == null) {
            throw new IllegalArgumentException("休暇の開始日と終了日を入力してください。");
        }
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("終了日は開始日以降の日付を指定してください。");
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
        if (days > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("一度に申請できる日数は最大" + MAX_RANGE_DAYS + "日です。");
        }

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
                .build();
    }
}
