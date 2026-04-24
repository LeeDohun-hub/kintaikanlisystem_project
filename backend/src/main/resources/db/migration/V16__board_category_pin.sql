-- 掲示板: カテゴリ（複数板）と管理者ピン
ALTER TABLE board_post
  ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'FREE' COMMENT 'NOTICE|FREE|QNA|EVENTS' AFTER post_id,
  ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '管理者ピン' AFTER category;

CREATE INDEX idx_board_post_category_pin_created ON board_post (category, pinned, created_at);
