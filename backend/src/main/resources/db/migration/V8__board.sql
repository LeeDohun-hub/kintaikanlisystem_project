-- 掲示板
CREATE TABLE board_post (
  post_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200)    NOT NULL,
  content     TEXT            NOT NULL,
  author_id   BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_board_post_employee FOREIGN KEY (author_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_board_post_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE board_comment (
  comment_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id     BIGINT UNSIGNED NOT NULL,
  content     TEXT            NOT NULL,
  author_id   BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_board_comment_post     FOREIGN KEY (post_id)   REFERENCES board_post (post_id)  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_board_comment_employee FOREIGN KEY (author_id) REFERENCES employee   (employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_board_comment_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
