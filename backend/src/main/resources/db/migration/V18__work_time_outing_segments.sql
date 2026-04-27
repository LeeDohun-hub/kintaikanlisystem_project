-- 外出（複数回）— 勤務時間内の外出区間を複数記録する
CREATE TABLE work_time_outing (
  outing_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  work_id     BIGINT UNSIGNED NOT NULL,
  start_time  TIME(3)         NOT NULL COMMENT '外出開始',
  end_time    TIME(3)         NOT NULL COMMENT '外出復帰',
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE KEY uk_work_time_outing_segment (work_id, start_time, end_time),
  KEY idx_work_time_outing_work_id (work_id),
  CONSTRAINT fk_work_time_outing_work_id
    FOREIGN KEY (work_id) REFERENCES work_time (work_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

