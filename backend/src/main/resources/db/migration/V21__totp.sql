-- 2段階認証（TOTP）用カラムを employee_account に追加
ALTER TABLE employee_account
  ADD COLUMN totp_secret  VARCHAR(100) NULL    COMMENT 'TOTP秘密鍵（Base32エンコード）',
  ADD COLUMN totp_enabled TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '2FA有効フラグ (0=無効, 1=有効)';
