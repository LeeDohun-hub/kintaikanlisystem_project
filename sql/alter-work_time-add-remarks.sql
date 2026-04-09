-- 기존 kintai_db 에 work_time 만 있고 remarks 컬럼이 없을 때 1회 실행
-- (애플리케이션 기동 시 init-schema.sql 에서도 자동 추가 시도함)
USE kintai_db;
ALTER TABLE work_time ADD COLUMN remarks VARCHAR(500) NULL COMMENT '備考';
