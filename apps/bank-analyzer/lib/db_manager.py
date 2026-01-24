import sqlite3
import pandas as pd
import os
import shutil
import logging
from . import config

logger = logging.getLogger(__name__)


def get_case_db_path(case_name: str) -> str:
    case_dir = os.path.join(config.DATA_DIR, case_name)
    os.makedirs(case_dir, exist_ok=True)
    return os.path.join(case_dir, "transactions.db")


def _run_migrations(cursor: sqlite3.Cursor) -> None:
    """DBマイグレーションを実行"""
    try:
        cursor.execute("SELECT category FROM transactions LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE transactions ADD COLUMN category TEXT")
        logger.info("Migration: categoryカラムを追加しました")


def create_case(case_name: str) -> bool:
    """新規案件を作成（フォルダとDBを作成）"""
    case_dir = os.path.join(config.DATA_DIR, case_name)
    if os.path.exists(case_dir):
        return False

    try:
        init_db(case_name)
        return True
    except Exception as e:
        logger.error(f"案件作成エラー: {e}")
        return False


def init_db(case_name: str):
    db_path = get_case_db_path(case_name)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        description TEXT,
        amount_out INTEGER DEFAULT 0,
        amount_in INTEGER DEFAULT 0,
        balance INTEGER,
        account_id TEXT,
        holder TEXT,
        is_large BOOLEAN DEFAULT 0,
        is_transfer BOOLEAN DEFAULT 0,
        transfer_to TEXT,
        category TEXT
    )
    """)

    _run_migrations(cursor)

    conn.commit()
    conn.close()


def save_transactions(case_name: str, df: pd.DataFrame):
    db_path = get_case_db_path(case_name)
    conn = sqlite3.connect(db_path)
    conn.text_factory = str

    cursor = conn.cursor()
    _run_migrations(cursor)

    # 既存データを削除して洗い替え（シンプル運用のため）
    cursor.execute("DELETE FROM transactions")

    df.to_sql("transactions", conn, if_exists="append", index=False)
    conn.commit()
    conn.close()


def load_transactions(case_name: str) -> pd.DataFrame:
    db_path = get_case_db_path(case_name)
    if not os.path.exists(db_path):
        return pd.DataFrame()

    conn = sqlite3.connect(db_path)
    conn.text_factory = str
    df = pd.read_sql("SELECT * FROM transactions", conn)
    conn.close()

    if 'date' in df.columns and len(df) > 0:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')

    return df


def get_all_cases() -> list[str]:
    if not os.path.exists(config.DATA_DIR):
        return []
    return [d for d in os.listdir(config.DATA_DIR) if os.path.isdir(os.path.join(config.DATA_DIR, d))]


def delete_case(case_name: str) -> bool:
    """案件全体を削除する（フォルダごと削除）"""
    case_dir = os.path.join(config.DATA_DIR, case_name)
    if os.path.exists(case_dir):
        try:
            shutil.rmtree(case_dir)
            return True
        except OSError as e:
            logger.error(f"案件削除エラー: {e}")
            return False
    return False


def delete_account_transactions(case_name: str, account_id: str) -> bool:
    """特定の口座の取引データを削除する"""
    db_path = get_case_db_path(case_name)
    if not os.path.exists(db_path):
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE account_id = ?", (account_id,))
        conn.commit()
        deleted_count = cursor.rowcount
        conn.close()
        return deleted_count > 0
    except sqlite3.Error as e:
        logger.error(f"口座削除エラー: {e}")
        return False


def update_transaction_category(case_name: str, transaction_id: int, new_category: str) -> bool:
    """取引のカテゴリを更新"""
    db_path = get_case_db_path(case_name)
    if not os.path.exists(db_path):
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        if hasattr(transaction_id, 'item'):
            transaction_id = transaction_id.item()

        cursor.execute("""
            UPDATE transactions
            SET category = ?
            WHERE id = ?
        """, (new_category, transaction_id))
        conn.commit()
        row_count = cursor.rowcount
        conn.close()
        return row_count > 0
    except sqlite3.Error as e:
        logger.error(f"カテゴリ更新エラー: {e}")
        return False
