"""分析ダッシュボードビュー"""
import json
import logging

from django.contrib import messages
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404

from ..models import Case
from ..lib import config
from ..lib.constants import UNCATEGORIZED, sort_patterns_dict
from ..lib.text_utils import filter_by_keyword
from ..services import TransactionService, AnalysisService
from ..handlers import (
    handle_run_classifier,
    handle_apply_rules,
    handle_delete_account,
    handle_update_category,
    handle_bulk_update_categories,
    handle_bulk_update_categories_transfer,
    handle_update_transaction,
    handle_delete_duplicates,
    handle_delete_by_range,
    handle_toggle_flag,
    handle_update_memo,
    handle_bulk_replace_field,
    handle_apply_ai_suggestion,
    handle_bulk_apply_ai_suggestions,
    handle_add_pattern,
    handle_delete_pattern,
    handle_update_pattern,
    handle_move_pattern,
    handle_classify_and_register_pattern,
    handle_get_category_keywords,
    handle_bulk_pattern_changes,
    handle_run_auto_classify,
)
from ._helpers import paginate, build_filter_state, get_sort_order_by, sort_dict_list, get_per_page

logger = logging.getLogger(__name__)

# 分析ダッシュボードのアクション → ハンドラー関数マッピング
_ANALYSIS_ACTION_HANDLERS = {
    'run_classifier': handle_run_classifier,
    'apply_rules': handle_apply_rules,
    'delete_account': handle_delete_account,
    'update_category': handle_update_category,
    'bulk_update_categories': handle_bulk_update_categories,
    'bulk_update_transfer_categories': handle_bulk_update_categories_transfer,
    'update_transaction': handle_update_transaction,
    'delete_duplicates': handle_delete_duplicates,
    'delete_by_range': handle_delete_by_range,
    'toggle_flag': handle_toggle_flag,
    'update_memo': handle_update_memo,
    'bulk_replace_field': handle_bulk_replace_field,
    'apply_ai_suggestion': handle_apply_ai_suggestion,
    'bulk_apply_ai_suggestions': handle_bulk_apply_ai_suggestions,
    'add_pattern': handle_add_pattern,
    'delete_pattern': handle_delete_pattern,
    'update_pattern': handle_update_pattern,
    'move_pattern': handle_move_pattern,
    'classify_and_register_pattern': handle_classify_and_register_pattern,
    'get_category_keywords': handle_get_category_keywords,
    'bulk_pattern_changes': handle_bulk_pattern_changes,
    'run_auto_classify': handle_run_auto_classify,
}


def _handle_analysis_post(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    """分析ダッシュボードのPOSTリクエストを処理"""
    action = request.POST.get('action')
    handler = _ANALYSIS_ACTION_HANDLERS.get(action)
    if handler:
        return handler(request, case, pk)
    return redirect('analysis-dashboard', pk=pk)


def _filter_and_paginate(queryset, keyword, page, per_page):
    """キーワードフィルタ適用 + ページネーション"""
    if keyword:
        filtered = filter_by_keyword(queryset, keyword)
        return len(filtered), paginate(filtered, page, per_page)
    return queryset.count(), paginate(queryset, page, per_page)


def _build_chart_data(case):
    """チャート用データ（カテゴリー別集計 + 月次推移）を構築"""
    all_txs_qs = case.transactions.all()

    # カテゴリー別集計
    category_stats = (
        all_txs_qs
        .exclude(category=UNCATEGORIZED)
        .values('category')
        .annotate(
            count=Count('id'),
            total_out=Sum('amount_out'),
            total_in=Sum('amount_in'),
        )
        .order_by('-count')
    )
    chart_categories = {
        'labels': [s['category'] for s in category_stats],
        'counts': [s['count'] for s in category_stats],
        'totals': [((s['total_out'] or 0) + (s['total_in'] or 0)) for s in category_stats],
    }
    unclassified_total = all_txs_qs.filter(category=UNCATEGORIZED).count()
    total_tx_count = all_txs_qs.count()
    classified_count = total_tx_count - unclassified_total
    classified_pct = round(classified_count / total_tx_count * 100, 1) if total_tx_count > 0 else 0
    if unclassified_total:
        chart_categories['labels'].append('未分類')
        chart_categories['counts'].append(unclassified_total)
        chart_categories['totals'].append(0)

    # 月次入出金推移
    monthly_stats = (
        all_txs_qs
        .filter(date__isnull=False)
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(total_out=Sum('amount_out'), total_in=Sum('amount_in'))
        .order_by('month')
    )
    chart_monthly = {
        'months': [s['month'].strftime('%Y-%m') for s in monthly_stats],
        'out': [s['total_out'] or 0 for s in monthly_stats],
        'in': [s['total_in'] or 0 for s in monthly_stats],
    }

    return {
        'chart_categories_json': json.dumps(chart_categories, ensure_ascii=False),
        'chart_monthly_json': json.dumps(chart_monthly, ensure_ascii=False),
        'total_tx_count': total_tx_count,
        'classified_count': classified_count,
        'classified_pct': classified_pct,
    }


def _build_transfer_context(pairs):
    """資金移動タブのサマリー統計 + 金額差を計算"""
    if not pairs:
        return {}

    transfer_total_amount = sum(p['source'].get('amount', 0) for p in pairs)
    transfer_unclassified = sum(
        1 for p in pairs
        if p['source'].get('category', '') == UNCATEGORIZED
        or (p.get('destination') and p['destination'].get('category', '') == UNCATEGORIZED)
    )
    for p in pairs:
        if p.get('destination'):
            src_amt = p['source'].get('amount', 0)
            dest_amt = p['destination'].get('amount', 0)
            p['amount_diff'] = abs(src_amt - dest_amt)

    return {
        'transfer_summary': {
            'total_amount': transfer_total_amount,
            'pair_count': len(pairs),
            'unclassified_count': transfer_unclassified,
        },
    }


def _build_unclassified_context(request, case, sort_order, keyword):
    """未分類タブのグルーピング + サジェストデータを構築"""
    unclassified_qs = case.transactions.with_account_info().filter(category=UNCATEGORIZED).order_by(*sort_order)
    group_data = AnalysisService.build_unclassified_groups(unclassified_qs, keyword)
    group_page = paginate(group_data['groups'], request.GET.get('group_page', 1), 50)

    return {
        'unclassified_groups': group_page,
        'unclassified_group_count': len(group_data['groups']),
        'unclassified_tx_total': group_data['tx_total'],
        'max_group_count': group_data['max_group_count'],
        'group_suggestions_json': AnalysisService.build_group_suggestions(group_page, case),
    }


def analysis_dashboard(request: HttpRequest, pk: int) -> HttpResponse:
    """分析・表示ダッシュボード"""
    case = get_object_or_404(Case, pk=pk)

    if request.method == 'POST':
        return _handle_analysis_post(request, case, pk)

    filter_state = build_filter_state(request, include_tab_filters=True)
    analysis_data = AnalysisService.get_analysis_data(case, filter_state)

    if analysis_data.get('no_data'):
        return render(request, 'analyzer/analysis.html', {'case': case, 'no_data': True})

    keyword = filter_state.get('keyword', '')
    per_page = get_per_page(request)
    sort_param = filter_state.get('sort', '')
    sort_order = get_sort_order_by(sort_param, default='date_desc')

    all_txs_count, all_txs_page = _filter_and_paginate(
        analysis_data['all_txs'], keyword, request.GET.get('page', 1), per_page,
    )
    unclassified_txs = case.transactions.with_account_info().filter(category=UNCATEGORIZED).order_by(*sort_order)
    _, unclassified_page = _filter_and_paginate(
        unclassified_txs, keyword, request.GET.get('unclassified_page', 1), per_page,
    )
    flagged_txs = sort_dict_list(
        filter_by_keyword(analysis_data['flagged_txs'], keyword), sort_param
    )

    context = {
        'case': case,
        'account_summary': analysis_data['account_summary'],
        'transfer_pairs': analysis_data['transfer_pairs'],
        'all_txs': all_txs_page,
        'all_txs_count': all_txs_count,
        'unclassified_txs': unclassified_page,
        'duplicate_txs': analysis_data['duplicate_txs'],
        'flagged_txs': flagged_txs,
        'banks': analysis_data['banks'],
        'branches': analysis_data['branches'],
        'accounts': analysis_data['accounts'],
        'categories': analysis_data['categories'],
        'bank_to_accounts_json': json.dumps(analysis_data.get('bank_to_accounts', {}), ensure_ascii=False),
        'filter_state': filter_state,
        'fuzzy_threshold': analysis_data.get('fuzzy_threshold', 90),
        'unclassified_count': analysis_data.get('unclassified_count', 0),
        'suggestions_count': analysis_data.get('suggestions_count', 0),
        'ai_suggestions': analysis_data.get('ai_suggestions', []),
        'ai_groups': analysis_data.get('ai_groups', []),
        'ai_groups_json': json.dumps(
            [{k: v for k, v in g.items() if k != 'sample_date'} for g in analysis_data.get('ai_groups', [])],
            ensure_ascii=False,
        ),
        'global_patterns': sort_patterns_dict(config.get_classification_patterns()),
        'case_patterns': sort_patterns_dict(case.custom_patterns or {}),
        **_build_chart_data(case),
        **_build_transfer_context(analysis_data['transfer_pairs']),
    }

    if request.GET.get('tab') == 'unclassified':
        context.update(_build_unclassified_context(request, case, sort_order, keyword))

    return render(request, 'analyzer/analysis.html', context)


def classify_preview(request: HttpRequest, pk: int) -> HttpResponse:
    """自動分類プレビューページ"""
    case = get_object_or_404(Case, pk=pk)

    if request.method == 'POST':
        selected_ids_str = request.POST.get('selected_ids', '')
        if selected_ids_str:
            try:
                selected_ids = [int(x) for x in selected_ids_str.split(',') if x.strip()]
                count = TransactionService.apply_selected_classifications(case, selected_ids)
                messages.success(request, f"{count}件の取引を分類しました。")
            except (ValueError, TypeError) as e:
                messages.error(request, f"エラーが発生しました: {e}")
        else:
            messages.warning(request, "適用する取引が選択されていません。")

        return redirect('analysis-dashboard', pk=pk)

    preview_data = TransactionService.get_classification_preview(case)
    categories = sorted(set(item['proposed_category'] for item in preview_data))
    high_confidence = sum(1 for item in preview_data if item['score'] >= 90)
    total_count = len(preview_data)

    context = {
        'case': case,
        'preview_data': preview_data,
        'categories': categories,
        'high_confidence_count': high_confidence,
        'total_count': total_count,
    }
    return render(request, 'analyzer/classify_preview.html', context)
