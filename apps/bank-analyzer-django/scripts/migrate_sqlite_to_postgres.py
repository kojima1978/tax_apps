#!/usr/bin/env python
"""
SQLite から PostgreSQL へのデータマイグレーションスクリプト

Usage:
    python scripts/migrate_sqlite_to_postgres.py

環境変数:
    SQLITE_PATH: 移行元SQLiteファイルパス
    DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT: PostgreSQL接続情報
"""
import os
import sys
import django

# Django setup
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bank_project.settings')


def migrate_data():
    """SQLiteからPostgreSQLへデータを移行"""

    # 1. SQLite からデータ読み込み
    print("=== SQLiteからデータ読み込み中 ===")
    os.environ['DB_ENGINE'] = 'sqlite'
    django.setup()

    from analyzer.models import Case, Transaction
    cases = list(Case.objects.all().values())
    transactions = list(Transaction.objects.all().values())
    print(f"読み込み完了: {len(cases)}案件, {len(transactions)}取引")

    # 2. PostgreSQL へマイグレーション実行
    print("\n=== PostgreSQLマイグレーション実行中 ===")
    os.environ['DB_ENGINE'] = 'postgresql'

    # Django再初期化（設定を再読み込み）
    from importlib import reload
    from django.conf import settings
    reload(sys.modules['bank_project.settings'])
    django.setup()

    from django.core.management import call_command
    call_command('migrate', '--noinput')

    # 3. データ投入
    print("\n=== PostgreSQLへデータ投入中 ===")
    from analyzer.models import Case, Transaction

    # Case データ投入
    for case_data in cases:
        Case.objects.update_or_create(
            id=case_data['id'],
            defaults={
                'name': case_data['name'],
                'created_at': case_data['created_at'],
                'updated_at': case_data['updated_at'],
            }
        )
    print(f"Case投入完了: {len(cases)}件")

    # Transaction データ投入（バッチ処理）
    batch_size = 1000
    for i in range(0, len(transactions), batch_size):
        batch = transactions[i:i+batch_size]
        Transaction.objects.bulk_create([
            Transaction(**tx) for tx in batch
        ], ignore_conflicts=True)
        print(f"進捗: {min(i+batch_size, len(transactions))}/{len(transactions)}")

    print(f"\n=== 移行完了: {len(cases)}案件, {len(transactions)}取引 ===")


if __name__ == '__main__':
    try:
        migrate_data()
    except Exception as e:
        print(f"エラー: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
