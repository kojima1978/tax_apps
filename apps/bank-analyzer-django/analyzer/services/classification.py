"""
分類サービス

パターンマッチングによる取引分類のビジネスロジックを提供する。
"""
import logging
from typing import Optional

from ..models import Case, Transaction
from ..lib import config, llm_classifier
from ..lib.constants import UNCATEGORIZED

logger = logging.getLogger(__name__)


def match_pattern(description: str, patterns: dict) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """
    摘要に対してパターンマッチングを実行

    Args:
        description: 取引の摘要
        patterns: {カテゴリー: [キーワード]} の辞書

    Returns:
        (マッチしたカテゴリー, マッチしたキーワード, マッチタイプ) のタプル
        マッチしない場合は (None, None, None)
    """
    if not description:
        return None, None, None

    desc_lower = description.lower()

    for category, keywords in patterns.items():
        for keyword in keywords:
            kw_lower = keyword.lower()
            if kw_lower == desc_lower:
                return category, keyword, 'exact'
            elif kw_lower in desc_lower:
                return category, keyword, 'partial'

    return None, None, None


def match_with_priority(
    description: str,
    case_patterns: dict,
    global_patterns: dict
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """
    案件固有パターン優先でパターンマッチング

    Args:
        description: 取引の摘要
        case_patterns: 案件固有のパターン辞書
        global_patterns: グローバルのパターン辞書

    Returns:
        (マッチしたカテゴリー, マッチしたキーワード, マッチタイプ) のタプル
    """
    # 案件固有パターンを優先
    if case_patterns:
        category, keyword, match_type = match_pattern(description, case_patterns)
        if category:
            return category, keyword, 'case'

    # グローバルパターン
    return match_pattern(description, global_patterns)


def calculate_match_score(match_type: str, keyword: str, description: str) -> int:
    """
    マッチタイプに基づいて信頼度スコアを計算

    Args:
        match_type: 'exact', 'partial', 'case' のいずれか
        keyword: マッチしたキーワード
        description: 元の摘要

    Returns:
        0-100 の信頼度スコア
    """
    if match_type == 'exact':
        return 100
    elif match_type == 'case':
        return 95
    else:
        # 部分一致: キーワードの長さに基づいてスコア計算
        ratio = len(keyword) / len(description) if description else 0
        return min(95, max(70, int(70 + ratio * 25)))


def classify_unclassified_transactions(
    case: Case,
    use_fuzzy: bool = True
) -> list[Transaction]:
    """
    未分類取引に対して分類を実行（bulk_update用のリストを返す）

    Args:
        case: 対象の案件
        use_fuzzy: ファジーマッチングを使用するか

    Returns:
        更新が必要なTransactionオブジェクトのリスト
    """
    txs = case.transactions.filter(category=UNCATEGORIZED)
    if not txs.exists():
        return []

    case_patterns = case.custom_patterns or {}
    global_patterns = config.get_classification_patterns()

    updates = []

    if use_fuzzy:
        fuzzy_config = config.get_fuzzy_config()
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

            if category != UNCATEGORIZED:
                tx.category = category
                tx.classification_score = score
                updates.append(tx)
    else:
        # シンプルなサブストリングマッチング
        for tx in txs:
            if not tx.description:
                continue

            category, keyword, match_type = match_with_priority(
                tx.description, case_patterns, global_patterns
            )

            if category:
                tx.category = category
                updates.append(tx)

    return updates


def get_ai_suggestions_for_transaction(
    tx: Transaction,
    case_patterns: dict,
    global_patterns: dict,
    fuzzy_config: dict,
    top_n: int = 3
) -> list[tuple[str, int]]:
    """
    単一の取引に対するAI分類提案を取得

    Args:
        tx: 対象の取引
        case_patterns: 案件固有パターン
        global_patterns: グローバルパターン
        fuzzy_config: ファジーマッチング設定
        top_n: 返す提案の最大数

    Returns:
        [(カテゴリー, スコア), ...] のリスト
    """
    if not tx.description:
        return []

    return llm_classifier.get_fuzzy_suggestions(
        tx.description,
        case_patterns=case_patterns,
        global_patterns=global_patterns,
        fuzzy_config=fuzzy_config,
        top_n=top_n
    )
