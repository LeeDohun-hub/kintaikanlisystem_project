-- グループチャットルーム
CREATE TABLE chat_room (
  room_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_name  VARCHAR(100)    NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_chat_room_creator FOREIGN KEY (created_by) REFERENCES employee (employee_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- グループメンバー
CREATE TABLE chat_room_member (
  room_id      BIGINT UNSIGNED NOT NULL,
  employee_id  BIGINT UNSIGNED NOT NULL,
  joined_at    DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  left_at      DATETIME(3)    NULL,
  last_read_at DATETIME(3)    NULL,
  PRIMARY KEY (room_id, employee_id),
  CONSTRAINT fk_crm_room FOREIGN KEY (room_id)     REFERENCES chat_room (room_id)  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_crm_emp  FOREIGN KEY (employee_id) REFERENCES employee  (employee_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- グループメッセージ
CREATE TABLE group_message (
  message_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_id     BIGINT UNSIGNED NOT NULL,
  sender_id   BIGINT UNSIGNED NOT NULL,
  content     TEXT           NOT NULL,
  system_type VARCHAR(32)    NULL,
  created_at  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_gm_room   FOREIGN KEY (room_id)   REFERENCES chat_room (room_id)  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_gm_sender FOREIGN KEY (sender_id) REFERENCES employee  (employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_gm_room_time (room_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
