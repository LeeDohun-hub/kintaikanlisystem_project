package com.kintai.repository;

import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface VacationRequestRepository extends JpaRepository<VacationRequest, Long> {

    /** 社員自身の申請一覧（新しい日付順） */
    @Query("SELECT v FROM VacationRequest v JOIN FETCH v.employee LEFT JOIN FETCH v.approvedBy " +
           "WHERE v.employee.employeeId = :employeeId ORDER BY v.vacationDate DESC, v.createdAt DESC")
    List<VacationRequest> findByEmployeeId(@Param("employeeId") Long employeeId);

    /** 管理者向け全申請（申請日時降順） */
    @Query("SELECT v FROM VacationRequest v JOIN FETCH v.employee LEFT JOIN FETCH v.approvedBy " +
           "ORDER BY v.createdAt DESC")
    List<VacationRequest> findAllWithDetails();

    /** 管理者向け: ステータス絞り込み */
    @Query("SELECT v FROM VacationRequest v JOIN FETCH v.employee LEFT JOIN FETCH v.approvedBy " +
           "WHERE v.status = :status ORDER BY v.createdAt DESC")
    List<VacationRequest> findByStatus(@Param("status") VacationStatus status);

    /** 同一社員・同一日に PENDING または APPROVED の申請が存在するか */
    boolean existsByEmployeeEmployeeIdAndVacationDateAndStatusIn(
            Long employeeId, LocalDate vacationDate, List<VacationStatus> statuses);

    /**
     * 年休消化数（FULL=1, HALF_*=0.5）を合計。
     * status は PENDING/APPROVED を想定し、付与日以降の申請を対象とする。
     */
    @Query("""
            SELECT COALESCE(SUM(
              CASE
                WHEN v.vacationType = com.kintai.entity.VacationType.FULL THEN 1.0
                WHEN v.vacationType = com.kintai.entity.VacationType.HALF_AM THEN 0.5
                WHEN v.vacationType = com.kintai.entity.VacationType.HALF_PM THEN 0.5
                ELSE 0.0
              END
            ), 0.0)
            FROM VacationRequest v
            WHERE v.employee.employeeId = :employeeId
              AND v.vacationDate >= :fromDate
              AND v.status IN :statuses
            """)
    BigDecimal sumUsedDays(
            @Param("employeeId") Long employeeId,
            @Param("fromDate") LocalDate fromDate,
            @Param("statuses") List<VacationStatus> statuses
    );
}
