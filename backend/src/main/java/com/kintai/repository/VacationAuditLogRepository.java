package com.kintai.repository;

import com.kintai.entity.VacationAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VacationAuditLogRepository extends JpaRepository<VacationAuditLog, Long> {
}
