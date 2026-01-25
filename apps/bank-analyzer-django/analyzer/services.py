"""
ビジネスロジックを集約したサービス層

ビューからビジネスロジックを分離し、再利用性とテスト容易性を向上させる。
"""
import logging
from typing import Optional

import pandas as pd
from django.db import transaction

from .models import Case, Transaction
from .lib import analyzer, llm_classifier

logger = logging.getLogger(__name__)


def _parse_int_ids(ids: list[str]) -> list[int] | None:
    """
    文字列IDリストを整数リストに変換

    Args:
        ids: 文字列のIDリスト

    Returns:
        整数のIDリスト、変換失敗時はNone
    """
    try:
        return [int(id_str) for id_str in ids]
    except (ValueError, TypeError):
        return None


class TransactionService:
    """取引データに関するビジネスロジック"""

    @staticmethod
    def run_classifier(case: Case) -> int:
        """
        案件の全取引に対して自動分類を実行

        Args:
            case: 対象の案件

        Returns:
            更新された取引数
        """
        txs = case.transactions.all()
        if not txs.exists():
            return 0

        df = pd.DataFrame(list(txs.values()))
        df['date'] = pd.to_datetime(df['date'])

        df = llm_classifier.classify_transactions(df)

        updates = [
            Transaction(id=row['id'], category=row['category'])
            for _, row in df.iterrows()
        ]

        Transaction.objects.bulk_update(updates, ['category'])
        logger.info(f"自動分類完了: case_id={case.id}, count={len(updates)}")
        return len(updates)

    @staticmethod
    def delete_account_transactions(case: Case, account_id: str) -> int:
        """
        指定口座の取引を削除

        Args:
            case: 対象の案件
            account_id: 削除対象の口座ID

        Returns:
            削除された取引数
        """
        count, _ = case.transactions.filter(account_id=account_id).delete()
        logger.info(f"口座データ削除: case_id={case.id}, account_id={account_id}, count={count}")
        return count

    @staticmethod
    def update_transaction_category(
        case: Case,
        tx_id: int,
        new_category: str,
        apply_all: bool = False
    ) -> int:
        """
        取引の分類を更新

        Args:
            case: 対象の案件
            tx_id: 取引ID
            new_category: 新しいカテゴリー
            apply_all: 同じ摘要の取引すべてに適用するか

        Returns:
            更新された取引数
        """
        tx = case.transactions.filter(pk=tx_id).first()
        if not tx:
            return 0

        if apply_all:
            count = case.transactions.filter(description=tx.description).update(category=new_category)
            logger.info(f"一括カテゴリー更新: case_id={case.id}, description={tx.description}, count={count}")
            return count
        else:
            tx.category = new_category
            tx.save()
            logger.info(f"カテゴリー更新: case_id={case.id}, tx_id={tx_id}")
            return 1

    @staticmethod
    def bulk_update_categories(case: Case, category_updates: dict[str, str]) -> int:
        """
        複数取引のカテゴリーを一括更新

        Args:
            case: 対象の案件
            category_updates: {取引ID: 新カテゴリー} の辞書

        Returns:
            更新された取引数
        """
        if not category_updates:
            return 0

        # IDをintに変換（安全のため）
        tx_ids = _parse_int_ids(list(category_updates.keys()))
        if tx_ids is None:
            logger.warning(f"不正な取引ID: {list(category_updates.keys())}")
            return 0

        transactions_to_update = list(
            case.transactions.filter(id__in=tx_ids).only('id', 'category')
        )

        updates = []
        for tx in transactions_to_update:
            new_category = category_updates.get(str(tx.id))
            if new_category and tx.category != new_category:
                tx.category = new_category
                updates.append(tx)

        if updates:
            Transaction.objects.bulk_update(updates, ['category'])
            logger.info(f"一括カテゴリー更新: case_id={case.id}, count={len(updates)}")

        return len(updates)

    @staticmethod
    def update_transaction(
        case: Case,
        tx_id: int,
        date_str: Optional[str],
        description: Optional[str],
        amount_out: int,
        amount_in: int,
        category: Optional[str],
        memo: Optional[str] = None
    ) -> bool:
        """
        取引データを更新

        Args:
            case: 対象の案件
            tx_id: 取引ID
            date_str: 日付文字列
            description: 摘要
            amount_out: 出金額
            amount_in: 入金額
            category: カテゴリー
            memo: メモ

        Returns:
            更新成功の場合True
        """
        tx = case.transactions.filter(pk=tx_id).first()
        if not tx:
            return False

        if date_str:
            tx.date = pd.to_datetime(date_str).date()
        tx.description = description
        tx.amount_out = amount_out
        tx.amount_in = amount_in
        tx.category = category
        tx.memo = memo.strip() if memo else None
        tx.save()

        logger.info(f"取引更新: case_id={case.id}, tx_id={tx_id}")
        return True

    @staticmethod
    def delete_duplicates(case: Case, delete_ids: list[str]) -> int:
        """
        重複取引を削除

        Args:
            case: 対象の案件
            delete_ids: 削除対象の取引IDリスト

        Returns:
            削除された取引数
        """
        if not delete_ids:
            return 0

        # IDをintに変換（安全のため）
        int_ids = _parse_int_ids(delete_ids)
        if int_ids is None:
            logger.warning(f"不正な取引ID: {delete_ids}")
            return 0

        count, _ = case.transactions.filter(id__in=int_ids).delete()
        logger.info(f"重複データ削除: case_id={case.id}, count={count}")
        return count

    @staticmethod
    def toggle_flag(case: Case, tx_id: int) -> bool:
        """
        取引の要確認フラグをトグル

        Args:
            case: 対象の案件
            tx_id: 取引ID

        Returns:
            新しいフラグの状態
        """
        tx = case.transactions.filter(pk=tx_id).first()
        if not tx:
            return False

        tx.is_flagged = not tx.is_flagged
        tx.save(update_fields=['is_flagged'])
        logger.info(f"フラグ更新: case_id={case.id}, tx_id={tx_id}, flagged={tx.is_flagged}")
        return tx.is_flagged

    @staticmethod
    def update_memo(case: Case, tx_id: int, memo: str) -> bool:
        """
        取引のメモを更新

        Args:
            case: 対象の案件
            tx_id: 取引ID
            memo: メモ内容

        Returns:
            更新成功の場合True
        """
        tx = case.transactions.filter(pk=tx_id).first()
        if not tx:
            return False

        tx.memo = memo.strip() if memo else None
        tx.save(update_fields=['memo'])
        logger.info(f"メモ更新: case_id={case.id}, tx_id={tx_id}")
        return True

    @staticmethod
    def get_flagged_transactions(case: Case):
        """
        要確認フラグが付いた取引を取得

        Args:
            case: 対象の案件

        Returns:
            フラグ付き取引のQuerySet
        """
        return case.transactions.filter(is_flagged=True).order_by('date', 'id')


class AnalysisService:
    """分析機能に関するビジネスロジック"""

    STANDARD_CATEGORIES = [
        "生活費", "贈与", "事業", "関連会社", "銀行", "証券会社", "保険会社", "その他", "未分類"
    ]

    @staticmethod
    def get_analysis_data(case: Case, filter_state: dict) -> dict:
        """
        分析ダッシュボード用のデータを取得

        Args:
            case: 対象の案件
            filter_state: フィルター条件

        Returns:
            分析データの辞書
        """
        transactions = case.transactions.all().order_by('date', 'id')

        if not transactions.exists():
            return {'no_data': True}

        df = pd.DataFrame(list(transactions.values()))

        # 重複データ検出
        duplicate_txs = AnalysisService._get_duplicate_transactions(df)

        # 口座サマリー
        account_summary = df.groupby(['account_id', 'holder']).agg({
            'id': 'count',
            'date': 'max'
        }).reset_index().rename(columns={'id': 'count', 'date': 'last_date'})
        account_summary_list = account_summary.to_dict(orient='records')

        # 資金移動データ
        analyzed_df = analyzer.analyze_transfers(df.copy())
        transfers_df = AnalysisService._convert_amounts_to_int(
            analyzed_df[analyzed_df['is_transfer']].copy()
        )
        transfer_pairs = AnalysisService._get_transfer_chart_data(transfers_df)

        # 多額取引
        large_df = AnalysisService._convert_amounts_to_int(
            df[df['is_large']].sort_values('date', ascending=True).copy()
        )
        large_txs = large_df.to_dict(orient='records')

        # フィルター処理
        filtered_txs = transactions
        if filter_state.get('bank'):
            filtered_txs = filtered_txs.filter(bank_name__in=filter_state['bank'])
        if filter_state.get('account'):
            filtered_txs = filtered_txs.filter(account_id__in=filter_state['account'])
        if filter_state.get('category'):
            filtered_txs = filtered_txs.filter(category__in=filter_state['category'])
        if filter_state.get('keyword'):
            filtered_txs = filtered_txs.filter(description__icontains=filter_state['keyword'])

        # フィルタードロップダウン用のユニークリストを取得
        banks = sorted([b for b in df['bank_name'].dropna().unique() if b])
        accounts = df['account_id'].unique().tolist()
        existing_categories = df['category'].dropna().unique().tolist()
        categories = sorted(set(existing_categories + AnalysisService.STANDARD_CATEGORIES))

        # 付箋付き取引
        flagged_txs = transactions.filter(is_flagged=True)

        return {
            'account_summary': account_summary_list,
            'transfer_pairs': transfer_pairs,
            'transfer_list': transfers_df.to_dict(orient='records'),
            'large_txs': large_txs,
            'all_txs': filtered_txs,
            'duplicate_txs': duplicate_txs,
            'flagged_txs': flagged_txs,
            'banks': banks,
            'accounts': accounts,
            'categories': categories,
        }

    @staticmethod
    def _convert_amounts_to_int(df: pd.DataFrame) -> pd.DataFrame:
        """DataFrameの金額カラムをPython intに変換（NaN→0）"""
        for col in ['amount_out', 'amount_in']:
            if col in df.columns:
                df[col] = df[col].fillna(0).astype(int)
        return df

    @staticmethod
    def _get_duplicate_transactions(df: pd.DataFrame) -> list:
        """重複取引を検出してリストで返す"""
        dup_cols = ['date', 'amount_out', 'amount_in', 'description', 'account_id']
        if not all(col in df.columns for col in dup_cols):
            return []

        duplicates_mask = df.duplicated(subset=dup_cols, keep=False)
        dup_df = AnalysisService._convert_amounts_to_int(
            df[duplicates_mask].sort_values(by=dup_cols).copy()
        )
        return dup_df.to_dict(orient='records')

    @staticmethod
    def _get_transfer_chart_data(transfers_df: pd.DataFrame) -> list:
        """資金移動チャート用のデータを生成"""
        if transfers_df.empty:
            return []

        transfer_pairs = []
        out_txs = transfers_df[transfers_df['amount_out'] > 0]
        for _, row in out_txs.iterrows():
            transfer_to = row.get('transfer_to', '')
            label = f"{row['account_id']} → {transfer_to.split(' ')[0] if transfer_to else '?'}"
            transfer_pairs.append({
                'date': row['date'].strftime('%Y-%m-%d') if pd.notna(row['date']) else '',
                'amount': row['amount_out'],
                'label': label,
                'description': row['description']
            })
        return transfer_pairs
