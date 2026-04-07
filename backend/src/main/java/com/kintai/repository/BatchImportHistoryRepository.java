package com.kintai.repository;

import com.kintai.entity.BatchImportHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BatchImportHistoryRepository extends JpaRepository<BatchImportHistory, Long> {
}
