import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get('fiscalYear');
    const showInactive = searchParams.get('showInactive') === 'true';

    if (fiscalYear) {
      // 特定年度のデータを取得（有効なデータのみ）
      const data = db
        .prepare('SELECT * FROM similar_industry_data WHERE fiscal_year = ? AND is_active = 1')
        .get(fiscalYear);

      if (!data) {
        // データが見つからない場合は令和6年度（2024）のデータをフォールバックとして使用
        const defaultData = db
          .prepare('SELECT * FROM similar_industry_data WHERE fiscal_year = ? AND is_active = 1')
          .get('2024');

        if (defaultData) {
          // 2024年度のデータが存在する場合、それを使用（fiscal_yearは元のまま）
          return NextResponse.json({
            ...defaultData,
            fiscal_year: fiscalYear,
            is_fallback: true, // フォールバックであることを示すフラグ
            fallback_year: '2024',
          });
        } else {
          // 2024年度のデータも存在しない場合は0を返す
          return NextResponse.json({
            fiscal_year: fiscalYear,
            profit_per_share: 0,
            net_asset_per_share: 0,
            average_stock_price: 0,
          });
        }
      }

      return NextResponse.json(data);
    } else {
      // 全年度のデータを取得
      const query = showInactive
        ? 'SELECT * FROM similar_industry_data ORDER BY fiscal_year DESC'
        : 'SELECT * FROM similar_industry_data WHERE is_active = 1 ORDER BY fiscal_year DESC';

      const allData = db.prepare(query).all();
      return NextResponse.json(allData);
    }
  }, '類似業種データの取得に失敗しました');
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const { fiscal_year, profit_per_share, net_asset_per_share, average_stock_price } =
      await request.json();

    if (!fiscal_year) {
      return NextResponse.json(
        { error: '年度を入力してください' },
        { status: 400 }
      );
    }

    if (
      profit_per_share === undefined ||
      net_asset_per_share === undefined ||
      average_stock_price === undefined
    ) {
      return NextResponse.json(
        { error: 'すべての項目を入力してください' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 既存チェック（有効なデータのみ）
    const existing = db
      .prepare('SELECT id FROM similar_industry_data WHERE fiscal_year = ? AND is_active = 1')
      .get(fiscal_year);

    if (existing) {
      return NextResponse.json(
        { error: 'この年度のデータは既に登録されています' },
        { status: 409 }
      );
    }

    // 新規作成
    db.prepare(`
      INSERT INTO similar_industry_data (fiscal_year, profit_per_share, net_asset_per_share, average_stock_price, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(fiscal_year, profit_per_share, net_asset_per_share, average_stock_price);

    return NextResponse.json({
      success: true,
      message: '類似業種データを登録しました',
    });
  }, '類似業種データの登録に失敗しました');
}

export async function PUT(request: NextRequest) {
  return withErrorHandler(async () => {
    const { id, fiscal_year, profit_per_share, net_asset_per_share, average_stock_price } =
      await request.json();

    if (!id || !fiscal_year) {
      return NextResponse.json(
        { error: 'IDと年度を入力してください' },
        { status: 400 }
      );
    }

    if (
      profit_per_share === undefined ||
      net_asset_per_share === undefined ||
      average_stock_price === undefined
    ) {
      return NextResponse.json(
        { error: 'すべての項目を入力してください' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 存在確認
    const existing = db
      .prepare('SELECT id FROM similar_industry_data WHERE id = ?')
      .get(id);

    if (!existing) {
      return NextResponse.json(
        { error: 'データが見つかりません' },
        { status: 404 }
      );
    }

    // 年度の重複チェック（自分以外、有効なデータのみ）
    const duplicate = db
      .prepare('SELECT id FROM similar_industry_data WHERE fiscal_year = ? AND id != ? AND is_active = 1')
      .get(fiscal_year, id);

    if (duplicate) {
      return NextResponse.json(
        { error: 'この年度のデータは既に登録されています' },
        { status: 409 }
      );
    }

    // 更新
    db.prepare(`
      UPDATE similar_industry_data
      SET fiscal_year = ?, profit_per_share = ?, net_asset_per_share = ?, average_stock_price = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(fiscal_year, profit_per_share, net_asset_per_share, average_stock_price, id);

    return NextResponse.json({
      success: true,
      message: '類似業種データを更新しました',
    });
  }, '類似業種データの更新に失敗しました');
}

export async function PATCH(request: NextRequest) {
  return withErrorHandler(async () => {
    const { id, action } = await request.json();

    if (!id || !action) {
      return NextResponse.json(
        { error: 'IDとアクションを指定してください' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    if (action === 'deactivate') {
      // 無効化
      const result = db
        .prepare('UPDATE similar_industry_data SET is_active = 0, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?')
        .run(id);

      if (result.changes === 0) {
        return NextResponse.json(
          { error: 'データが見つかりません' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '類似業種データを無効化しました',
      });
    } else if (action === 'activate') {
      // 有効化
      const result = db
        .prepare('UPDATE similar_industry_data SET is_active = 1, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?')
        .run(id);

      if (result.changes === 0) {
        return NextResponse.json(
          { error: 'データが見つかりません' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '類似業種データを有効化しました',
      });
    } else if (action === 'delete') {
      // 削除（無効化されたデータのみ）
      const record = db
        .prepare('SELECT is_active FROM similar_industry_data WHERE id = ?')
        .get(id) as { is_active: number } | undefined;

      if (!record) {
        return NextResponse.json(
          { error: 'データが見つかりません' },
          { status: 404 }
        );
      }

      if (record.is_active === 1) {
        return NextResponse.json(
          { error: '有効なデータは削除できません。先に無効化してください' },
          { status: 400 }
        );
      }

      const result = db.prepare('DELETE FROM similar_industry_data WHERE id = ?').run(id);

      if (result.changes === 0) {
        return NextResponse.json(
          { error: 'データが見つかりません' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '類似業種データを削除しました',
      });
    } else {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      );
    }
  }, '類似業種データの更新に失敗しました');
}

export async function DELETE(request: NextRequest) {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'IDを指定してください' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 物理削除（無効化されたデータのみ）
    const record = db
      .prepare('SELECT is_active FROM similar_industry_data WHERE id = ?')
      .get(id) as { is_active: number } | undefined;

    if (!record) {
      return NextResponse.json(
        { error: 'データが見つかりません' },
        { status: 404 }
      );
    }

    if (record.is_active === 1) {
      return NextResponse.json(
        { error: '有効なデータは削除できません。先に無効化してください' },
        { status: 400 }
      );
    }

    const result = db.prepare('DELETE FROM similar_industry_data WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'データが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '類似業種データを削除しました',
    });
  }, '類似業種データの削除に失敗しました');
}
