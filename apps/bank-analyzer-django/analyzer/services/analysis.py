"""
分析サービス

分析ダッシュボード用のデータ生成ビジネスロジックを提供する。
"""
import logging

import pandas as pd
from django.db.models import Q

from ..models import Case, Transaction
from ..lib import analyzer, llm_classifier, config
from ..lib.constants import UNCATEGORIZED, STANDARD_CATEGORIES, sort_categories
from .utils import parse_amount_str, convert_amounts_to_int

logger = logging.getLogger(__name__)


class AnalysisService:
    """分析機能に関するビジネスロジック"""

    STANDARD_CATEGORIES = STANDARD_CATEGORIES

    # =========================================================================
    # フィルタリング
    # =========================================================================

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
        amount_min = parse_amount_str(filter_state.get('amount_min', ''))
        amount_max = parse_amount_str(filter_state.get('amount_max', ''))
        queryset = AnalysisService._apply_amount_filters(queryset, amount_type, amount_min, amount_max)

        return queryset

    # =========================================================================
    # メインデータ取得
    # =========================================================================

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

        # AI提案データを取得
        ai_data = AnalysisService._build_ai_suggestions(case, filter_state)

        return {
            'account_summary': AnalysisService._build_account_summary(df),
            'transfer_pairs': AnalysisService._build_transfer_data(df, filter_state),
            'large_txs': AnalysisService._build_large_txs(df, filter_state),
            'all_txs': AnalysisService.apply_filters(transactions, filter_state),
            'duplicate_txs': AnalysisService._get_duplicate_transactions(df),
            'flagged_txs': transactions.filter(is_flagged=True),
            **AnalysisService._build_filter_options(df, case),
            **ai_data,
        }

    # =========================================================================
    # データビルダー
    # =========================================================================

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
        transfers_df = convert_amounts_to_int(
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
        custom_threshold = parse_amount_str(
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
        large_df = convert_amounts_to_int(
            large_df.sort_values('date', ascending=True).copy()
        )
        return large_df.to_dict(orient='records')

    @staticmethod
    def _build_filter_options(df: pd.DataFrame, case=None) -> dict:
        """フィルタードロップダウン用のユニークリストを取得"""
        banks = sorted([b for b in df['bank_name'].dropna().unique() if b])
        branches = sorted([b for b in df['branch_name'].dropna().unique() if b])
        accounts = sorted([a for a in df['account_id'].dropna().unique() if a])
        existing_categories = df['category'].dropna().unique().tolist()

        # 標準カテゴリー + パターンのカテゴリーを結合
        all_categories = set(existing_categories + AnalysisService.STANDARD_CATEGORIES)

        # パターンからカテゴリーを追加（グローバル＋案件固有）
        merged_patterns = config.get_merged_patterns(case)
        all_categories.update(merged_patterns.keys())

        # 固定順序でソート（STANDARD_CATEGORIESの順序を優先）
        categories = sort_categories(all_categories)
        return {
            'banks': banks,
            'branches': branches,
            'accounts': accounts,
            'categories': categories,
        }

    # =========================================================================
    # 重複・資金移動検出
    # =========================================================================

    @staticmethod
    def _get_duplicate_transactions(df: pd.DataFrame) -> list:
        """重複取引を検出してリストで返す"""
        dup_cols = ['date', 'amount_out', 'amount_in', 'description', 'account_id']
        if not all(col in df.columns for col in dup_cols):
            return []

        duplicates_mask = df.duplicated(subset=dup_cols, keep=False)
        dup_df = convert_amounts_to_int(
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

    # =========================================================================
    # AI分類提案
    # =========================================================================

    @staticmethod
    def _build_ai_suggestions(case: Case, filter_state: dict) -> dict:
        """
        AI分類提案データを生成

        評価順序:
        1. 案件固有パターン（キーワード数が少ないカテゴリーから）
        2. グローバルパターン（キーワード数が少ないカテゴリーから）

        Args:
            case: 対象の案件
            filter_state: フィルター条件

        Returns:
            AI提案データの辞書 (ai_suggestions, suggestions_count, unclassified_count, fuzzy_threshold)
        """
        fuzzy_config = config.get_fuzzy_config()
        fuzzy_threshold = filter_state.get('fuzzy_threshold') or fuzzy_config.get('threshold', 90)
        case_patterns = case.custom_patterns or {}
        global_patterns = config.get_classification_patterns()

        # 未分類の取引を取得
        unclassified_txs = case.transactions.filter(category=UNCATEGORIZED).order_by('-date', '-id')[:100]
        unclassified_count = case.transactions.filter(category=UNCATEGORIZED).count()

        if not unclassified_txs.exists():
            return {
                'ai_suggestions': [],
                'suggestions_count': 0,
                'unclassified_count': 0,
                'fuzzy_threshold': fuzzy_threshold,
            }

        suggestions = []
        for tx in unclassified_txs:
            if not tx.description:
                continue

            # ファジーマッチングで提案を取得（案件固有を優先）
            top_suggestions = llm_classifier.get_fuzzy_suggestions(
                tx.description,
                case_patterns=case_patterns,
                global_patterns=global_patterns,
                fuzzy_config={'threshold': fuzzy_threshold, **fuzzy_config},
                top_n=3
            )

            if top_suggestions:
                main_category, main_score = top_suggestions[0]
                alternative_suggestions = [
                    {'category': cat, 'score': score}
                    for cat, score in top_suggestions[1:]
                ]

                suggestions.append({
                    'tx_id': tx.id,
                    'date': tx.date,
                    'description': tx.description,
                    'amount_out': tx.amount_out or 0,
                    'amount_in': tx.amount_in or 0,
                    'suggested_category': main_category,
                    'score': main_score,
                    'alternative_suggestions': alternative_suggestions,
                })

        return {
            'ai_suggestions': suggestions,
            'suggestions_count': len(suggestions),
            'unclassified_count': unclassified_count,
            'fuzzy_threshold': fuzzy_threshold,
        }
