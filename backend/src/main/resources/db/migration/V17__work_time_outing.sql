-- 外出（開始・復帰）— 勤務時間内、実働から控除
ALTER TABLE work_time
  ADD COLUMN outing_start_time TIME(3) NULL COMMENT '外出開始' AFTER end_time,
  ADD COLUMN outing_end_time TIME(3) NULL COMMENT '外出復帰' AFTER outing_start_time;
