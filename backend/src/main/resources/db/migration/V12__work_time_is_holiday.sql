-- 休日勤務フラグ（管理者向け指標: 休日労働時間の算出に使用）
ALTER TABLE work_time
  ADD COLUMN is_holiday TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1:当該勤務日は休日扱い' AFTER work_date;
