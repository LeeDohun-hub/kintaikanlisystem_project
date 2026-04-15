-- ログイン試行の監査（ログインチェック）
SET NAMES utf8mb4;

CREATE TABLE login_attempt (
  attempt_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempted_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  login_id       VARCHAR(100)    NOT NULL COMMENT '入力ログインID（トリム後）',
  success_flag   TINYINT         NOT NULL COMMENT '1:成功 0:失敗',
  failure_code   VARCHAR(40)     NULL COMMENT '失敗時の理由コード',
  employee_id    BIGINT UNSIGNED NULL COMMENT '成功時またはアカウント同定後',
  ip_address     VARCHAR(45)     NULL,
  user_agent     VARCHAR(500)    NULL,
  KEY idx_login_attempt_time (attempted_at),
  KEY idx_login_attempt_login (login_id(32)),
  CONSTRAINT fk_login_attempt_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
