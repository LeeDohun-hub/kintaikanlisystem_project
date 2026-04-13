package com.kintai.repository;

import com.kintai.entity.WorkTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WorkTimeRepository extends JpaRepository<WorkTime, Long> {

    boolean existsByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);

    /** 同一社員・同一勤務日が複数ある場合は最も古い work_id の1件のみ使用（取込更新用）。 */
    Optional<WorkTime> findFirstByEmployeeIdAndWorkDateOrderByWorkIdAsc(Long employeeId, LocalDate workDate);

    boolean existsByEmployeeIdAndWorkDateAndWorkIdNot(Long employeeId, LocalDate workDate, Long workId);

    @Query("""
            SELECT COALESCE(SUM(w.workMinutes), 0) FROM WorkTime w
            WHERE w.employeeId = :employeeId
            AND w.workDate >= :fromDate AND w.workDate <= :toDate
            """)
    long sumWorkMinutes(
            @Param("employeeId") Long employeeId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT w FROM WorkTime w
            WHERE w.employeeId = :employeeId
            AND w.workDate >= :fromDate AND w.workDate <= :toDate
            ORDER BY w.workDate ASC, w.startTime ASC, w.workId ASC
            """)
    List<WorkTime> findForEmployeeMonth(
            @Param("employeeId") Long employeeId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT w FROM WorkTime w
            WHERE w.workDate >= :fromDate AND w.workDate <= :toDate
            ORDER BY w.workDate ASC, w.employeeId ASC, w.startTime ASC, w.workId ASC
            """)
    List<WorkTime> findForMonth(@Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);
}
