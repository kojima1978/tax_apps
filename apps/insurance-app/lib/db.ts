import Database from 'better-sqlite3';
import { accessSync, constants, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const isServerless = process.env.VERCEL || process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME;

const DEFAULT_DB_PATH = isServerless 
  ? resolve('/tmp', 'insurance.sqlite')
  : resolve(process.cwd(), 'data', 'insurance.sqlite');

const DATABASE_PATH = process.env.DATABASE_PATH 
  ? resolve(process.env.DATABASE_PATH)
  : DEFAULT_DB_PATH;

let db: Database.Database | null = null;

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = dirname(DATABASE_PATH);
  try {
    mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create database directory: ${dbDir}`, err);
    throw err;
  }

  try {
    db = new Database(DATABASE_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    runMigrations(db);
    return db;
  } catch (err) {
    console.error(`Failed to open database at ${DATABASE_PATH}`, err);
    throw err;
  }
}

// health 用: DB を開いて読めることに加え、DB ファイルとそのフォルダに書けるかを見る
// （DB には何も書かない）。SELECT 1 だけでは「ファイルだけ書けない」状態を
// 見落とす ── 開くのも読むのも書き込みロックも通り、実際に書いたときに初めて
// SQLITE_READONLY になる（実測）。リストアで所有者がずれた 2026-10-14 の件では
// フォルダごと書けず、healthcheck は通ったまま DB だけ開けなかった。
// 戻り値: 問題が無ければ null、あればエラーコード。
export function checkDbHealth(): string | null {
  try {
    getDb().prepare('SELECT 1').get();
    accessSync(DATABASE_PATH, constants.W_OK);
    accessSync(dirname(DATABASE_PATH), constants.W_OK);
    return null;
  } catch (err) {
    return (err as { code?: string }).code ?? 'error';
  }
}

/**
 * policies の作り。金額の列は「契約通貨での額」で、円建ての契約は円、外貨建ての契約は
 * 外貨（USD）が入る。円換算額は読み出し時にその案件のレートで作る
 * （applyValuationRateToPolicy）ので列には持たない ── 保存した写しは誰も維持しておらず、
 * 実際に「外貨額 × 今のレート」と食い違っていた。
 * 移行で同じ形の表を作り直すため、DDL はここ1箇所に置いて両方から使う。
 */
const policiesTableDdl = (createStatement: string) => `${createStatement} (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      policy_type TEXT NOT NULL,
      policy_number TEXT,
      contract_date TEXT NOT NULL,
      contract_age INTEGER NOT NULL,
      insured_member_id TEXT NOT NULL,
      beneficiary_member_id TEXT,
      pension_settings TEXT,
      death_benefit_disease REAL NOT NULL DEFAULT 0,
      death_benefit_accident REAL NOT NULL DEFAULT 0,
      hosp_day_disease REAL NOT NULL DEFAULT 0,
      hosp_day_accident REAL NOT NULL DEFAULT 0,
      diagnosis_benefit REAL NOT NULL DEFAULT 0,
      policy_end_age INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD')),
      -- 保存した時点の円換算レート。案件のレート（app_state_meta.valuation_settings）が
      -- 無い DB から引き継ぐための控えで、新しい入力では使わない
      exchange_rate REAL NOT NULL DEFAULT 0,
      payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('monthly', 'annual', 'single')),
      premium_amount REAL NOT NULL DEFAULT 0,
      payment_end_date TEXT,
      payment_end_age INTEGER NOT NULL,
      premium_payment_completed INTEGER NOT NULL DEFAULT 0,
      payment_details TEXT,
      annual_premium REAL NOT NULL DEFAULT 0,
      maturity_benefit REAL NOT NULL DEFAULT 0,
      surrender_projection TEXT,
      surrender_values TEXT,
      evaluation_overrides TEXT,
      consultant_note TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (insured_member_id) REFERENCES family_members(id) ON DELETE RESTRICT,
      FOREIGN KEY (beneficiary_member_id) REFERENCES family_members(id) ON DELETE SET NULL
    );`;

/** 表を作り直すと索引も消えるので、こちらも1箇所に置いて移行から作り直す */
const POLICY_INDEX_DDL = `CREATE INDEX IF NOT EXISTS idx_policies_case_id_sort_order
      ON policies(case_id, sort_order);

    CREATE INDEX IF NOT EXISTS idx_policies_case_id_policy_number
      ON policies(case_id, policy_number);

    CREATE INDEX IF NOT EXISTS idx_policies_insured_member_id
      ON policies(insured_member_id);

    CREATE INDEX IF NOT EXISTS idx_policies_beneficiary_member_id
      ON policies(beneficiary_member_id);`;

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agencies (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      representative TEXT NOT NULL,
      phone TEXT NOT NULL,
      logo_data_url TEXT,
      print_logo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_kana TEXT NOT NULL DEFAULT '',
      relationship TEXT NOT NULL,
      birth_date TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    ${policiesTableDdl('CREATE TABLE IF NOT EXISTS policies')}

    -- 死亡保険金の受取人ごとの受取割合。1件の契約に複数人並ぶので policies の
    -- JSON 列（beneficiary_allocations）から表へ移した。合計を100%にする決まりは
    -- 画面と validators の担当（SQL では表せない）。
    CREATE TABLE IF NOT EXISTS policy_beneficiaries (
      policy_id TEXT NOT NULL,
      beneficiary_member_id TEXT NOT NULL,
      percentage REAL NOT NULL CHECK (percentage > 0),
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (policy_id, beneficiary_member_id),
      FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE,
      FOREIGN KEY (beneficiary_member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_state_meta (
      case_id TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_exported_at TEXT,
      valuation_settings TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agency_masters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      representative TEXT NOT NULL,
      phone TEXT NOT NULL,
      logo_data_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS insurance_type_descriptions (
      policy_type TEXT PRIMARY KEY,
      long_description TEXT NOT NULL,
      purpose TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS portfolio_insights (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('gap', 'redundancy', 'recommendation')),
      text TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_portfolio_insights_case_id
      ON portfolio_insights(case_id, sort_order);

    CREATE INDEX IF NOT EXISTS idx_family_members_case_id_sort_order
      ON family_members(case_id, sort_order);

    ${POLICY_INDEX_DDL}

    CREATE INDEX IF NOT EXISTS idx_policy_beneficiaries_member
      ON policy_beneficiaries(beneficiary_member_id);
  `);

  try {
    db.exec(`ALTER TABLE family_members ADD COLUMN name_kana TEXT NOT NULL DEFAULT ''`);
  } catch {
    // column already exists
  }

  try {
    db.exec(`ALTER TABLE policies ADD COLUMN evaluation_overrides TEXT`);
  } catch {
    // column already exists
  }

  try {
    db.exec(`ALTER TABLE policies ADD COLUMN surrender_values TEXT`);
  } catch {
    // column already exists
  }

  const optionalPolicyColumns = [
    `ALTER TABLE policies ADD COLUMN currency TEXT NOT NULL DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD'))`,
    `ALTER TABLE policies ADD COLUMN exchange_rate REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE policies ADD COLUMN pension_settings TEXT`,
    `ALTER TABLE policies ADD COLUMN premium_payment_completed INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE policies ADD COLUMN payment_details TEXT`,
    `ALTER TABLE policies ADD COLUMN surrender_projection TEXT`,
  ];

  for (const sql of optionalPolicyColumns) {
    try {
      db.exec(sql);
    } catch {
      // column already exists
    }
  }

  migrateBeneficiaryAllocations(db);
  migratePolicyAmountsToContractCurrency(db);

  try {
    db.exec(`ALTER TABLE app_state_meta ADD COLUMN valuation_settings TEXT`);
  } catch {
    // column already exists
  }

  // 代理店ロゴ（data URL）と印刷時の表示可否
  const optionalAgencyColumns = [
    `ALTER TABLE agencies ADD COLUMN logo_data_url TEXT`,
    `ALTER TABLE agencies ADD COLUMN print_logo INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE agency_masters ADD COLUMN logo_data_url TEXT`,
  ];

  for (const sql of optionalAgencyColumns) {
    try {
      db.exec(sql);
    } catch {
      // column already exists
    }
  }
}

/** 金額の列を契約通貨へ揃えた版。これより後の移行はこの番号を増やす */
const SCHEMA_VERSION_CONTRACT_CURRENCY_AMOUNTS = 1;

/** 畳む前の対（円の列 → 外貨の列）。移行とその後片付けの両方がこの表から動く */
const FOREIGN_AMOUNT_COLUMNS: Record<string, string> = {
  premium_amount: 'foreign_premium_amount',
  death_benefit_disease: 'foreign_death_benefit_disease',
  death_benefit_accident: 'foreign_death_benefit_accident',
  hosp_day_disease: 'foreign_hosp_day_disease',
  hosp_day_accident: 'foreign_hosp_day_accident',
  diagnosis_benefit: 'foreign_diagnosis_benefit',
  maturity_benefit: 'foreign_maturity_benefit',
};

/** 作り直した表へ写す列（新しい DDL の全列。並びは SELECT 側と対で使う） */
const POLICY_COPY_COLUMNS = [
  'id', 'case_id', 'company_name', 'policy_type', 'policy_number', 'contract_date', 'contract_age',
  'insured_member_id', 'beneficiary_member_id', 'pension_settings',
  'death_benefit_disease', 'death_benefit_accident', 'hosp_day_disease', 'hosp_day_accident',
  'diagnosis_benefit', 'policy_end_age', 'currency', 'exchange_rate',
  'payment_frequency', 'premium_amount', 'payment_end_date', 'payment_end_age',
  'premium_payment_completed', 'payment_details', 'annual_premium', 'maturity_benefit',
  'surrender_projection', 'surrender_values', 'evaluation_overrides', 'consultant_note',
  'sort_order', 'created_at', 'updated_at',
];

/**
 * 外貨建ての金額は「円の列 + foreign_* 列」の対（7組14列）で持っていた。本物はどちらか
 * 片方だけで、外貨建ての契約の円の列は保存した時のレートで換算した写し ── 読み出し側
 * （applyValuationRateToPolicy）が毎回作り直すので誰も維持しておらず、稼働中の DB で実際に
 * 「外貨額 × 今のレート」と食い違っていた。金額は「契約通貨での額」1列に畳み、円換算は
 * 読み出し時に作る。
 *
 * 写す規則は「いまアプリが画面に出している値」:
 *  - 外貨建て(USD)の行は円の列を foreign_* で置き換える（foreign_* が 0 なら 0。画面も
 *    その 0 を出しているので見え方は変わらない）
 *  - 円建ての行はそのまま（foreign_* に値が残っていても画面は読んでいないので捨てる）
 *
 * 印は PRAGMA user_version。列の有無では駄目 ── 古い版のアプリでこの DB を開くと
 * optionalPolicyColumns が foreign_* を 0 で付け直すので、版を往復すると金額が 0 に潰れる。
 */
function migratePolicyAmountsToContractCurrency(db: Database.Database): void {
  const version = Number(db.pragma('user_version', { simple: true }) ?? 0);
  const columns = (db.prepare(`PRAGMA table_info(policies)`).all() as { name: string }[]).map((column) => column.name);

  if (version >= SCHEMA_VERSION_CONTRACT_CURRENCY_AMOUNTS) {
    // 古い版のアプリで開かれた後。金額は既に契約通貨なので、付け直された列を落とすだけ
    for (const foreignColumn of Object.values(FOREIGN_AMOUNT_COLUMNS)) {
      if (!columns.includes(foreignColumn)) continue;
      try {
        db.exec(`ALTER TABLE policies DROP COLUMN ${foreignColumn}`);
      } catch {
        // 落とせなくても読み書きには使わないので先へ進む
      }
    }
    return;
  }

  if (!columns.includes('foreign_premium_amount')) {
    // 新しい DDL で作られた DB。写すものは無いので印だけ付ける
    db.pragma(`user_version = ${SCHEMA_VERSION_CONTRACT_CURRENCY_AMOUNTS}`);
    return;
  }

  // 円の額しか残っていない外貨建ての契約から、せめてレートを救っておく。案件のレートが
  // 未設定の DB では inferValuationSettings がこの列を頼りにする
  db.exec(`
    UPDATE policies
       SET exchange_rate = premium_amount / foreign_premium_amount
     WHERE currency = 'USD' AND exchange_rate <= 0
       AND foreign_premium_amount > 0 AND premium_amount > 0
  `);

  // 外貨額が1つも入っていない外貨建ての契約は、保存済みの円額が消える。画面はもともと
  // 外貨額から作っているので表示は変わらないが、黙って捨てたことにはしない
  const yenOnly = db.prepare(`
    SELECT COUNT(*) AS count FROM policies
     WHERE currency = 'USD'
       AND ${Object.values(FOREIGN_AMOUNT_COLUMNS).map((column) => `${column} = 0`).join(' AND ')}
       AND (${Object.keys(FOREIGN_AMOUNT_COLUMNS).map((column) => `${column} <> 0`).join(' OR ')})
  `).get() as { count: number };
  if (yenOnly.count > 0) {
    console.warn(`[insurance-app] 外貨建てなのに外貨額が入っていない契約が ${yenOnly.count}件あります: 保存済みの円換算額は引き継ぎません`);
  }

  const selectExpressions = POLICY_COPY_COLUMNS.map((column) => {
    // 年額保険料は保険料から導く列。外貨建ては外貨の保険料から作り直す
    if (column === 'annual_premium') {
      return `CASE WHEN currency = 'USD'
                   THEN foreign_premium_amount * (CASE WHEN payment_frequency = 'monthly' THEN 12 ELSE 1 END)
                   ELSE annual_premium END`;
    }
    const foreignColumn = FOREIGN_AMOUNT_COLUMNS[column];
    return foreignColumn ? `CASE WHEN currency = 'USD' THEN ${foreignColumn} ELSE ${column} END` : column;
  });

  // 列の型も変える（新しい意味では小数がある）ので表ごと作り直す。policy_beneficiaries が
  // policies を参照しているため、作り直しの間だけ外す ── PRAGMA はトランザクションの中では
  // 効かないので外側で切り替える
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(`DROP TABLE IF EXISTS policies_migrating`);
      db.exec(policiesTableDdl('CREATE TABLE policies_migrating'));
      db.exec(`
        INSERT INTO policies_migrating (${POLICY_COPY_COLUMNS.join(', ')})
        SELECT ${selectExpressions.join(', ')} FROM policies
      `);
      db.exec(`DROP TABLE policies`);
      db.exec(`ALTER TABLE policies_migrating RENAME TO policies`);
      db.exec(POLICY_INDEX_DDL);
      const violations = db.pragma('foreign_key_check') as unknown[];
      if (violations.length > 0) {
        throw new Error(`policies を作り直したら参照が壊れました（${violations.length}件）`);
      }
      db.pragma(`user_version = ${SCHEMA_VERSION_CONTRACT_CURRENCY_AMOUNTS}`);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

/**
 * 受取割合は policies の JSON 列（beneficiary_allocations）に持っていた。
 * SQL で受取人を辿れず、家族を消しても残るので policy_beneficiaries へ移す。
 * 列が残っている DB だけ1回写して落とす（列の有無がそのまま「移したか」の印）。
 * 家族情報に居ない受取人は写さない ── 画面でも名前が出ず割合も合わないので、
 * 既に壊れている値をわざわざ運ばない。
 */
function migrateBeneficiaryAllocations(db: Database.Database): void {
  const columns = db.prepare(`PRAGMA table_info(policies)`).all() as { name: string }[];
  if (columns.some(column => column.name === 'beneficiary_allocations')) {
    const rows = db.prepare(`SELECT id, beneficiary_allocations FROM policies WHERE beneficiary_allocations IS NOT NULL`)
      .all() as { id: string; beneficiary_allocations: string }[];
    const link = db.prepare(`
      INSERT OR IGNORE INTO policy_beneficiaries (policy_id, beneficiary_member_id, percentage, sort_order)
      SELECT @policyId, id, @percentage, @sortOrder FROM family_members WHERE id = @beneficiaryId
    `);
    db.transaction(() => {
      for (const row of rows) {
        let allocations: unknown;
        try {
          allocations = JSON.parse(row.beneficiary_allocations);
        } catch {
          continue; // 壊れた JSON は単一受取人（下の補完）だけが残る
        }
        if (!Array.isArray(allocations)) continue;
        allocations.forEach((allocation, index) => {
          const beneficiaryId = String((allocation as { beneficiaryId?: unknown })?.beneficiaryId ?? '').trim();
          const percentage = Number((allocation as { percentage?: unknown })?.percentage);
          if (!beneficiaryId || !Number.isFinite(percentage) || percentage <= 0) return;
          link.run({ policyId: row.id, beneficiaryId, percentage, sortOrder: index });
        });
      }
      db.exec(`ALTER TABLE policies DROP COLUMN beneficiary_allocations`);
    })();
  }

  // 受取人が1人だけの時期に作られた契約は JSON 列が空で、単一受取人の列
  // （beneficiary_member_id）にしか入っていない。画面はそれを100%として読んで
  // いるので、同じ内容を表にも入れて「受取人は表にある」で揃える。行が1つも
  // 無い契約だけが対象なので、何度流しても結果は変わらない（上の移行より
  // 後に置くこと ── 先に流すと複数人の契約に100%の行が1つ余計に入る）。
  db.exec(`
    INSERT OR IGNORE INTO policy_beneficiaries (policy_id, beneficiary_member_id, percentage, sort_order)
    SELECT p.id, p.beneficiary_member_id, 100, 0
    FROM policies p
    WHERE p.beneficiary_member_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM policy_beneficiaries b WHERE b.policy_id = p.id)
  `);
}
