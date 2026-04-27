package com.kintai.repository;

import com.kintai.entity.WorkTimeOuting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.List;

public interface WorkTimeOutingRepository extends JpaRepository<WorkTimeOuting, Long> {

    boolean existsByWorkIdAndStartTimeAndEndTime(Long workId, LocalTime startTime, LocalTime endTime);

    List<WorkTimeOuting> findByWorkIdOrderByStartTimeAscEndTimeAsc(Long workId);

    void deleteByWorkId(Long workId);

    @Query(
            value = """
                    SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)), 0)
                    FROM work_time_outing
                    WHERE work_id = :workId
                    """,
            nativeQuery = true
    )
    long sumOutingMinutesByWorkId(@Param("workId") Long workId);
}

