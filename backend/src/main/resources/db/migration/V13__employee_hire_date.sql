-- 入社日（年休付与の起算日）
-- 既存データは created_at の日付で埋める。
SET NAMES utf8mb4;

ALTER TABLE employee
  ADD COLUMN hire_date DATE NULL COMMENT '入社日（年休付与の起算日）' AFTER active_flag;

UPDATE employee
  SET hire_date = DATE(created_at)
  WHERE hire_date IS NULL;

ALTER TABLE employee
  MODIFY COLUMN hire_date DATE NOT NULL COMMENT '入社日（年休付与の起算日）';

