-- 未登録（ログインアカウントなし）従業員への招待メール送信用
SET NAMES utf8mb4;

ALTER TABLE employee
  ADD COLUMN invite_email VARCHAR(254) NULL COMMENT '招待メール送付先（任意）' AFTER department;
