import logging
import pandas as pd
from rapidfuzz import process, fuzz
from typing import Optional

from .config import get_classification_patterns, get_gift_threshold, get_fuzzy_config
from .constants import UNCATEGORIZED

logger = logging.getLogger(__name__)


def _sort_categories_by_keyword_count(patterns: dict, exclude_categories: list[str] = None) -> list[str]:
    """
    カテゴリーをキーワード数の昇順でソート（少ない方が優先）

    Args:
        patterns: 分類パターン辞書
        exclude_categories: 除外するカテゴリー（後で個別に処理）

    Returns:
        ソートされたカテゴリー名のリスト
    """
    if exclude_categories is None:
        exclude_categories = ["その他", UNCATEGORIZED]

    # 除外カテゴリーを除いてキーワード数でソート
    sortable_categories = [
        (cat, len(keywords))
        for cat, keywords in patterns.items()
        if cat not in exclude_categories and keywords
    ]

    # キーワード数の昇順でソート（少ないものが先）
    sortable_categories.sort(key=lambda x: x[1])

    return [cat for cat, _ in sortable_categories]


class FuzzyMatchCache:
    """ファジーマッチングのキャッシュ（パフォーマンス最適化）"""

    def __init__(self):
        self._cache = {}

    def get(self, text: str, patterns: tuple) -> Optional[tuple]:
        """キャッシュから結果取得"""
        key = (text, patterns)
        return self._cache.get(key)

    def set(self, text: str, patterns: tuple, result: tuple):
        """キャッシュに結果保存"""
        key = (text, patterns)
        self._cache[key] = result

        # キャッシュサイズ制限（10,000エントリまで）
        if len(self._cache) > 10000:
            # 最も古いエントリを削除
            first_key = next(iter(self._cache))
            del self._cache[first_key]

    def clear(self):
        """キャッシュクリア"""
        self._cache.clear()


# グローバルキャッシュインスタンス
_fuzzy_cache = FuzzyMatchCache()


def _fuzzy_match_category(
    text: str,
    case_patterns: dict,
    global_patterns: dict,
    fuzzy_config: dict,
) -> tuple[Optional[str], int]:
    """
    ファジーマッチングで分類を試行

    評価順序:
    1. 案件固有パターン（キーワード数が少ないカテゴリーから）
    2. グローバルパターン（キーワード数が少ないカテゴリーから）
    3. 「その他」は常に最後

    Args:
        text: 摘要テキスト
        case_patterns: 案件固有の分類パターン辞書
        global_patterns: グローバル分類パターン辞書
        fuzzy_config: ファジーマッチング設定

    Returns:
        (マッチしたカテゴリー, スコア) のタプル。マッチしない場合は (None, 0)
    """
    if not text or not fuzzy_config.get("enabled", False):
        return None, 0

    threshold = fuzzy_config.get("threshold", 90)
    use_token_set = fuzzy_config.get("use_token_set_ratio", True)

    # キャッシュチェック（案件固有とグローバルを両方含む）
    combined_key = (
        tuple(sorted([(k, tuple(v)) for k, v in case_patterns.items()])),
        tuple(sorted([(k, tuple(v)) for k, v in global_patterns.items()]))
    )
    cached_result = _fuzzy_cache.get(text, combined_key)
    if cached_result is not None:
        return cached_result

    best_category = None
    best_score = 0

    def _evaluate_patterns(patterns: dict, scope_name: str):
        """パターン辞書を評価してベストマッチを更新"""
        nonlocal best_category, best_score

        # キーワード数の昇順でソート（少ないものが先）
        sorted_categories = _sort_categories_by_keyword_count(patterns)

        for category in sorted_categories:
            keywords = patterns.get(category, [])
            if not keywords:
                continue

            # RapidFuzzでマッチング
            if use_token_set:
                result = process.extractOne(
                    text,
                    keywords,
                    scorer=fuzz.token_set_ratio,
                    score_cutoff=threshold
                )
            else:
                result = process.extractOne(
                    text,
                    keywords,
                    scorer=fuzz.partial_ratio,
                    score_cutoff=threshold
                )

            if result and result[1] > best_score:
                best_category = category
                best_score = result[1]
                logger.debug(f"Fuzzy match ({scope_name}): '{text}' -> {category} (score={result[1]})")

                # 完全一致に近い場合は即座に返す（最適化）
                if best_score >= 95:
                    return True  # 早期終了

        return False  # 続行

    # 1. 案件固有パターンを先に評価
    if case_patterns and _evaluate_patterns(case_patterns, "case"):
        result = (best_category, best_score)
        _fuzzy_cache.set(text, combined_key, result)
        return result

    # 2. グローバルパターンを評価（案件固有に含まれないもののみ）
    # 案件固有で既にカバーされているカテゴリーのキーワードは重複評価しない
    global_only = {}
    for cat, keywords in global_patterns.items():
        if cat in ["その他", UNCATEGORIZED]:
            continue
        case_kws = set(case_patterns.get(cat, []))
        # 案件固有に含まれないキーワードのみ
        unique_kws = [kw for kw in keywords if kw not in case_kws]
        if unique_kws:
            global_only[cat] = unique_kws

    if global_only and _evaluate_patterns(global_only, "global"):
        result = (best_category, best_score)
        _fuzzy_cache.set(text, combined_key, result)
        return result

    # キャッシュに保存
    result = (best_category, best_score)
    _fuzzy_cache.set(text, combined_key, result)

    return result


def classify_by_rules(
    text: str,
    amount_out: int,
    amount_in: int,
    *,
    case_patterns: dict | None = None,
    global_patterns: dict | None = None,
    patterns: dict | None = None,  # 後方互換性のため維持
    gift_threshold: int | None = None,
    fuzzy_config: dict | None = None,
) -> tuple[str, int]:
    """
    ルールベースで取引を分類（ファジーマッチング対応）

    評価順序:
    1. 案件固有パターン（サブストリング、キーワード数少ない順）
    2. グローバルパターン（サブストリング、キーワード数少ない順）
    3. 贈与判定（閾値チェック）
    4. ファジーマッチング（案件固有 → グローバル）
    5. 「その他」カテゴリー（常に最後）

    Args:
        text: 摘要テキスト
        amount_out: 出金額
        amount_in: 入金額
        case_patterns: 案件固有パターン
        global_patterns: グローバルパターン
        patterns: 後方互換性用（case_patterns/global_patternsが指定された場合は無視）
        gift_threshold: 贈与判定閾値（省略時はload_user_settingsから取得）
        fuzzy_config: ファジーマッチング設定（省略時はload_user_settingsから取得）

    Returns:
        (分類, 信頼度スコア) のタプル
    """
    # 後方互換性: patterns が指定されていて case/global が未指定の場合
    if global_patterns is None:
        global_patterns = patterns if patterns is not None else get_classification_patterns()
    if case_patterns is None:
        case_patterns = {}
    if gift_threshold is None:
        gift_threshold = get_gift_threshold()
    if fuzzy_config is None:
        fuzzy_config = get_fuzzy_config()

    if not text:
        return UNCATEGORIZED, 0

    text_lower = text.lower()

    def _substring_match(patterns_dict: dict, scope_name: str) -> tuple[str, int] | None:
        """
        サブストリングマッチングでカテゴリーを検索

        Returns:
            マッチした場合は (カテゴリー, 100)、なければ None
        """
        # キーワード数の昇順でソート（少ないものが先）
        sorted_categories = _sort_categories_by_keyword_count(patterns_dict)

        for category in sorted_categories:
            keywords = patterns_dict.get(category, [])
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    logger.debug(f"Substring match ({scope_name}): '{text}' -> {category}")
                    return category, 100
        return None

    # Phase 1: サブストリングマッチング（案件固有を先に評価）
    # 1-a. 案件固有パターン
    if case_patterns:
        result = _substring_match(case_patterns, "case")
        if result:
            return result

    # 1-b. グローバルパターン（案件固有で未マッチの場合）
    result = _substring_match(global_patterns, "global")
    if result:
        return result

    # 贈与判定（振込など）- 閾値以上の場合のみ
    # 案件固有とグローバル両方のキーワードをチェック
    case_gift_keywords = case_patterns.get("贈与", [])
    global_gift_keywords = global_patterns.get("贈与", [])
    all_gift_keywords = list(set(case_gift_keywords + global_gift_keywords))

    if any(kw.lower() in text_lower for kw in all_gift_keywords):
        if amount_out >= gift_threshold:
            return "贈与", 100
        # else: 閾値未満の場合はファジーマッチングに進む

    # Phase 2: ファジーマッチング（サブストリングマッチング失敗時）
    if fuzzy_config.get("enabled", False):
        category, score = _fuzzy_match_category(
            text, case_patterns, global_patterns, fuzzy_config
        )
        if category:
            return category, score

    # Phase 3: 「その他」カテゴリー（常に最後に評価）
    case_other_keywords = case_patterns.get("その他", [])
    global_other_keywords = global_patterns.get("その他", [])
    all_other_keywords = list(set(case_other_keywords + global_other_keywords))

    for kw in all_other_keywords:
        if kw.lower() in text_lower:
            return "その他", 100

    return UNCATEGORIZED, 0


def get_fuzzy_suggestions(
    text: str,
    case_patterns: dict | None = None,
    global_patterns: dict | None = None,
    patterns: dict | None = None,  # 後方互換性
    fuzzy_config: dict | None = None,
    top_n: int = 3,
) -> list[tuple[str, int]]:
    """
    摘要に対するファジーマッチング候補を取得（AI分類タブで使用）

    評価順序: 案件固有パターン → グローバルパターン
    （同じカテゴリーは高い方のスコアを採用）

    Args:
        text: 摘要テキスト
        case_patterns: 案件固有パターン
        global_patterns: グローバルパターン
        patterns: 後方互換性用
        fuzzy_config: ファジーマッチング設定
        top_n: 返す候補数

    Returns:
        [(カテゴリー, スコア), ...] のリスト（降順）
    """
    # 後方互換性
    if global_patterns is None:
        global_patterns = patterns if patterns is not None else get_classification_patterns()
    if case_patterns is None:
        case_patterns = {}
    if fuzzy_config is None:
        fuzzy_config = get_fuzzy_config()

    if not text or not fuzzy_config.get("enabled", False):
        return []

    threshold = max(fuzzy_config.get("threshold", 90) - 10, 70)  # 候補は閾値-10%
    use_token_set = fuzzy_config.get("use_token_set_ratio", True)

    # カテゴリーごとの最高スコアを記録
    category_scores = {}

    def _evaluate_patterns(patterns_dict: dict, scope_priority: int):
        """
        パターンを評価してスコアを記録

        scope_priority: 案件固有=1, グローバル=0（同点時のソート用）
        """
        for category, keywords in patterns_dict.items():
            if category in ["その他", UNCATEGORIZED]:
                continue
            if not keywords:
                continue

            if use_token_set:
                result = process.extractOne(
                    text,
                    keywords,
                    scorer=fuzz.token_set_ratio,
                    score_cutoff=threshold
                )
            else:
                result = process.extractOne(
                    text,
                    keywords,
                    scorer=fuzz.partial_ratio,
                    score_cutoff=threshold
                )

            if result:
                score = result[1]
                if category not in category_scores or score > category_scores[category][0]:
                    category_scores[category] = (score, scope_priority)

    # 案件固有を先に評価（優先度高）
    if case_patterns:
        _evaluate_patterns(case_patterns, scope_priority=1)

    # グローバルを評価
    _evaluate_patterns(global_patterns, scope_priority=0)

    # スコア降順、同点なら案件固有優先でソート
    suggestions = [
        (cat, score)
        for cat, (score, _) in sorted(
            category_scores.items(),
            key=lambda x: (x[1][0], x[1][1]),  # (スコア, 優先度)
            reverse=True
        )
    ]

    return suggestions[:top_n]


def classify_transactions(
    df: pd.DataFrame,
    case_patterns: dict | None = None,
    global_patterns: dict | None = None,
) -> pd.DataFrame:
    """
    取引データフレームを分類する（ルールベース + ファジーマッチング）

    評価順序:
    1. 案件固有パターン（キーワード数が少ないカテゴリーから）
    2. グローバルパターン（キーワード数が少ないカテゴリーから）
    3. 「その他」は常に最後

    Args:
        df: 取引データフレーム
        case_patterns: 案件固有パターン（省略時は空）
        global_patterns: グローバルパターン（省略時は設定から取得）
    """
    if df.empty or "description" not in df.columns:
        return df

    if "category" not in df.columns:
        df["category"] = None

    # 信頼度スコア列を追加
    if "classification_score" not in df.columns:
        df["classification_score"] = 0

    # 分類対象: 摘要があり、まだ分類されていないもの
    target_mask = (
        df["description"].notna() &
        (df["description"] != "") &
        df["category"].isna()
    )
    target_df = df[target_mask]

    if target_df.empty:
        return df

    logger.info(f"ルールベース分類を実行中... (対象: {len(target_df)}件)")

    # 設定を1回だけ読み込み、ループ内で使い回す
    if global_patterns is None:
        global_patterns = get_classification_patterns()
    if case_patterns is None:
        case_patterns = {}
    gift_threshold = get_gift_threshold()
    fuzzy_config = get_fuzzy_config()

    # 同じ摘要は同じ分類結果になるのでキャッシュ
    classification_cache = {}

    for idx in target_df.index:
        row = target_df.loc[idx]
        description = str(row["description"])

        if description not in classification_cache:
            category, score = classify_by_rules(
                description,
                row.get("amount_out", 0) or 0,
                row.get("amount_in", 0) or 0,
                case_patterns=case_patterns,
                global_patterns=global_patterns,
                gift_threshold=gift_threshold,
                fuzzy_config=fuzzy_config,
            )
            classification_cache[description] = (category, score)

    # 分類結果を反映
    df.loc[target_mask, "category"] = df.loc[target_mask, "description"].map(
        lambda d: classification_cache[d][0]
    )
    df.loc[target_mask, "classification_score"] = df.loc[target_mask, "description"].map(
        lambda d: classification_cache[d][1]
    )

    # 統計情報をログ出力
    fuzzy_matches = (df.loc[target_mask, "classification_score"] < 100).sum()
    logger.info(f"分類完了: {len(target_df)}件を処理 (ファジーマッチ: {fuzzy_matches}件)")

    return df


def clear_fuzzy_cache():
    """ファジーマッチングキャッシュをクリア（設定変更時に呼び出し）"""
    _fuzzy_cache.clear()
    logger.info("Fuzzy matching cache cleared")
