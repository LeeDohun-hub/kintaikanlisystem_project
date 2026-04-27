-- 休暇申請の添付書類カラムを追加
-- 経弔休暇・産休育休・病欠の証明書類アップロード対応
ALTER TABLE vacation_request
  ADD COLUMN attachment_path VARCHAR(255) NULL COMMENT '添付ファイルの保存パス（サーバー内）',
  ADD COLUMN attachment_name VARCHAR(255) NULL COMMENT '添付ファイルの元のファイル名（表示用）';
