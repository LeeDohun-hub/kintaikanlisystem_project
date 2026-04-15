-- ログインID（社員コードとは別。ログイン画面ではこちらを入力）
SET NAMES utf8mb4;

ALTER TABLE employee_account
  ADD COLUMN login_id VARCHAR(50) NULL COMMENT 'ログインID（一意）' AFTER employee_id;

UPDATE employee_account ea
INNER JOIN employee e ON e.employee_id = ea.employee_id
SET ea.login_id = e.employee_code
WHERE ea.login_id IS NULL;

ALTER TABLE employee_account
  MODIFY login_id VARCHAR(50) NOT NULL;

CREATE UNIQUE INDEX uk_employee_account_login_id ON employee_account (login_id);
