import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-utils';
import type { Company, User, FinancialData, Investor as DBInvestor, ValuationWithRelations } from '@/lib/db-types';

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const data = await request.json();
    const {
      id,
      fiscalYear,
      companyName,
      personInCharge,
      employees,
      totalAssets,
      sales,
      currentPeriodNetAsset,
      previousPeriodNetAsset,
      netAssetTaxValue,
      currentPeriodProfit,
      previousPeriodProfit,
      previousPreviousPeriodProfit,
      investors,
    } = data;

    if (!id || !fiscalYear || !companyName || !personInCharge) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // トランザクション開始
    const transaction = db.transaction(() => {
      // 1. 会社の存在確認または作成
      const company = db.prepare('SELECT id FROM companies WHERE company_name = ?').get(companyName) as Pick<Company, 'id'> | undefined;

      let companyId: number;
      if (!company) {
        const result = db.prepare(`
          INSERT INTO companies (company_name)
          VALUES (?)
        `).run(companyName);
        companyId = result.lastInsertRowid as number;
      } else {
        companyId = company.id;
      }

      // 2. 担当者の存在確認または作成
      const user = db.prepare('SELECT id FROM users WHERE name = ?').get(personInCharge) as Pick<User, 'id'> | undefined;

      let userId: number;
      if (!user) {
        const result = db.prepare(`
          INSERT INTO users (name)
          VALUES (?)
        `).run(personInCharge);
        userId = result.lastInsertRowid as number;
      } else {
        userId = user.id;
      }

      // 3. 既存の評価レコードをチェック
      const existing = db.prepare('SELECT id FROM valuations WHERE id = ?').get(id);

      let valuationId: number;

      if (existing) {
        // 更新
        valuationId = id;
        db.prepare(`
          UPDATE valuations SET
            company_id = ?,
            user_id = ?,
            fiscal_year = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(companyId, userId, fiscalYear, valuationId);

        // 財務データを更新
        db.prepare(`
          UPDATE financial_data SET
            employees = ?,
            total_assets = ?,
            sales = ?,
            current_period_net_asset = ?,
            previous_period_net_asset = ?,
            net_asset_tax_value = ?,
            current_period_profit = ?,
            previous_period_profit = ?,
            previous_previous_period_profit = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE valuation_id = ?
        `).run(
          employees,
          totalAssets,
          sales,
          currentPeriodNetAsset,
          previousPeriodNetAsset,
          netAssetTaxValue,
          currentPeriodProfit,
          previousPeriodProfit,
          previousPreviousPeriodProfit,
          valuationId
        );

        // 既存の投資家データを削除して再作成
        db.prepare('DELETE FROM investors WHERE valuation_id = ?').run(valuationId);
      } else {
        // 新規作成
        const valuationResult = db.prepare(`
          INSERT INTO valuations (
            company_id,
            user_id,
            fiscal_year
          ) VALUES (?, ?, ?)
        `).run(companyId, userId, fiscalYear);

        valuationId = valuationResult.lastInsertRowid as number;

        // 財務データを作成
        db.prepare(`
          INSERT INTO financial_data (
            valuation_id,
            employees,
            total_assets,
            sales,
            current_period_net_asset,
            previous_period_net_asset,
            net_asset_tax_value,
            current_period_profit,
            previous_period_profit,
            previous_previous_period_profit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          valuationId,
          employees,
          totalAssets,
          sales,
          currentPeriodNetAsset,
          previousPeriodNetAsset,
          netAssetTaxValue,
          currentPeriodProfit,
          previousPeriodProfit,
          previousPreviousPeriodProfit
        );
      }

      // 投資家データを挿入
      if (investors && Array.isArray(investors)) {
        const investorStmt = db.prepare(`
          INSERT INTO investors (
            valuation_id,
            investor_name,
            shares_held,
            shareholding_ratio
          ) VALUES (?, ?, ?, ?)
        `);

        // 総出資金額を計算
        const totalAmount = investors.reduce((sum, inv) => sum + (inv.amount || 0), 0);

        for (const investor of investors) {
          const amount = investor.amount || 0;
          const ratio = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

          investorStmt.run(
            valuationId,
            investor.name || '',
            amount,
            ratio
          );
        }
      }
    });

    transaction();

    return NextResponse.json({ success: true, message: 'データを保存しました' });
  }, 'データの保存に失敗しました');
}

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const db = getDatabase();

    if (id) {
      // 特定のIDのデータを取得
      const valuation = db.prepare(`
        SELECT
          v.id,
          v.fiscal_year,
          v.created_at,
          v.updated_at,
          c.company_name,
          u.name as person_in_charge
        FROM valuations v
        JOIN companies c ON v.company_id = c.id
        JOIN users u ON v.user_id = u.id
        WHERE v.id = ?
      `).get(id) as ValuationWithRelations | undefined;

      if (!valuation) {
        return NextResponse.json(
          { error: 'データが見つかりません' },
          { status: 404 }
        );
      }

      // 財務データを取得
      const financialData = db.prepare(`
        SELECT
          employees,
          total_assets,
          sales,
          current_period_net_asset,
          previous_period_net_asset,
          net_asset_tax_value,
          current_period_profit,
          previous_period_profit,
          previous_previous_period_profit
        FROM financial_data
        WHERE valuation_id = ?
      `).get(id) as Omit<FinancialData, 'id' | 'valuation_id' | 'created_at' | 'updated_at'> | undefined;

      // 投資家データを取得
      const investors = db.prepare(`
        SELECT
          investor_name,
          shares_held,
          shareholding_ratio
        FROM investors
        WHERE valuation_id = ?
      `).all(id) as Pick<DBInvestor, 'investor_name' | 'shares_held' | 'shareholding_ratio'>[];

      const result = {
        id: valuation.id,
        fiscalYear: valuation.fiscal_year,
        companyName: valuation.company_name,
        personInCharge: valuation.person_in_charge,
        employees: financialData?.employees || '',
        totalAssets: financialData?.total_assets || '',
        sales: financialData?.sales || '',
        currentPeriodNetAsset: financialData?.current_period_net_asset || 0,
        previousPeriodNetAsset: financialData?.previous_period_net_asset || 0,
        netAssetTaxValue: financialData?.net_asset_tax_value || 0,
        currentPeriodProfit: financialData?.current_period_profit || 0,
        previousPeriodProfit: financialData?.previous_period_profit || 0,
        previousPreviousPeriodProfit: financialData?.previous_previous_period_profit || 0,
        investors: investors.map((inv) => ({
          name: inv.investor_name,
          amount: inv.shares_held,
        })),
        created_at: valuation.created_at,
        updated_at: valuation.updated_at,
      };

      return NextResponse.json(result);
    } else {
      // 全データを取得
      const valuations = db.prepare(`
        SELECT
          v.id,
          v.fiscal_year,
          v.created_at,
          v.updated_at,
          c.company_name,
          u.name as person_in_charge
        FROM valuations v
        JOIN companies c ON v.company_id = c.id
        JOIN users u ON v.user_id = u.id
        ORDER BY v.updated_at DESC
      `).all() as ValuationWithRelations[];

      const results = valuations.map((valuation) => {
        // 各評価の財務データを取得
        const financialData = db.prepare(`
          SELECT
            employees,
            total_assets,
            sales,
            current_period_net_asset,
            previous_period_net_asset,
            net_asset_tax_value,
            current_period_profit,
            previous_period_profit,
            previous_previous_period_profit
          FROM financial_data
          WHERE valuation_id = ?
        `).get(valuation.id) as Omit<FinancialData, 'id' | 'valuation_id' | 'created_at' | 'updated_at'> | undefined;

        // 各評価の投資家データを取得
        const investors = db.prepare(`
          SELECT
            investor_name,
            shares_held,
            shareholding_ratio
          FROM investors
          WHERE valuation_id = ?
        `).all(valuation.id) as Pick<DBInvestor, 'investor_name' | 'shares_held' | 'shareholding_ratio'>[];

        return {
          id: valuation.id,
          fiscalYear: valuation.fiscal_year,
          companyName: valuation.company_name,
          personInCharge: valuation.person_in_charge,
          employees: financialData?.employees || '',
          totalAssets: financialData?.total_assets || '',
          sales: financialData?.sales || '',
          currentPeriodNetAsset: financialData?.current_period_net_asset || 0,
          previousPeriodNetAsset: financialData?.previous_period_net_asset || 0,
          netAssetTaxValue: financialData?.net_asset_tax_value || 0,
          currentPeriodProfit: financialData?.current_period_profit || 0,
          previousPeriodProfit: financialData?.previous_period_profit || 0,
          previousPreviousPeriodProfit: financialData?.previous_previous_period_profit || 0,
          investors: investors.map((inv) => ({
            name: inv.investor_name,
            amount: inv.shares_held,
          })),
          created_at: valuation.created_at,
          updated_at: valuation.updated_at,
        };
      });

      return NextResponse.json(results);
    }
  }, 'データの取得に失敗しました');
}

export async function DELETE(request: NextRequest) {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'IDが指定されていません' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // データの存在確認
    const existing = db.prepare('SELECT id FROM valuations WHERE id = ?').get(id);

    if (!existing) {
      return NextResponse.json(
        { error: 'データが見つかりません' },
        { status: 404 }
      );
    }

    // 削除
    const stmt = db.prepare('DELETE FROM valuations WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({ success: true, message: 'データを削除しました' });
  }, 'データの削除に失敗しました');
}
