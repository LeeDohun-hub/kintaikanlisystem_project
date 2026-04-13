-- 既存 kintai_db に work_time のみがあり remarks 列がない場合に 1 回実行
-- （アプリ起動時 init-schema.sql でも自動追加を試行）
USE kintai_db;
ALTER TABLE work_time ADD COLUMN remarks VARCHAR(500) NULL COMMENT '備考';
