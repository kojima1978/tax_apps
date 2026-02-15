"""
取引サービス

取引データの CRUD 操作、分類、インポートのビジネスロジックを提供する。
"""
import logging
from typing import Optional

import pandas as pd
from django.db import transaction as db_transaction, IntegrityError
from django.db.models import Count

from ..models import Case, Transaction
from ..lib import analyzer, llm_classifier, config
from ..lib.constants import UNCATEGORIZED
from .utils import parse_date_value, parse_int_ids, get_transaction
from .classification import (
    classify_unclassified_transactions,
    match_with_priority,
    calculate_match_score,
)

logger = logging.getLogger(__name__)


class TransactionService:
    """取引データに関するビジネスロジック"""

    # 一括置換が許可されるフィールド
    REPLACEABLE_FIELDS = {'bank_name', 'branch_name', 'account_id'}

    # update_transactionで直接代入するフィールド
    _DIRECT_FIELDS = ('description', 'amount_out', 'amount_in', 'category')
    # update_transactionでstrip()してから代入するフィールド
    _STRIP_FIELDS = ('memo', 'bank_name', 'branch_name', 'account_id', 'account_type')

    # =========================================================================
    # 分類関連
    # =========================================================================

    @staticmethod
    def run_classifier(case: Case) -> int:
        """
        案件の未分類取引に対して自動分類を実行

        Args:
            case: 対象の案件

        Returns:
            更新された取引数
        """
        updates = classify_unclassified_transactions(case, use_fuzzy=True)

        if updates:
            Transaction.objects.bulk_update(updates, ['category', 'classification_score'])
            logger.info(f"自動分類完了: case_id={case.id}, count={len(updates)}")

        return len(updates)

    @staticmethod
    def apply_classification_rules(case: Case) -> int:
        """
        設定画面で定義したキーワードルールを既存取引に適用

        Args:
            case: 対象の案件

        Returns:
            更新された取引数
        """
        updates = classify_unclassified_transactions(case, use_fuzzy=False)

        if updates:
            Transaction.objects.bulk_update(updates, ['category'])
            logger.info(f"ルール適用完了: case_id={case.id}, count={len(updates)}")

        return len(updates)

    @staticmethod
    def get_classification_preview(case: Case) -> list[dict]:
        """
        分類ルール適用のプレビューを取得（実際には適用しない）

        Args:
            case: 対象の案件

        Returns:
            変更候補のリスト
        """
        patterns = config.get_classification_patterns()
        case_patterns = config.get_case_patterns(case)
        txs = case.transactions.filter(category=UNCATEGORIZED).order_by('-date', '-id')

        if not txs.exists():
            return []

        preview = []
        for tx in txs:
            if not tx.description:
                continue

            category, keyword, match_type = match_with_priority(
                tx.description, case_patterns, patterns
            )

            if category:
                score = calculate_match_score(match_type, keyword, tx.description)
                preview.append({
                    'tx_id': tx.id,
                    'date': tx.date,
                    'description': tx.description,
                    'amount_out': tx.amount_out,
                    'amount_in': tx.amount_in,
                    'current_category': tx.category,
                    'proposed_category': category,
                    'matched_keyword': keyword,
                    'match_type': match_type,
                    'score': score,
                })

        return preview

    @staticmethod
    def apply_selected_classifications(case: Case, tx_ids: list[int]) -> int:
        """
        選択された取引に分類を適用

        Args:
            case: 対象の案件
            tx_ids: 適用する取引IDのリスト

        Returns:
            更新された取引数
        """
        if not tx_ids:
            return 0

        patterns = config.get_classification_patterns()
        case_patterns = config.get_case_patterns(case)
        txs = case.transactions.filter(id__in=tx_ids, category=UNCATEGORIZED)

        updates = []
        for tx in txs:
            if not tx.description:
                continue

            category, _, _ = match_with_priority(tx.description, case_patterns, patterns)

            if category:
                tx.category = category
                updates.append(tx)

        if updates:
            Transaction.objects.bulk_update(updates, ['category'])
            logger.info(f"選択分類適用: case_id={case.id}, count={len(updates)}")

        return len(updates)

    @staticmethod
    def apply_ai_suggestion(case: Case, tx_id: int, category: str) -> int:
        """
        AI分類提案を単一の取引に適用

        Args:
            case: 対象の案件
            tx_id: 取引ID
            category: 適用するカテゴリー

        Returns:
            更新された取引数（0または1）
        """
        tx = get_transaction(case, tx_id)
        if not tx:
            return 0

        tx.category = category
        tx.classification_score = 100  # 手動適用は100%
        tx.save(update_fields=['category', 'classification_score'])
        logger.info(f"AI提案適用: case_id={case.id}, tx_id={tx_id}, category={category}")
        return 1

    @staticmethod
    def bulk_apply_ai_suggestions(case: Case, min_score: int = 95) -> int:
        """
        AI分類提案を一括適用（信頼度閾値以上のもの）

        Args:
            case: 対象の案件
            min_score: 最小信頼度スコア（デフォルト95）

        Returns:
            更新された取引数
        """
        fuzzy_config = config.get_fuzzy_config()
        case_patterns = case.custom_patterns or {}
        global_patterns = config.get_classification_patterns()

        txs = case.transactions.filter(category=UNCATEGORIZED)
        if not txs.exists():
            return 0

        updates = []
        for tx in txs:
            if not tx.description:
                continue

            category, score = llm_classifier.classify_by_rules(
                tx.description,
                tx.amount_out or 0,
                tx.amount_in or 0,
                case_patterns=case_patterns,
                global_patterns=global_patterns,
                fuzzy_config=fuzzy_config
            )

            if score >= min_score and category != UNCATEGORIZED:
                tx.category = category
                tx.classification_score = score
                updates.append(tx)

        if updates:
            Transaction.objects.bulk_update(updates, ['category', 'classification_score'])
            logger.info(f"AI提案一括適用: case_id={case.id}, min_score={min_score}, count={len(updates)}")

        return len(updates)

    # =========================================================================
    # CRUD 操作
    # =========================================================================

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
        tx = get_transaction(case, tx_id)
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

        tx_ids = parse_int_ids(list(category_updates.keys()))
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
    def update_transaction(case: Case, tx_id: int, data: dict) -> bool:
        """
        取引データを更新

        Args:
            case: 対象の案件
            tx_id: 取引ID
            data: 更新データ辞書

        Returns:
            更新成功の場合True
        """
        tx = get_transaction(case, tx_id)
        if not tx:
            return False

        date_str = data.get('date')
        if date_str:
            parsed_date = parse_date_value(date_str)
            if parsed_date is None:
                logger.warning(f"日付パースエラー: date_str={date_str}")
                return False
            tx.date = parsed_date

        for field in TransactionService._DIRECT_FIELDS:
            if field in data:
                setattr(tx, field, data[field])

        for field in TransactionService._STRIP_FIELDS:
            value = data.get(field)
            if value is not None:
                setattr(tx, field, value.strip() if value else None)

        if 'balance' in data and data['balance'] is not None:
            tx.balance = data['balance']

        tx.save()
        logger.info(f"取引更新: case_id={case.id}, tx_id={tx_id}")
        return True

    @staticmethod
    def toggle_flag(case: Case, tx_id: int) -> Optional[bool]:
        """
        取引の要確認フラグをトグル

        Args:
            case: 対象の案件
            tx_id: 取引ID

        Returns:
            新しいフラグの状態。取引が見つからない場合はNone
        """
        tx = get_transaction(case, tx_id)
        if not tx:
            return None

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
        tx = get_transaction(case, tx_id)
        if not tx:
            return False

        tx.memo = memo.strip() if memo else None
        tx.save(update_fields=['memo'])
        logger.info(f"メモ更新: case_id={case.id}, tx_id={tx_id}")
        return True

    # =========================================================================
    # 削除操作
    # =========================================================================

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

        int_ids = parse_int_ids(delete_ids)
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

    # =========================================================================
    # 一括置換
    # =========================================================================

    @staticmethod
    def bulk_replace_field_value(
        case: Case,
        field_name: str,
        old_value: str,
        new_value: str
    ) -> int:
        """
        指定フィールドの値を一括置換

        Args:
            case: 対象の案件
            field_name: 対象フィールド名
            old_value: 置換前の値
            new_value: 置換後の値

        Returns:
            更新された取引数
        """
        if field_name not in TransactionService.REPLACEABLE_FIELDS:
            logger.warning(f"不正なフィールド名: {field_name}")
            return 0

        if not old_value or old_value == new_value:
            return 0

        filter_kwargs = {field_name: old_value}
        count = case.transactions.filter(**filter_kwargs).update(**{field_name: new_value})

        logger.info(
            f"一括置換完了: case_id={case.id}, field={field_name}, "
            f"old='{old_value}' -> new='{new_value}', count={count}"
        )
        return count

    @staticmethod
    def get_unique_field_values(case: Case, field_name: str) -> list[dict]:
        """
        指定フィールドのユニーク値と件数を取得

        Args:
            case: 対象の案件
            field_name: 対象フィールド名

        Returns:
            [{'value': 値, 'count': 件数}, ...] のリスト
        """
        if field_name not in TransactionService.REPLACEABLE_FIELDS:
            return []

        qs = (
            case.transactions
            .values(field_name)
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        return [
            {'value': item[field_name], 'count': item['count']}
            for item in qs
            if item[field_name]  # 空値は除外
        ]

    # =========================================================================
    # その他
    # =========================================================================

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

    # =========================================================================
    # インポート
    # =========================================================================

    @staticmethod
    def import_from_json(data: dict, restore_settings: bool = False) -> tuple[Case, int]:
        """
        JSONバックアップデータから案件と取引を復元

        Args:
            data: パース済みJSONデータ
            restore_settings: 設定も復元するか

        Returns:
            (作成された案件, インポートされた取引数) のタプル

        Raises:
            ValueError: バージョン不正・案件名生成失敗時
        """
        version = data.get('version', '1.0')
        if version not in ['1.0']:
            raise ValueError(f"未対応のバージョン: {version}")

        case_data = data.get('case', {})
        original_name = case_data.get('name', 'インポート案件')

        # 案件作成（重複名はリトライ）
        case_name = original_name
        counter = 0
        max_retries = 100
        new_case = None
        while new_case is None and counter < max_retries:
            try:
                with db_transaction.atomic():
                    new_case = Case.objects.create(name=case_name)
            except IntegrityError:
                counter += 1
                case_name = f"{original_name}_復元{counter}"

        if new_case is None:
            raise ValueError("案件名の生成に失敗しました。別の名前でインポートしてください。")

        with db_transaction.atomic():
            transactions_data = data.get('transactions', [])
            new_transactions = []

            for tx_data in transactions_data:
                date_val = parse_date_value(tx_data.get('date'))

                new_transactions.append(Transaction(
                    case=new_case,
                    date=date_val,
                    description=tx_data.get('description'),
                    amount_out=tx_data.get('amount_out', 0),
                    amount_in=tx_data.get('amount_in', 0),
                    balance=tx_data.get('balance'),
                    account_id=tx_data.get('account_id'),
                    holder=tx_data.get('holder'),
                    bank_name=tx_data.get('bank_name'),
                    branch_name=tx_data.get('branch_name'),
                    account_type=tx_data.get('account_type'),
                    is_large=tx_data.get('is_large', False),
                    is_transfer=tx_data.get('is_transfer', False),
                    transfer_to=tx_data.get('transfer_to'),
                    category=tx_data.get('category', UNCATEGORIZED),
                    is_flagged=tx_data.get('is_flagged', False),
                    memo=tx_data.get('memo'),
                ))

            if new_transactions:
                Transaction.objects.bulk_create(new_transactions)

            if restore_settings and 'settings' in data:
                config.save_user_settings(data['settings'])
                logger.info("設定データを復元しました")

        logger.info(f"JSONインポート完了: case_id={new_case.pk}, name={case_name}, transactions={len(new_transactions)}")
        return new_case, len(new_transactions)

    @staticmethod
    def commit_import(case: Case, rows: list[dict]) -> int:
        """
        プレビュー確認済みの取引データをインポート確定

        Args:
            case: 対象の案件
            rows: 取引データのリスト

        Returns:
            インポートされた取引数
        """
        df = pd.DataFrame(rows)
        df['date'] = pd.to_datetime(df['date'])

        # 分類・大口検出
        case_patterns = case.custom_patterns or {}
        global_patterns = config.get_classification_patterns()
        df = llm_classifier.classify_transactions(
            df,
            case_patterns=case_patterns,
            global_patterns=global_patterns
        )
        df = analyzer.analyze_large_amounts(df)

        with db_transaction.atomic():
            new_transactions = []
            for _, row in df.iterrows():
                dt = parse_date_value(row['date'])

                new_transactions.append(Transaction(
                    case=case,
                    date=dt,
                    description=row['description'],
                    amount_out=row.get('amount_out', 0),
                    amount_in=row.get('amount_in', 0),
                    balance=row.get('balance', 0) if pd.notna(row['balance']) else None,
                    account_id=str(row.get('account_number', 'unknown')),
                    is_large=row.get('is_large', False),
                    category=row.get('category'),
                    branch_name=row.get('branch_name'),
                    bank_name=row.get('bank_name'),
                    account_type=row.get('account_type'),
                ))

            Transaction.objects.bulk_create(new_transactions)

            # 資金移動の再分析
            all_tx = pd.DataFrame(list(case.transactions.all().values()))
            if not all_tx.empty:
                analyzed_df = analyzer.analyze_transfers(all_tx)
                updates = []
                for _, row in analyzed_df.iterrows():
                    if row.get('is_transfer'):
                        updates.append(Transaction(
                            id=row['id'],
                            is_transfer=True,
                            transfer_to=row['transfer_to']
                        ))
                if updates:
                    Transaction.objects.bulk_update(updates, ['is_transfer', 'transfer_to'])

        logger.info(f"取引インポート確定: case_id={case.id}, count={len(new_transactions)}")
        return len(new_transactions)
