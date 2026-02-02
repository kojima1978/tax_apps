"""
ビジネスロジックを集約したサービス層

ビューからビジネスロジックを分離し、再利用性とテスト容易性を向上させる。
"""
import logging
from typing import Optional

import pandas as pd
from django.db import transaction

from .models import Case, Transaction
from .lib import analyzer, llm_classifier, config

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
        memo: Optional[str] = None,
        bank_name: Optional[str] = None,
        branch_name: Optional[str] = None,
        account_id: Optional[str] = None,
        account_type: Optional[str] = None,
        balance: Optional[int] = None
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
            bank_name: 銀行名
            branch_name: 支店名
            account_id: 口座番号
            account_type: 種別
            balance: 残高

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
        if bank_name is not None:
            tx.bank_name = bank_name.strip() if bank_name else None
        if branch_name is not None:
            tx.branch_name = branch_name.strip() if branch_name else None
        if account_id is not None:
            tx.account_id = account_id.strip() if account_id else None
        if account_type is not None:
            tx.account_type = account_type.strip() if account_type else None
        if balance is not None:
            tx.balance = balance
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
    def delete_by_range(case: Case, start_id: int, end_id: int) -> int:
        """
        ID範囲で取引を削除

        Args:
            case: 対象の案件
            start_id: 開始ID（含む）
            end_id: 終了ID（含む）

        Returns:
            削除された取引数
        """
        if start_id > end_id:
            start_id, end_id = end_id, start_id

        count, _ = case.transactions.filter(id__gte=start_id, id__lte=end_id).delete()
        logger.info(f"ID範囲削除: case_id={case.id}, start_id={start_id}, end_id={end_id}, count={count}")
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

    @staticmethod
    def apply_classification_rules(case: Case) -> int:
        """
        設定画面で定義したキーワードルールを既存取引に適用

        Args:
            case: 対象の案件

        Returns:
            更新された取引数
        """
        patterns = config.get_classification_patterns()
        txs = case.transactions.filter(category='未分類')

        if not txs.exists():
            return 0

        updates = []
        for tx in txs:
            if not tx.description:
                continue

            desc_lower = tx.description.lower()
            for category, keywords in patterns.items():
                for keyword in keywords:
                    if keyword.lower() in desc_lower:
                        tx.category = category
                        updates.append(tx)
                        break
                if tx in updates:
                    break

        if updates:
            Transaction.objects.bulk_update(updates, ['category'])
            logger.info(f"ルール適用完了: case_id={case.id}, count={len(updates)}")

        return len(updates)


class AnalysisService:
    """分析機能に関するビジネスロジック"""

    STANDARD_CATEGORIES = [
        "生活費", "給与", "贈与", "事業・不動産", "関連会社", "銀行", "証券・株式", "保険会社", "通帳間移動", "その他", "未分類"
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

        # 資金移動データ（ペアで取得）
        analyzed_df = analyzer.analyze_transfers(df.copy())
        transfers_df = AnalysisService._convert_amounts_to_int(
            analyzed_df[analyzed_df['is_transfer']].copy()
        )
        transfer_pairs = AnalysisService._get_transfer_pairs(transfers_df)

        # 資金移動の分類フィルター（出金元または移動先のいずれかがマッチすれば表示）
        if filter_state.get('transfer_category'):
            filter_cats = filter_state['transfer_category']
            if filter_state.get('transfer_category_mode') == 'exclude':
                transfer_pairs = [
                    pair for pair in transfer_pairs
                    if (pair['source'].get('category') not in filter_cats and
                        (not pair['destination'] or pair['destination'].get('category') not in filter_cats))
                ]
            else:
                transfer_pairs = [
                    pair for pair in transfer_pairs
                    if (pair['source'].get('category') in filter_cats or
                        (pair['destination'] and pair['destination'].get('category') in filter_cats))
                ]

        # 多額取引
        large_df = df[df['is_large']].copy()
        # 多額取引の分類フィルター
        if filter_state.get('large_category'):
            if filter_state.get('large_category_mode') == 'exclude':
                large_df = large_df[~large_df['category'].isin(filter_state['large_category'])]
            else:
                large_df = large_df[large_df['category'].isin(filter_state['large_category'])]
        large_df = AnalysisService._convert_amounts_to_int(
            large_df.sort_values('date', ascending=True).copy()
        )
        large_txs = large_df.to_dict(orient='records')

        # フィルター処理
        filtered_txs = transactions
        if filter_state.get('bank'):
            filtered_txs = filtered_txs.filter(bank_name__in=filter_state['bank'])
        if filter_state.get('account'):
            filtered_txs = filtered_txs.filter(account_id__in=filter_state['account'])
        if filter_state.get('category'):
            if filter_state.get('category_mode') == 'exclude':
                filtered_txs = filtered_txs.exclude(category__in=filter_state['category'])
            else:
                filtered_txs = filtered_txs.filter(category__in=filter_state['category'])
        if filter_state.get('keyword'):
            filtered_txs = filtered_txs.filter(description__icontains=filter_state['keyword'])

        # 日付フィルター
        if filter_state.get('date_from'):
            filtered_txs = filtered_txs.filter(date__gte=filter_state['date_from'])
        if filter_state.get('date_to'):
            filtered_txs = filtered_txs.filter(date__lte=filter_state['date_to'])

        # 金額フィルター
        amount_type = filter_state.get('amount_type', 'both')
        amount_min_str = filter_state.get('amount_min', '')
        amount_max_str = filter_state.get('amount_max', '')

        # 金額の最小値・最大値をパース
        try:
            amount_min = int(amount_min_str.replace(',', '')) if amount_min_str else None
        except (ValueError, AttributeError):
            amount_min = None
        try:
            amount_max = int(amount_max_str.replace(',', '')) if amount_max_str else None
        except (ValueError, AttributeError):
            amount_max = None

        # 取引種別でフィルター（出金のみ、入金のみ、両方）
        if amount_type == 'out':
            filtered_txs = filtered_txs.filter(amount_out__gt=0)
        elif amount_type == 'in':
            filtered_txs = filtered_txs.filter(amount_in__gt=0)

        # 金額範囲でフィルター
        if amount_min is not None or amount_max is not None:
            from django.db.models import Q, F, Case, When, Value, IntegerField
            from django.db.models.functions import Greatest

            # 取引種別に応じて対象金額を決定
            if amount_type == 'out':
                if amount_min is not None:
                    filtered_txs = filtered_txs.filter(amount_out__gte=amount_min)
                if amount_max is not None:
                    filtered_txs = filtered_txs.filter(amount_out__lte=amount_max)
            elif amount_type == 'in':
                if amount_min is not None:
                    filtered_txs = filtered_txs.filter(amount_in__gte=amount_min)
                if amount_max is not None:
                    filtered_txs = filtered_txs.filter(amount_in__lte=amount_max)
            else:
                # 両方の場合：出金または入金のいずれかが範囲内
                if amount_min is not None and amount_max is not None:
                    filtered_txs = filtered_txs.filter(
                        Q(amount_out__gte=amount_min, amount_out__lte=amount_max) |
                        Q(amount_in__gte=amount_min, amount_in__lte=amount_max)
                    )
                elif amount_min is not None:
                    filtered_txs = filtered_txs.filter(
                        Q(amount_out__gte=amount_min) | Q(amount_in__gte=amount_min)
                    )
                elif amount_max is not None:
                    filtered_txs = filtered_txs.filter(
                        Q(amount_out__gt=0, amount_out__lte=amount_max) |
                        Q(amount_in__gt=0, amount_in__lte=amount_max)
                    )

        # 多額取引のみフィルター
        if filter_state.get('large_only'):
            filtered_txs = filtered_txs.filter(is_large=True)

        # フィルタードロップダウン用のユニークリストを取得
        banks = sorted([b for b in df['bank_name'].dropna().unique() if b])
        branches = sorted([b for b in df['branch_name'].dropna().unique() if b])
        accounts = sorted([a for a in df['account_id'].dropna().unique() if a])
        existing_categories = df['category'].dropna().unique().tolist()
        categories = sorted(set(existing_categories + AnalysisService.STANDARD_CATEGORIES))

        # 付箋付き取引
        flagged_txs = transactions.filter(is_flagged=True)

        return {
            'account_summary': account_summary_list,
            'transfer_pairs': transfer_pairs,
            'large_txs': large_txs,
            'all_txs': filtered_txs,
            'duplicate_txs': duplicate_txs,
            'flagged_txs': flagged_txs,
            'banks': banks,
            'branches': branches,
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
    def _get_transfer_pairs(transfers_df: pd.DataFrame) -> list:
        """資金移動のペアデータを生成（出金元・移動先をセットで返す）"""
        if transfers_df.empty:
            return []

        transfer_pairs = []
        out_txs = transfers_df[transfers_df['amount_out'] > 0]
        in_txs = transfers_df[transfers_df['amount_in'] > 0]

        for _, out_row in out_txs.iterrows():
            transfer_to = out_row.get('transfer_to', '')
            # transfer_toから口座IDと日付を抽出: "1234567 (2024-01-15)"
            dest_account_id = transfer_to.split(' ')[0] if transfer_to else None

            # 対応する入金側を探す
            dest_row = None
            if dest_account_id:
                matching = in_txs[in_txs['account_id'] == dest_account_id]
                if not matching.empty:
                    # 金額が近いものを探す
                    for _, candidate in matching.iterrows():
                        if abs(candidate['amount_in'] - out_row['amount_out']) <= 1000:
                            dest_row = candidate
                            break

            pair = {
                'source': {
                    'id': out_row.get('id'),
                    'date': out_row['date'],
                    'bank_name': out_row.get('bank_name', ''),
                    'branch_name': out_row.get('branch_name', ''),
                    'account_id': out_row.get('account_id', ''),
                    'amount': out_row['amount_out'],
                    'description': out_row.get('description', ''),
                    'category': out_row.get('category', '未分類')
                },
                'destination': None
            }

            if dest_row is not None:
                pair['destination'] = {
                    'id': dest_row.get('id'),
                    'date': dest_row['date'],
                    'bank_name': dest_row.get('bank_name', ''),
                    'branch_name': dest_row.get('branch_name', ''),
                    'account_id': dest_row.get('account_id', ''),
                    'amount': dest_row['amount_in'],
                    'description': dest_row.get('description', ''),
                    'category': dest_row.get('category', '未分類')
                }

            transfer_pairs.append(pair)

        return transfer_pairs
