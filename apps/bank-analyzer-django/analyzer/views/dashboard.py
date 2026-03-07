"""分析ダッシュボードビュー"""
import json
import logging
from collections import defaultdict

from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
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

    def _filter_and_paginate(queryset, page_param):
        """キーワードフィルタ適用 + ページネーション"""
        if keyword:
            filtered = filter_by_keyword(queryset, keyword)
            return len(filtered), paginate(filtered, request.GET.get(page_param, 1), per_page)
        return queryset.count(), paginate(queryset, request.GET.get(page_param, 1), per_page)

    all_txs_count, all_txs_page = _filter_and_paginate(analysis_data['all_txs'], 'page')

    sort_param = filter_state.get('sort', '')
    sort_order = get_sort_order_by(sort_param, default='date_desc')
    unclassified_txs = case.transactions.filter(category=UNCATEGORIZED).order_by(*sort_order)
    _, unclassified_page = _filter_and_paginate(unclassified_txs, 'unclassified_page')

    flagged_txs = sort_dict_list(
        filter_by_keyword(analysis_data['flagged_txs'], keyword), sort_param
    )

    # チャート用データ: カテゴリー別集計
    all_txs_qs = case.transactions.all()
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

    # チャート用データ: 月次入出金推移
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

    context = {
        'case': case,
        'account_summary': analysis_data['account_summary'],
        'transfer_pairs': analysis_data['transfer_pairs'],
        'large_txs': analysis_data['large_txs'],
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
        'chart_categories_json': json.dumps(chart_categories, ensure_ascii=False),
        'chart_monthly_json': json.dumps(chart_monthly, ensure_ascii=False),
        'total_tx_count': total_tx_count,
        'classified_count': classified_count,
        'classified_pct': classified_pct,
    }

    # 資金移動タブ: サマリー統計 + 金額差計算
    pairs = analysis_data['transfer_pairs']
    if pairs:
        transfer_total_amount = sum(p['source'].get('amount', 0) for p in pairs)
        transfer_unclassified = sum(
            1 for p in pairs
            if p['source'].get('category', '') == UNCATEGORIZED
            or (p.get('destination') and p['destination'].get('category', '') == UNCATEGORIZED)
        )
        context['transfer_summary'] = {
            'total_amount': transfer_total_amount,
            'pair_count': len(pairs),
            'unclassified_count': transfer_unclassified,
        }
        for p in pairs:
            if p.get('destination'):
                src_amt = p['source'].get('amount', 0)
                dest_amt = p['destination'].get('amount', 0)
                p['amount_diff'] = abs(src_amt - dest_amt)

    # 未分類タブ: 摘要グルーピング + サジェスト
    if request.GET.get('tab') == 'unclassified':
        from ..lib.llm_classifier import get_fuzzy_suggestions

        unclassified_qs = case.transactions.filter(category=UNCATEGORIZED).order_by(*sort_order)
        if keyword:
            unclassified_qs = filter_by_keyword(unclassified_qs, keyword)

        group_map = defaultdict(lambda: {'count': 0, 'total_out': 0, 'total_in': 0, 'tx_ids': []})
        iterable = unclassified_qs if isinstance(unclassified_qs, list) else unclassified_qs.iterator()
        for tx in iterable:
            desc = tx.description or '（摘要なし）'
            g = group_map[desc]
            g['count'] += 1
            g['total_out'] += tx.amount_out or 0
            g['total_in'] += tx.amount_in or 0
            g['tx_ids'].append(tx.id)

        groups = []
        for desc, data in group_map.items():
            groups.append({
                'description': desc,
                'count': data['count'],
                'total_out': data['total_out'],
                'total_in': data['total_in'],
                'tx_ids_json': json.dumps(data['tx_ids']),
                'first_tx_id': data['tx_ids'][0] if data['tx_ids'] else None,
            })
        groups.sort(key=lambda g: g['count'], reverse=True)
        unclassified_tx_total = sum(g['count'] for g in groups)
        max_group_count = groups[0]['count'] if groups else 1

        group_page_num = request.GET.get('group_page', 1)
        group_paginator = Paginator(groups, 50)
        try:
            group_page = group_paginator.page(group_page_num)
        except (PageNotAnInteger, EmptyPage):
            group_page = group_paginator.page(1)

        global_patterns = config.get_classification_patterns()
        case_patterns = case.custom_patterns or {}
        fuzzy_config = config.get_fuzzy_config()
        suggestions = {}
        for g in group_page:
            result = get_fuzzy_suggestions(
                g['description'],
                case_patterns=case_patterns,
                global_patterns=global_patterns,
                fuzzy_config=fuzzy_config,
                top_n=1,
            )
            if result:
                cat, score = result[0]
                suggestions[g['description']] = {'category': cat, 'score': score}

        context['unclassified_groups'] = group_page
        context['unclassified_group_count'] = len(groups)
        context['unclassified_tx_total'] = unclassified_tx_total
        context['max_group_count'] = max_group_count
        context['group_suggestions_json'] = json.dumps(suggestions, ensure_ascii=False)

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
