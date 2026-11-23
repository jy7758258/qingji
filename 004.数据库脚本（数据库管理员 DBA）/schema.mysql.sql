-- =========================================================
-- 轻记 · MySQL Schema
-- 数据库：MySQL 8.0+（InnoDB / utf8mb4）
-- 版本：v1.0（对应产品 PRD v1.1.1）
--
-- 与 PostgreSQL 版本的区别：
--   1. MySQL 没有 schema，使用 identity_ / ledger_ 表名前缀区分逻辑域；
--   2. UUID 使用 CHAR(36)，数组字段使用 JSON；
--   3. 部分索引用生成列 + 唯一索引模拟；
--   4. updated_at 使用 ON UPDATE CURRENT_TIMESTAMP(3)；
--   5. 跨表校验使用存储过程 + BEFORE INSERT/UPDATE 触发器。
--
-- 设计边界：
--   identity_* 保存账号与登录态；
--   ledger_* 当前已由本地后端写入账本；远程云同步尚未开启。
--
-- 用法：
--   CREATE DATABASE qingji CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--   mysql -u qingji -p qingji < schema.mysql.sql
-- =========================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(32) NOT NULL PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  applied_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- identity：v1.1.1 认证域
-- =========================================================

CREATE TABLE IF NOT EXISTS identity_users (
  id              CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
  username        VARCHAR(20) NOT NULL,
  username_key    VARCHAR(20) GENERATED ALWAYS AS (LOWER(TRIM(username))) STORED,
  password_hash   VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'active',
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until    DATETIME(3) NULL,
  last_login_at   DATETIME(3) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_identity_users_username_key (username_key),
  CONSTRAINT chk_identity_users_username_length CHECK (CHAR_LENGTH(username) BETWEEN 2 AND 20),
  CONSTRAINT chk_identity_users_username_clean CHECK (
    username = TRIM(username) AND username NOT REGEXP '[[:space:][:cntrl:]]'
  ),
  CONSTRAINT chk_identity_users_password_hash CHECK (CHAR_LENGTH(password_hash) BETWEEN 20 AND 255),
  CONSTRAINT chk_identity_users_status CHECK (status IN ('active', 'disabled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS identity_recovery_codes (
  user_id    CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  code_hash  VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  used_at    DATETIME(3) NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_identity_recovery_user FOREIGN KEY (user_id)
    REFERENCES identity_users(id) ON DELETE CASCADE,
  CONSTRAINT chk_identity_recovery_hash CHECK (CHAR_LENGTH(code_hash) >= 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS identity_sessions (
  id              CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
  user_id         CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  token_hash      VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at      DATETIME(3) NOT NULL,
  revoked_at      DATETIME(3) NULL,
  last_seen_at    DATETIME(3) NULL,
  ip_hash         VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  user_agent_hash VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_identity_sessions_token_hash (token_hash),
  KEY idx_identity_sessions_user_active (user_id, revoked_at),
  KEY idx_identity_sessions_expires_at (expires_at),
  CONSTRAINT fk_identity_sessions_user FOREIGN KEY (user_id)
    REFERENCES identity_users(id) ON DELETE CASCADE,
  CONSTRAINT chk_identity_sessions_token_hash CHECK (CHAR_LENGTH(token_hash) >= 32),
  CONSTRAINT chk_identity_sessions_expiry CHECK (expires_at > created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS identity_auth_attempts (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username_key VARCHAR(20) NULL,
  ip_hash      VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  action       VARCHAR(16) NOT NULL,
  success      TINYINT(1) NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_identity_attempts_username_time (username_key, created_at),
  KEY idx_identity_attempts_ip_time (ip_hash, created_at),
  CONSTRAINT chk_identity_attempts_action CHECK (action IN ('register', 'login', 'recover')),
  CONSTRAINT chk_identity_attempts_success CHECK (success IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- ledger：当前本地 MySQL 账本
-- =========================================================

CREATE TABLE IF NOT EXISTS ledger_user_settings (
  user_id             CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  currency            CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'CNY',
  timezone            VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  last_type           VARCHAR(16) NOT NULL DEFAULT 'expense',
  privacy_mode        TINYINT(1) NOT NULL DEFAULT 0,
  backup_reminder     TINYINT(1) NOT NULL DEFAULT 1,
  onboarded           TINYINT(1) NOT NULL DEFAULT 0,
  recent_category_ids JSON NOT NULL DEFAULT (JSON_ARRAY()),
  schema_version      SMALLINT NOT NULL DEFAULT 1,
  sync_enabled        TINYINT(1) NOT NULL DEFAULT 0,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_ledger_settings_user FOREIGN KEY (user_id)
    REFERENCES identity_users(id) ON DELETE CASCADE,
  CONSTRAINT chk_ledger_settings_currency CHECK (currency = UPPER(currency)),
  CONSTRAINT chk_ledger_settings_last_type CHECK (last_type IN ('expense', 'income')),
  CONSTRAINT chk_ledger_settings_privacy CHECK (privacy_mode IN (0, 1)),
  CONSTRAINT chk_ledger_settings_backup CHECK (backup_reminder IN (0, 1)),
  CONSTRAINT chk_ledger_settings_onboarded CHECK (onboarded IN (0, 1)),
  CONSTRAINT chk_ledger_settings_sync CHECK (sync_enabled IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ledger_category_templates (
  template_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  parent_key   VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  name         VARCHAR(20) NOT NULL,
  type         VARCHAR(16) NOT NULL,
  icon         VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'box',
  color        CHAR(7) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sort         SMALLINT NOT NULL DEFAULT 0,
  is_system    TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (template_key),
  KEY idx_ledger_templates_parent (parent_key),
  CONSTRAINT fk_ledger_templates_parent FOREIGN KEY (parent_key)
    REFERENCES ledger_category_templates(template_key) ON DELETE CASCADE,
  CONSTRAINT chk_ledger_templates_type CHECK (type IN ('expense', 'income')),
  CONSTRAINT chk_ledger_templates_color CHECK (color REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ledger_categories (
  id              CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
  user_id         CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  parent_id       CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  parent_key      CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
                  GENERATED ALWAYS AS (IFNULL(parent_id, '00000000-0000-0000-0000-000000000000')) STORED,
  name            VARCHAR(20) NOT NULL,
  name_active_key VARCHAR(20) GENERATED ALWAYS AS (IF(deleted_at IS NULL, LOWER(name), NULL)) STORED,
  type            VARCHAR(16) NOT NULL,
  icon            VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'box',
  color           CHAR(7) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '#C9BBC1',
  sort            SMALLINT NOT NULL DEFAULT 0,
  is_system       TINYINT(1) NOT NULL DEFAULT 0,
  hidden          TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at      DATETIME(3) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ledger_categories_sibling_name (user_id, type, parent_key, name_active_key),
  KEY idx_ledger_categories_user_type (user_id, type, deleted_at),
  KEY idx_ledger_categories_parent (parent_id),
  CONSTRAINT fk_ledger_categories_user FOREIGN KEY (user_id)
    REFERENCES identity_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_categories_parent FOREIGN KEY (parent_id)
    REFERENCES ledger_categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_ledger_categories_name_length CHECK (CHAR_LENGTH(name) BETWEEN 1 AND 20),
  CONSTRAINT chk_ledger_categories_type CHECK (type IN ('expense', 'income')),
  CONSTRAINT chk_ledger_categories_color CHECK (color REGEXP '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT chk_ledger_categories_not_self CHECK (parent_id IS NULL OR parent_id <> id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id              CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
  user_id         CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name            VARCHAR(30) NOT NULL,
  name_active_key VARCHAR(30) GENERATED ALWAYS AS (IF(archived = 0, LOWER(name), NULL)) STORED,
  type            VARCHAR(16) NOT NULL,
  initial_balance_cents BIGINT NOT NULL DEFAULT 0,
  include_in_total TINYINT(1) NOT NULL DEFAULT 1,
  archived        TINYINT(1) NOT NULL DEFAULT 0,
  sort            SMALLINT NOT NULL DEFAULT 0,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ledger_accounts_user_name (user_id, name_active_key),
  KEY idx_ledger_accounts_user (user_id, archived),
  CONSTRAINT fk_ledger_accounts_user FOREIGN KEY (user_id)
    REFERENCES identity_users(id) ON DELETE CASCADE,
  CONSTRAINT chk_ledger_accounts_name_length CHECK (CHAR_LENGTH(name) BETWEEN 1 AND 30),
  CONSTRAINT chk_ledger_accounts_type CHECK (type IN ('cash', 'wechat', 'alipay', 'bank', 'credit', 'other')),
  CONSTRAINT chk_ledger_accounts_include CHECK (include_in_total IN (0, 1)),
  CONSTRAINT chk_ledger_accounts_archived CHECK (archived IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id            CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
  user_id       CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  client_id     VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  type          VARCHAR(16) NOT NULL,
  amount_cents  BIGINT NOT NULL,
  currency      CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'CNY',
  category_id   CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  account_id    CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  to_account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  note          VARCHAR(200) NOT NULL DEFAULT '',
  occurred_on   DATE NOT NULL,
  source        VARCHAR(16) NOT NULL DEFAULT 'manual',
  tags          JSON NOT NULL DEFAULT (JSON_ARRAY()),
  deleted_at    DATETIME(3) NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ledger_transactions_client (user_id, client_id),
  KEY idx_ledger_transactions_user_date (user_id, occurred_on, deleted_at),
  KEY idx_ledger_transactions_user_category (user_id, category_id),
  KEY idx_ledger_transactions_user_updated (user_id, updated_at),
  CONSTRAINT fk_ledger_transactions_user FOREIGN KEY (user_id)
    REFERENCES identity_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_transactions_category FOREIGN KEY (category_id)
    REFERENCES ledger_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_transactions_account FOREIGN KEY (account_id)
    REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_transactions_to_account FOREIGN KEY (to_account_id)
    REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT chk_ledger_transactions_type CHECK (type IN ('expense', 'income', 'transfer')),
  CONSTRAINT chk_ledger_transactions_amount CHECK (amount_cents BETWEEN 1 AND 999999999),
  CONSTRAINT chk_ledger_transactions_currency CHECK (currency = UPPER(currency)),
  CONSTRAINT chk_ledger_transactions_source CHECK (source IN ('manual', 'import', 'recurring')),
  CONSTRAINT chk_ledger_transactions_type_refs CHECK (
    (type = 'transfer'
      AND category_id IS NULL
      AND account_id IS NOT NULL
      AND to_account_id IS NOT NULL
      AND account_id <> to_account_id)
    OR
    (type IN ('expense', 'income')
      AND category_id IS NOT NULL
      AND to_account_id IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ledger_budgets (
  id               CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
  user_id          CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  scope            VARCHAR(16) NOT NULL,
  category_id      CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  category_key     CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
                   GENERATED ALWAYS AS (IFNULL(category_id, '00000000-0000-0000-0000-000000000000')) STORED,
  amount_cents     BIGINT NOT NULL,
  alert_thresholds JSON NOT NULL DEFAULT (JSON_ARRAY(80, 100)),
  active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ledger_budgets_scope (user_id, period_start, period_end, scope, category_key),
  KEY idx_ledger_budgets_user_period (user_id, period_start, period_end, active),
  CONSTRAINT fk_ledger_budgets_user FOREIGN KEY (user_id)
    REFERENCES identity_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_budgets_category FOREIGN KEY (category_id)
    REFERENCES ledger_categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_ledger_budgets_period CHECK (period_start <= period_end),
  CONSTRAINT chk_ledger_budgets_scope CHECK (scope IN ('total', 'category')),
  CONSTRAINT chk_ledger_budgets_ref CHECK (
    (scope = 'total' AND category_id IS NULL)
    OR (scope = 'category' AND category_id IS NOT NULL)
  ),
  CONSTRAINT chk_ledger_budgets_amount CHECK (amount_cents BETWEEN 1 AND 999999999),
  CONSTRAINT chk_ledger_budgets_active CHECK (active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ledger_recurring_rules (
  id                    CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
  user_id               CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  type                  VARCHAR(16) NOT NULL,
  amount_cents          BIGINT NOT NULL,
  category_id           CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  account_id            CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  note                  VARCHAR(200) NOT NULL DEFAULT '',
  frequency             VARCHAR(16) NOT NULL,
  interval_count        SMALLINT NOT NULL DEFAULT 1,
  next_run_on           DATE NOT NULL,
  enabled               TINYINT(1) NOT NULL DEFAULT 1,
  last_generated_period VARCHAR(16) NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ledger_recurring_next_run (next_run_on, enabled),
  CONSTRAINT fk_ledger_recurring_user FOREIGN KEY (user_id)
    REFERENCES identity_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_recurring_category FOREIGN KEY (category_id)
    REFERENCES ledger_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_recurring_account FOREIGN KEY (account_id)
    REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT chk_ledger_recurring_type CHECK (type IN ('expense', 'income')),
  CONSTRAINT chk_ledger_recurring_amount CHECK (amount_cents BETWEEN 1 AND 999999999),
  CONSTRAINT chk_ledger_recurring_frequency CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  CONSTRAINT chk_ledger_recurring_interval CHECK (interval_count BETWEEN 1 AND 12),
  CONSTRAINT chk_ledger_recurring_enabled CHECK (enabled IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 默认分类模板（19 条一级分类）
-- =========================================================

INSERT IGNORE INTO ledger_category_templates
  (template_key, parent_key, name, type, icon, color, sort, is_system)
VALUES
  ('expense_food',         NULL, '餐饮', 'expense', 'bowl',     '#E87BA4', 0,  1),
  ('expense_transport',    NULL, '交通', 'expense', 'train',    '#2A78D6', 1,  1),
  ('expense_shopping',     NULL, '购物', 'expense', 'cart',     '#EB6834', 2,  1),
  ('expense_housing',      NULL, '居住', 'expense', 'home',     '#1BAF7A', 3,  1),
  ('expense_entertainment',NULL, '娱乐', 'expense', 'play',     '#EDA100', 4,  1),
  ('expense_medical',      NULL, '医疗', 'expense', 'medical',  '#6250D6', 5,  1),
  ('expense_education',    NULL, '教育', 'expense', 'book',     '#008300', 6,  1),
  ('expense_gift',         NULL, '人情', 'expense', 'gift',     '#E34948', 7,  1),
  ('expense_phone',        NULL, '通讯', 'expense', 'phone',    '#6250D6', 8,  1),
  ('expense_pet',          NULL, '宠物', 'expense', 'paw',      '#EB6834', 9,  1),
  ('expense_travel',       NULL, '旅行', 'expense', 'plane',    '#2A78D6', 10, 1),
  ('expense_other',        NULL, '其他', 'expense', 'box',      '#C9BBC1', 11, 1),
  ('income_salary',        NULL, '工资', 'income',  'wallet',   '#1BAF7A', 0,  1),
  ('income_bonus',         NULL, '奖金', 'income',  'trophy',   '#EDA100', 1,  1),
  ('income_side',          NULL, '兼职', 'income',  'briefcase','#6250D6', 2,  1),
  ('income_investment',    NULL, '理财', 'income',  'chart',    '#2A78D6', 3,  1),
  ('income_reimbursement', NULL, '报销', 'income',  'receipt',  '#E87BA4', 4,  1),
  ('income_redpacket',     NULL, '红包', 'income',  'gift',     '#E34948', 5,  1),
  ('income_other',         NULL, '其他', 'income',  'box',      '#C9BBC1', 6,  1);

-- =========================================================
-- 校验存储过程
-- =========================================================

DROP PROCEDURE IF EXISTS ledger_validate_category_parent;
DELIMITER $$
CREATE PROCEDURE ledger_validate_category_parent(
  IN p_user_id CHAR(36),
  IN p_type VARCHAR(16),
  IN p_parent_id CHAR(36),
  IN p_id CHAR(36)
)
BEGIN
  DECLARE v_user_id CHAR(36);
  DECLARE v_type VARCHAR(16);
  DECLARE v_parent_id CHAR(36);

  IF p_parent_id IS NOT NULL THEN
    IF p_parent_id = p_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '分类不能把自己设为父分类';
    END IF;

    SELECT user_id, type, parent_id
      INTO v_user_id, v_type, v_parent_id
      FROM ledger_categories
     WHERE id = p_parent_id;

    IF v_user_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '父分类不存在';
    END IF;
    IF v_user_id <> p_user_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '父分类不属于当前用户';
    END IF;
    IF v_type <> p_type THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '父分类与子分类的收支类型不一致';
    END IF;
    IF v_parent_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '分类最多支持两级';
    END IF;
  END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS ledger_validate_transaction_refs;
DELIMITER $$
CREATE PROCEDURE ledger_validate_transaction_refs(
  IN p_user_id CHAR(36),
  IN p_type VARCHAR(16),
  IN p_category_id CHAR(36),
  IN p_account_id CHAR(36),
  IN p_to_account_id CHAR(36)
)
BEGIN
  DECLARE v_user_id CHAR(36);
  DECLARE v_type VARCHAR(16);
  DECLARE v_deleted DATETIME(3);

  IF p_type = 'transfer' THEN
    IF p_category_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '转账不能关联分类';
    END IF;
    IF p_account_id IS NULL OR p_to_account_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '转账必须指定转出与转入账户';
    END IF;
  ELSE
    IF p_category_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '支出/收入必须指定分类';
    END IF;

    SELECT user_id, type, deleted_at
      INTO v_user_id, v_type, v_deleted
      FROM ledger_categories
     WHERE id = p_category_id;

    IF v_user_id IS NULL
       OR v_user_id <> p_user_id
       OR v_type <> p_type
       OR v_deleted IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '分类无效、类型不匹配或不属于当前用户';
    END IF;
  END IF;

  IF p_account_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM ledger_accounts WHERE id = p_account_id;
    IF v_user_id IS NULL OR v_user_id <> p_user_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '转出账户无效或不属于当前用户';
    END IF;
  END IF;

  IF p_to_account_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM ledger_accounts WHERE id = p_to_account_id;
    IF v_user_id IS NULL OR v_user_id <> p_user_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '转入账户无效或不属于当前用户';
    END IF;
  END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS ledger_validate_budget_refs;
DELIMITER $$
CREATE PROCEDURE ledger_validate_budget_refs(
  IN p_user_id CHAR(36),
  IN p_scope VARCHAR(16),
  IN p_category_id CHAR(36)
)
BEGIN
  DECLARE v_user_id CHAR(36);
  DECLARE v_type VARCHAR(16);
  DECLARE v_deleted DATETIME(3);

  IF p_scope = 'category' THEN
    SELECT user_id, type, deleted_at
      INTO v_user_id, v_type, v_deleted
      FROM ledger_categories
     WHERE id = p_category_id;

    IF v_user_id IS NULL
       OR v_user_id <> p_user_id
       OR v_type <> 'expense'
       OR v_deleted IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '预算分类必须是当前用户的有效支出分类';
    END IF;
  END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS ledger_validate_recurring_refs;
DELIMITER $$
CREATE PROCEDURE ledger_validate_recurring_refs(
  IN p_user_id CHAR(36),
  IN p_type VARCHAR(16),
  IN p_category_id CHAR(36),
  IN p_account_id CHAR(36)
)
BEGIN
  DECLARE v_user_id CHAR(36);
  DECLARE v_type VARCHAR(16);
  DECLARE v_deleted DATETIME(3);

  SELECT user_id, type, deleted_at
    INTO v_user_id, v_type, v_deleted
    FROM ledger_categories
   WHERE id = p_category_id;

  IF v_user_id IS NULL
     OR v_user_id <> p_user_id
     OR v_type <> p_type
     OR v_deleted IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '周期记账分类无效或不属于当前用户';
  END IF;

  IF p_account_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM ledger_accounts WHERE id = p_account_id;
    IF v_user_id IS NULL OR v_user_id <> p_user_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '周期记账账户无效或不属于当前用户';
    END IF;
  END IF;
END$$
DELIMITER ;

-- =========================================================
-- BEFORE INSERT / UPDATE 触发器
-- =========================================================

DROP TRIGGER IF EXISTS trg_ledger_categories_bi;
CREATE TRIGGER trg_ledger_categories_bi
BEFORE INSERT ON ledger_categories
FOR EACH ROW
CALL ledger_validate_category_parent(NEW.user_id, NEW.type, NEW.parent_id, NEW.id);

DROP TRIGGER IF EXISTS trg_ledger_categories_bu;
CREATE TRIGGER trg_ledger_categories_bu
BEFORE UPDATE ON ledger_categories
FOR EACH ROW
CALL ledger_validate_category_parent(NEW.user_id, NEW.type, NEW.parent_id, NEW.id);

DROP TRIGGER IF EXISTS trg_ledger_transactions_bi;
CREATE TRIGGER trg_ledger_transactions_bi
BEFORE INSERT ON ledger_transactions
FOR EACH ROW
CALL ledger_validate_transaction_refs(NEW.user_id, NEW.type, NEW.category_id, NEW.account_id, NEW.to_account_id);

DROP TRIGGER IF EXISTS trg_ledger_transactions_bu;
CREATE TRIGGER trg_ledger_transactions_bu
BEFORE UPDATE ON ledger_transactions
FOR EACH ROW
CALL ledger_validate_transaction_refs(NEW.user_id, NEW.type, NEW.category_id, NEW.account_id, NEW.to_account_id);

DROP TRIGGER IF EXISTS trg_ledger_budgets_bi;
CREATE TRIGGER trg_ledger_budgets_bi
BEFORE INSERT ON ledger_budgets
FOR EACH ROW
CALL ledger_validate_budget_refs(NEW.user_id, NEW.scope, NEW.category_id);

DROP TRIGGER IF EXISTS trg_ledger_budgets_bu;
CREATE TRIGGER trg_ledger_budgets_bu
BEFORE UPDATE ON ledger_budgets
FOR EACH ROW
CALL ledger_validate_budget_refs(NEW.user_id, NEW.scope, NEW.category_id);

DROP TRIGGER IF EXISTS trg_ledger_recurring_bi;
CREATE TRIGGER trg_ledger_recurring_bi
BEFORE INSERT ON ledger_recurring_rules
FOR EACH ROW
CALL ledger_validate_recurring_refs(NEW.user_id, NEW.type, NEW.category_id, NEW.account_id);

DROP TRIGGER IF EXISTS trg_ledger_recurring_bu;
CREATE TRIGGER trg_ledger_recurring_bu
BEFORE UPDATE ON ledger_recurring_rules
FOR EACH ROW
CALL ledger_validate_recurring_refs(NEW.user_id, NEW.type, NEW.category_id, NEW.account_id);

-- =========================================================
-- 初始化存储过程
-- =========================================================

DROP PROCEDURE IF EXISTS ledger_seed_default_categories;
DELIMITER $$
CREATE PROCEDURE ledger_seed_default_categories(IN p_user_id CHAR(36))
BEGIN
  IF (SELECT COUNT(*) FROM identity_users WHERE id = p_user_id) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '用户不存在';
  END IF;

  INSERT IGNORE INTO ledger_categories
    (id, user_id, parent_id, name, type, icon, color, sort, is_system)
  SELECT
    UUID(), p_user_id, NULL, t.name, t.type, t.icon, t.color, t.sort, 1
  FROM ledger_category_templates t
  WHERE t.parent_key IS NULL;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS ledger_bootstrap_user;
DELIMITER $$
CREATE PROCEDURE ledger_bootstrap_user(IN p_user_id CHAR(36))
BEGIN
  INSERT IGNORE INTO ledger_user_settings (user_id) VALUES (p_user_id);
  CALL ledger_seed_default_categories(p_user_id);
END$$
DELIMITER ;

-- =========================================================
-- 报表视图
-- =========================================================

CREATE OR REPLACE VIEW ledger_v_monthly_summary AS
SELECT
  user_id,
  CAST(DATE_FORMAT(occurred_on, '%Y-%m-01') AS DATE) AS month_start,
  type,
  SUM(amount_cents) AS total_cents,
  COUNT(*) AS transaction_count
FROM ledger_transactions
WHERE deleted_at IS NULL
  AND type IN ('expense', 'income')
GROUP BY
  user_id,
  CAST(DATE_FORMAT(occurred_on, '%Y-%m-01') AS DATE),
  type;

CREATE OR REPLACE VIEW ledger_v_category_spending AS
SELECT
  t.user_id,
  CAST(DATE_FORMAT(t.occurred_on, '%Y-%m-01') AS DATE) AS month_start,
  t.type,
  c.id AS category_id,
  c.name AS category_name,
  SUM(t.amount_cents) AS total_cents,
  COUNT(*) AS transaction_count
FROM ledger_transactions t
JOIN ledger_categories c ON c.id = t.category_id
WHERE t.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND t.type IN ('expense', 'income')
GROUP BY
  t.user_id,
  CAST(DATE_FORMAT(t.occurred_on, '%Y-%m-01') AS DATE),
  t.type,
  c.id,
  c.name;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('004-002', 'MySQL schema：identity 认证域 + ledger 云同步预留');
