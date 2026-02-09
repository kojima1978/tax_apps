import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-utils';
import type {
  Company,
  User,
  SimilarIndustryData,
  Valuation,
  FinancialData,
  Investor,
} from '@/lib/db-types';

/** テーブル名一覧 */
const TABLE_NAMES = [
  'companies',
  'users',
  'similar_industry_data',
  'valuations',
  'financial_data',
  'investors',
] as const;

type TableName = (typeof TABLE_NAMES)[number];

/** エクスポートJSON構造 */
interface BackupData {
  version: number;
  appName: string;
  exportedAt: string;
  data: {
    companies: Company[];
    users: User[];
    similar_industry_data: SimilarIndustryData[];
    valuations: Valuation[];
    financial_data: FinancialData[];
    investors: Investor[];
  };
}

/** 各テーブルの必須カラム定義 */
const REQUIRED_COLUMNS: Record<TableName, string[]> = {
  companies: ['id', 'company_name', 'is_active'],
  users: ['id', 'name', 'is_active'],
  similar_industry_data: ['id', 'fiscal_year', 'profit_per_share', 'net_asset_per_share', 'average_stock_price'],
  valuations: ['id', 'company_id', 'user_id', 'fiscal_year'],
  financial_data: ['id', 'valuation_id'],
  investors: ['id', 'valuation_id', 'investor_name'],
};

/**
 * GET — 全テーブルデータをJSONエクスポート
 */
export async function GET() {
  return withErrorHandler(() => {
    const db = getDatabase();

    const backup: BackupData = {
      version: 1,
      appName: 'medical-stock-valuation',
      exportedAt: new Date().toISOString(),
      data: {
        companies: db.prepare('SELECT * FROM companies').all() as Company[],
        users: db.prepare('SELECT * FROM users').all() as User[],
        similar_industry_data: db.prepare('SELECT * FROM similar_industry_data').all() as SimilarIndustryData[],
        valuations: db.prepare('SELECT * FROM valuations').all() as Valuation[],
        financial_data: db.prepare('SELECT * FROM financial_data').all() as FinancialData[],
        investors: db.prepare('SELECT * FROM investors').all() as Investor[],
      },
    };

    const json = JSON.stringify(backup, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="medical-backup_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }, 'バックアップのエクスポートに失敗しました');
}

/**
 * POST — JSONからデータを復元（インポート）
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const body: unknown = await request.json();

    // --- バリデーション ---
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: '無効なJSONデータです' }, { status: 400 });
    }

    const backup = body as Record<string, unknown>;

    if (backup.version !== 1) {
      return NextResponse.json({ error: 'バージョンが不正です（version: 1 が必要）' }, { status: 400 });
    }

    if (backup.appName !== 'medical-stock-valuation') {
      return NextResponse.json({ error: 'アプリ名が不正です' }, { status: 400 });
    }

    if (!backup.data || typeof backup.data !== 'object') {
      return NextResponse.json({ error: 'dataフィールドが不正です' }, { status: 400 });
    }

    const data = backup.data as Record<string, unknown>;

    // 各テーブルの存在とカラムチェック
    for (const table of TABLE_NAMES) {
      if (!Array.isArray(data[table])) {
        return NextResponse.json(
          { error: `data.${table} が配列ではありません` },
          { status: 400 }
        );
      }

      const rows = data[table] as Record<string, unknown>[];
      const requiredCols = REQUIRED_COLUMNS[table];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || typeof row !== 'object') {
          return NextResponse.json(
            { error: `data.${table}[${i}] がオブジェクトではありません` },
            { status: 400 }
          );
        }
        for (const col of requiredCols) {
          if (!(col in row)) {
            return NextResponse.json(
              { error: `data.${table}[${i}] に必須カラム "${col}" がありません` },
              { status: 400 }
            );
          }
        }
      }
    }

    // --- トランザクション内でインポート ---
    const db = getDatabase();
    const importData = data as BackupData['data'];

    const transaction = db.transaction(() => {
      // 外部キー制約の順序で削除（子テーブル → 親テーブル）
      db.prepare('DELETE FROM investors').run();
      db.prepare('DELETE FROM financial_data').run();
      db.prepare('DELETE FROM valuations').run();
      db.prepare('DELETE FROM similar_industry_data').run();
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM companies').run();

      // 親テーブル → 子テーブルの順序でINSERT
      // companies
      const insertCompany = db.prepare(
        'INSERT INTO companies (id, company_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      );
      for (const row of importData.companies) {
        insertCompany.run(row.id, row.company_name, row.is_active, row.created_at ?? null, row.updated_at ?? null);
      }

      // users
      const insertUser = db.prepare(
        'INSERT INTO users (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      );
      for (const row of importData.users) {
        insertUser.run(row.id, row.name, row.is_active, row.created_at ?? null, row.updated_at ?? null);
      }

      // similar_industry_data
      const insertSimilar = db.prepare(
        'INSERT INTO similar_industry_data (id, fiscal_year, profit_per_share, net_asset_per_share, average_stock_price, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const row of importData.similar_industry_data) {
        insertSimilar.run(
          row.id, row.fiscal_year, row.profit_per_share, row.net_asset_per_share,
          row.average_stock_price, (row as unknown as Record<string, unknown>).is_active ?? 1,
          row.created_at ?? null, row.updated_at ?? null
        );
      }

      // valuations
      const insertValuation = db.prepare(
        'INSERT INTO valuations (id, company_id, user_id, fiscal_year, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const row of importData.valuations) {
        insertValuation.run(row.id, row.company_id, row.user_id, row.fiscal_year, row.created_at ?? null, row.updated_at ?? null);
      }

      // financial_data
      const insertFinancial = db.prepare(
        `INSERT INTO financial_data (id, valuation_id, employees, total_assets, sales,
         current_period_net_asset, previous_period_net_asset, net_asset_tax_value,
         current_period_profit, previous_period_profit, previous_previous_period_profit,
         created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const row of importData.financial_data) {
        insertFinancial.run(
          row.id, row.valuation_id, row.employees, row.total_assets, row.sales,
          row.current_period_net_asset, row.previous_period_net_asset, row.net_asset_tax_value,
          row.current_period_profit, row.previous_period_profit, row.previous_previous_period_profit,
          row.created_at ?? null, row.updated_at ?? null
        );
      }

      // investors
      const insertInvestor = db.prepare(
        `INSERT INTO investors (id, valuation_id, investor_name, shares_held, shareholding_ratio,
         created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const row of importData.investors) {
        insertInvestor.run(
          row.id, row.valuation_id, row.investor_name, row.shares_held, row.shareholding_ratio,
          row.created_at ?? null, row.updated_at ?? null
        );
      }
    });

    transaction();

    return NextResponse.json({
      success: true,
      counts: {
        companies: importData.companies.length,
        users: importData.users.length,
        similar_industry_data: importData.similar_industry_data.length,
        valuations: importData.valuations.length,
        financial_data: importData.financial_data.length,
        investors: importData.investors.length,
      },
    });
  }, 'バックアップのインポートに失敗しました');
}
