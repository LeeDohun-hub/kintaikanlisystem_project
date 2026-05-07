-- 遡及申請フィールドの追加
ALTER TABLE vacation_request
  ADD COLUMN is_retroactive    TINYINT(1)   NOT NULL DEFAULT 0              AFTER attachment_name,
  ADD COLUMN retro_reason      VARCHAR(500) NULL                             AFTER is_retroactive,
  ADD COLUMN proof_due_date    DATE         NULL                             AFTER retro_reason,
  ADD COLUMN proxy_submitter_id BIGINT UNSIGNED NULL                         AFTER proof_due_date,
  ADD CONSTRAINT fk_vac_proxy FOREIGN KEY (proxy_submitter_id)
      REFERENCES employee (employee_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- status カラムを拡張（APPROVED_PENDING_PROOF を追加）
ALTER TABLE vacation_request
  MODIFY COLUMN status VARCHAR(24) NOT NULL DEFAULT 'PENDING';

-- 監査ログテーブル
CREATE TABLE vacation_audit_log (
  log_id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vacation_request_id BIGINT UNSIGNED NOT NULL,
  actor_id           BIGINT UNSIGNED NOT NULL,
  actor_name         VARCHAR(50)     NOT NULL,
  applicant_id       BIGINT UNSIGNED NOT NULL,
  applicant_name     VARCHAR(50)     NOT NULL,
  action             VARCHAR(32)     NOT NULL,
  old_status         VARCHAR(24)     NULL,
  new_status         VARCHAR(24)     NULL,
  is_retroactive     TINYINT(1)      NOT NULL DEFAULT 0,
  is_proxy           TINYINT(1)      NOT NULL DEFAULT 0,
  detail             VARCHAR(500)    NULL,
  created_at         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_val_rid (vacation_request_id),
  KEY idx_val_actor (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
