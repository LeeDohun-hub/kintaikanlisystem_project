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
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VacationService {

    private final VacationRequestRepository vacationRequestRepository;
    private final EmployeeRepository employeeRepository;

    // ── 社員向け ────────────────────────────────────────────────

    @Transactional
    public VacationRequestResponse submit(LoginResponse loginUser, VacationSubmitRequest req) {
        if (req.getVacationDate() == null) {
            throw new IllegalArgumentException("休暇日を入力してください。");
        }
        if (req.getVacationDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("過去の日付には申請できません。");
        }

        VacationType type;
        try {
            type = VacationType.valueOf(req.getVacationType().trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("休暇区分が正しくありません。（FULL / HALF_AM / HALF_PM）");
        }

        boolean duplicate = vacationRequestRepository
                .existsByEmployeeEmployeeIdAndVacationDateAndStatusIn(
                        loginUser.getId(),
                        req.getVacationDate(),
                        List.of(VacationStatus.PENDING, VacationStatus.APPROVED));
        if (duplicate) {
            throw new IllegalArgumentException("指定日にすでに申請中または承認済の休暇申請があります。");
        }

        String reason = req.getReason() != null ? req.getReason().trim() : null;
        if (reason != null && reason.length() > 500) {
            throw new IllegalArgumentException("申請理由は500文字以内で入力してください。");
        }

        Employee employee = findEmployee(loginUser.getId());
        VacationRequest saved = vacationRequestRepository.save(
                VacationRequest.builder()
                        .employee(employee)
                        .vacationType(type)
                        .vacationDate(req.getVacationDate())
                        .reason(reason)
                        .status(VacationStatus.PENDING)
                        .build()
        );
        return toResponse(saved);
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
        if (!v.getEmployee().getEmployeeId().equals(loginUser.getId())) {
            throw new IllegalArgumentException("他の社員の申請はキャンセルできません。");
        }
        if (v.getStatus() != VacationStatus.PENDING) {
            throw new IllegalArgumentException("申請中の休暇申請のみキャンセルできます。");
        }
        vacationRequestRepository.delete(v);
    }

    // ── 管理者向け ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<VacationRequestResponse> getAllRequests(String statusFilter) {
        if (statusFilter != null && !statusFilter.isBlank()) {
            VacationStatus status;
            try {
                status = VacationStatus.valueOf(statusFilter.trim().toUpperCase());
            } catch (Exception e) {
                throw new IllegalArgumentException("statusの値が不正です。");
            }
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
        if (v.getStatus() != VacationStatus.PENDING) {
            throw new IllegalArgumentException("申請中の休暇申請のみ承認できます。");
        }
        Employee approver = findEmployee(loginUser.getId());
        v.setStatus(VacationStatus.APPROVED);
        v.setApprovedBy(approver);
        v.setApprovedAt(LocalDateTime.now());
        return toResponse(vacationRequestRepository.save(v));
    }

    @Transactional
    public VacationRequestResponse reject(LoginResponse loginUser, Long requestId, VacationRejectRequest req) {
        requireAdmin(loginUser);
        VacationRequest v = findRequest(requestId);
        if (v.getStatus() != VacationStatus.PENDING) {
            throw new IllegalArgumentException("申請中の休暇申請のみ却下できます。");
        }
        String rejectReason = req.getRejectReason() != null ? req.getRejectReason().trim() : "";
        if (rejectReason.length() > 500) {
            throw new IllegalArgumentException("却下理由は500文字以内で入力してください。");
        }
        Employee approver = findEmployee(loginUser.getId());
        v.setStatus(VacationStatus.REJECTED);
        v.setApprovedBy(approver);
        v.setApprovedAt(LocalDateTime.now());
        v.setRejectReason(rejectReason.isEmpty() ? null : rejectReason);
        return toResponse(vacationRequestRepository.save(v));
    }

    // ── 内部 ────────────────────────────────────────────────────

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
