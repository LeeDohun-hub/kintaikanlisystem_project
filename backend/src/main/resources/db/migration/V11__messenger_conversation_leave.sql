-- 会話「退出」: 履歴は残し、相手にシステム通知メッセージを残す
ALTER TABLE message
  ADD COLUMN system_type VARCHAR(32) NULL COMMENT 'PARTNER_LEFT 等' AFTER content;

CREATE TABLE conversation_leave (
  leaver_id  BIGINT UNSIGNED NOT NULL,
  partner_id BIGINT UNSIGNED NOT NULL,
  left_at    DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (leaver_id, partner_id),
  CONSTRAINT fk_conv_leave_leaver   FOREIGN KEY (leaver_id)   REFERENCES employee (employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_conv_leave_partner FOREIGN KEY (partner_id) REFERENCES employee (employee_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
