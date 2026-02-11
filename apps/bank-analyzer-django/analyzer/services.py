"""
ビジネスロジックを集約したサービス層

ビューからビジネスロジックを分離し、再利用性とテスト容易性を向上させる。
"""
import logging
from datetime import date, datetime
from typing import Optional

import pandas as pd
from django.db import transaction as db_transaction, IntegrityError
from django.db.models import Count, Q

from .models import Case, Transaction
from .lib import analyzer, llm_classifier, config
from .lib.constants import UNCATEGORIZED, STANDARD_CATEGORIES

logger = logging.getLogger(__name__)


def _parse_date_value(date_input) -> date | None:
    """様々な形式の日付入力をdate型に変換する共通処理"""
    if date_input is None or (isinstance(date_input, float) and pd.isna(date_input)):
        return None
    if isinstance(date_input, str):
        try:
            return datetime.fromisoformat(date_input).date()
        except (ValueError, TypeError):
            try:
                return pd.to_datetime(date_input).date()
            except (ValueError, TypeError):
                return None
    if hasattr(date_input, 'date'):
        return date_input.date() if pd.notna(date_input) else None
    return None


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


def _get_transaction(case: Case, tx_id: int) -> Optional[Transaction]:
    """案件内の取引をIDで取得（見つからない場合はNone）"""
    return case.transactions.filter(pk=tx_id).first()


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

        # 全件メモリに載せる（DATA_UPLOAD_MAX_NUMBER_FIELDS=50000の制約下では実用上問題なし）
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
        tx = _get_transaction(case, tx_id)
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

    # 一括置換が許可されるフィールド
    REPLACEABLE_FIELDS = {'bank_name', 'branch_name', 'account_id'}

    # update_transactionで直接代入するフィールド
    _DIRECT_FIELDS = ('description', 'amount_out', 'amount_in', 'category')
    # update_transactionでstrip()してから代入するフィールド（Noneの場合はスキップ）
    _STRIP_FIELDS = ('memo', 'bank_name', 'branch_name', 'account_id', 'account_type')

    @staticmethod
    def update_transaction(case: Case, tx_id: int, data: dict) -> bool:
        """
        取引データを更新

        Args:
            case: 対象の案件
            tx_id: 取引ID
            data: 更新データ辞書（date, description, amount_out, amount_in,
                  category, memo, bank_name, branch_name, account_id,
                  account_type, balance）

        Returns:
            更新成功の場合True
        """
        tx = _get_transaction(case, tx_id)
        if not tx:
            return False

        date_str = data.get('date')
        if date_str:
            parsed_date = _parse_date_value(date_str)
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
    def toggle_flag(case: Case, tx_id: int) -> Optional[bool]:
        """
        取引の要確認フラグをトグル

        Args:
            case: 対象の案件
            tx_id: 取引ID

        Returns:
            新しいフラグの状態。取引が見つからない場合はNone
        """
        tx = _get_transaction(case, tx_id)
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
        tx = _get_transaction(case, tx_id)
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
        txs = case.transactions.filter(category=UNCATEGORIZED)

        if not txs.exists():
            return 0

        updates = []
        updated_ids = set()
        for tx in txs:
            if not tx.description:
                continue

            desc_lower = tx.description.lower()
            for category, keywords in patterns.items():
                for keyword in keywords:
                    if keyword.lower() in desc_lower:
                        tx.category = category
                        updates.append(tx)
                        updated_ids.add(tx.id)
                        break
                if tx.id in updated_ids:
                    break

        if updates:
            Transaction.objects.bulk_update(updates, ['category'])
            logger.info(f"ルール適用完了: case_id={case.id}, count={len(updates)}")

        return len(updates)

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
            field_name: 対象フィールド名（bank_name, branch_name, account_id）
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

        # 対象取引を検索
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

        result = []
        for item in qs:
            value = item[field_name]
            if value:  # 空値は除外
                result.append({
                    'value': value,
                    'count': item['count']
                })

        return result

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
                date_val = _parse_date_value(tx_data.get('date'))

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
            rows: 取引データのリスト（date, description, amount_out, amount_in, balance等）

        Returns:
            インポートされた取引数
        """
        df = pd.DataFrame(rows)
        df['date'] = pd.to_datetime(df['date'])

        # 分類・大口検出
        df = llm_classifier.classify_transactions(df)
        df = analyzer.analyze_large_amounts(df)

        with db_transaction.atomic():
            new_transactions = []
            for _, row in df.iterrows():
                dt = _parse_date_value(row['date'])

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


class AnalysisService:
    """分析機能に関するビジネスロジック"""

    STANDARD_CATEGORIES = STANDARD_CATEGORIES

    @staticmethod
    def _parse_amount_str(value: str) -> int | None:
        """金額文字列を整数に変換（変換失敗時はNone）"""
        try:
            return int(value.replace(',', '')) if value else None
        except (ValueError, AttributeError):
            return None

    @staticmethod
    def _apply_amount_filters(queryset, amount_type: str, amount_min: int | None, amount_max: int | None):
        """金額関連のフィルターをQuerySetに適用する"""
        # 取引種別でフィルター（出金のみ、入金のみ、両方）
        if amount_type == 'out':
            queryset = queryset.filter(amount_out__gt=0)
        elif amount_type == 'in':
            queryset = queryset.filter(amount_in__gt=0)

        # 金額範囲でフィルター
        if amount_min is not None or amount_max is not None:
            if amount_type == 'out':
                if amount_min is not None:
                    queryset = queryset.filter(amount_out__gte=amount_min)
                if amount_max is not None:
                    queryset = queryset.filter(amount_out__lte=amount_max)
            elif amount_type == 'in':
                if amount_min is not None:
                    queryset = queryset.filter(amount_in__gte=amount_min)
                if amount_max is not None:
                    queryset = queryset.filter(amount_in__lte=amount_max)
            else:
                if amount_min is not None and amount_max is not None:
                    queryset = queryset.filter(
                        Q(amount_out__gte=amount_min, amount_out__lte=amount_max) |
                        Q(amount_in__gte=amount_min, amount_in__lte=amount_max)
                    )
                elif amount_min is not None:
                    queryset = queryset.filter(
                        Q(amount_out__gte=amount_min) | Q(amount_in__gte=amount_min)
                    )
                elif amount_max is not None:
                    queryset = queryset.filter(
                        Q(amount_out__gt=0, amount_out__lte=amount_max) |
                        Q(amount_in__gt=0, amount_in__lte=amount_max)
                    )

        return queryset

    @staticmethod
    def apply_filters(queryset, filter_state: dict):
        """
        フィルター条件をQuerySetに適用する共通処理

        Args:
            queryset: 取引のQuerySet
            filter_state: フィルター条件の辞書

        Returns:
            フィルター適用後のQuerySet
        """
        if filter_state.get('bank'):
            queryset = queryset.filter(bank_name__in=filter_state['bank'])
        if filter_state.get('account'):
            queryset = queryset.filter(account_id__in=filter_state['account'])
        if filter_state.get('category'):
            if filter_state.get('category_mode') == 'exclude':
                queryset = queryset.exclude(category__in=filter_state['category'])
            else:
                queryset = queryset.filter(category__in=filter_state['category'])
        if filter_state.get('keyword'):
            queryset = queryset.filter(description__icontains=filter_state['keyword'])

        # 日付フィルター
        if filter_state.get('date_from'):
            queryset = queryset.filter(date__gte=filter_state['date_from'])
        if filter_state.get('date_to'):
            queryset = queryset.filter(date__lte=filter_state['date_to'])

        # 金額フィルター
        amount_type = filter_state.get('amount_type', 'both')
        amount_min = AnalysisService._parse_amount_str(filter_state.get('amount_min', ''))
        amount_max = AnalysisService._parse_amount_str(filter_state.get('amount_max', ''))
        queryset = AnalysisService._apply_amount_filters(queryset, amount_type, amount_min, amount_max)

        return queryset

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

        return {
            'account_summary': AnalysisService._build_account_summary(df),
            'transfer_pairs': AnalysisService._build_transfer_data(df, filter_state),
            'large_txs': AnalysisService._build_large_txs(df, filter_state),
            'all_txs': AnalysisService.apply_filters(transactions, filter_state),
            'duplicate_txs': AnalysisService._get_duplicate_transactions(df),
            'flagged_txs': transactions.filter(is_flagged=True),
            **AnalysisService._build_filter_options(df),
        }

    @staticmethod
    def _build_account_summary(df: pd.DataFrame) -> list:
        """口座サマリーデータを生成"""
        account_summary = df.groupby(['account_id', 'holder']).agg({
            'id': 'count',
            'date': 'max'
        }).reset_index().rename(columns={'id': 'count', 'date': 'last_date'})
        return account_summary.to_dict(orient='records')

    @staticmethod
    def _build_transfer_data(df: pd.DataFrame, filter_state: dict) -> list:
        """資金移動ペアデータを生成（フィルター適用含む）"""
        analyzed_df = analyzer.analyze_transfers(df.copy())
        transfers_df = AnalysisService._convert_amounts_to_int(
            analyzed_df[analyzed_df['is_transfer']].copy()
        )
        transfer_pairs = AnalysisService._get_transfer_pairs(transfers_df)

        # 資金移動の分類フィルター
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

        return transfer_pairs

    @staticmethod
    def _build_large_txs(df: pd.DataFrame, filter_state: dict) -> list:
        """多額取引データを生成（フィルター適用含む）"""
        custom_threshold = AnalysisService._parse_amount_str(
            filter_state.get('large_amount_threshold', '')
        )
        if custom_threshold is not None:
            large_df = df[
                (df['amount_out'] >= custom_threshold) | (df['amount_in'] >= custom_threshold)
            ].copy()
        else:
            large_df = df[df['is_large']].copy()
        if filter_state.get('large_category'):
            if filter_state.get('large_category_mode') == 'exclude':
                large_df = large_df[~large_df['category'].isin(filter_state['large_category'])]
            else:
                large_df = large_df[large_df['category'].isin(filter_state['large_category'])]
        large_df = AnalysisService._convert_amounts_to_int(
            large_df.sort_values('date', ascending=True).copy()
        )
        return large_df.to_dict(orient='records')

    @staticmethod
    def _build_filter_options(df: pd.DataFrame) -> dict:
        """フィルタードロップダウン用のユニークリストを取得"""
        banks = sorted([b for b in df['bank_name'].dropna().unique() if b])
        branches = sorted([b for b in df['branch_name'].dropna().unique() if b])
        accounts = sorted([a for a in df['account_id'].dropna().unique() if a])
        existing_categories = df['category'].dropna().unique().tolist()
        categories = sorted(set(existing_categories + AnalysisService.STANDARD_CATEGORIES))
        return {
            'banks': banks,
            'branches': branches,
            'accounts': accounts,
            'categories': categories,
        }

    @staticmethod
    def _convert_amounts_to_int(df: pd.DataFrame) -> pd.DataFrame:
        """DataFrameの金額カラムをPython intに変換（NaN→0）。dfをin-placeで変更する。"""
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
    def _build_tx_endpoint(row, amount_field: str) -> dict:
        """資金移動ペア用の取引辞書を構築"""
        return {
            'id': row.get('id'),
            'date': row['date'],
            'bank_name': row.get('bank_name', ''),
            'branch_name': row.get('branch_name', ''),
            'account_id': row.get('account_id', ''),
            'amount': row[amount_field],
            'description': row.get('description', ''),
            'category': row.get('category', UNCATEGORIZED),
        }

    @staticmethod
    def _get_transfer_pairs(transfers_df: pd.DataFrame) -> list:
        """資金移動のペアデータを生成（出金元・移動先をセットで返す）"""
        if transfers_df.empty:
            return []

        settings = config.load_user_settings()
        tolerance = int(settings.get("TRANSFER_AMOUNT_TOLERANCE", 1000))

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
                        if abs(candidate['amount_in'] - out_row['amount_out']) <= tolerance:
                            dest_row = candidate
                            break

            pair = {
                'source': AnalysisService._build_tx_endpoint(out_row, 'amount_out'),
                'destination': None,
            }

            if dest_row is not None:
                pair['destination'] = AnalysisService._build_tx_endpoint(dest_row, 'amount_in')

            transfer_pairs.append(pair)

        return transfer_pairs
