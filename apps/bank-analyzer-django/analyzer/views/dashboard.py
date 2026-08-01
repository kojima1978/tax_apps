"""分析ダッシュボードビュー"""
import json
import logging

import pandas as pd
from django.contrib import messages
from django.db.models import Sum, Count, Min, Max, Q
from django.db.models.functions import TruncMonth
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404

from ..models import Case
from ..lib import config
from ..lib.constants import (
    UNCATEGORIZED,
    STANDARD_CATEGORIES,
    sort_categories,
    sort_patterns_dict,
)
from ..lib.text_utils import filter_by_keyword
from ..services import ClassificationHistoryService, TransactionService, AnalysisService
from ..handlers import (
    handle_run_classifier,
    handle_apply_rules,
    handle_delete_account,
    handle_update_category,
    handle_bulk_update_categories,
    handle_bulk_update_categories_transfer,
    handle_undo_classification_change,
    handle_update_transaction,
    handle_delete_duplicates,
    handle_delete_by_range,
    handle_restore_range_backup,
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
    handle_preview_pattern_impact,
    handle_bulk_pattern_changes,
    handle_run_auto_classify,
)
from ._helpers import paginate, build_filter_state, get_sort_order_by, get_per_page

logger = logging.getLogger(__name__)

ANALYSIS_TABS = {
    'overview',
    'all',
    'unclassified',
    'ai',
    'transfers',
    'cleanup',
    'flagged',
}

# 分析ダッシュボードのアクション → ハンドラー関数マッピング
_ANALYSIS_ACTION_HANDLERS = {
    'run_classifier': handle_run_classifier,
    'apply_rules': handle_apply_rules,
    'delete_account': handle_delete_account,
    'update_category': handle_update_category,
    'bulk_update_categories': handle_bulk_update_categories,
    'bulk_update_transfer_categories': handle_bulk_update_categories_transfer,
    'undo_classification_change': handle_undo_classification_change,
    'update_transaction': handle_update_transaction,
    'delete_duplicates': handle_delete_duplicates,
    'delete_by_range': handle_delete_by_range,
    'restore_range_backup': handle_restore_range_backup,
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
    'preview_pattern_impact': handle_preview_pattern_impact,
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
        return filtered.count(), paginate(filtered, page, per_page)
    return queryset.count(), paginate(queryset, page, per_page)


def _build_selection_options(case):
    """フォーム選択肢をDataFrame化せずDBから構築する。"""
    account_rows = list(
        case.accounts.values('bank_name', 'branch_name', 'account_number')
    )
    banks = sorted({row['bank_name'] for row in account_rows if row['bank_name']})
    branches = sorted({row['branch_name'] for row in account_rows if row['branch_name']})
    accounts = sorted({row['account_number'] for row in account_rows if row['account_number']})

    bank_to_accounts = {}
    for row in account_rows:
        bank = row['bank_name']
        account = row['account_number']
        if bank and account:
            bank_to_accounts.setdefault(bank, set()).add(account)
    bank_to_accounts = {
        bank: sorted(account_numbers)
        for bank, account_numbers in bank_to_accounts.items()
    }

    categories = set(
        case.transactions.exclude(category='').values_list('category', flat=True).distinct()
    )
    categories.update(STANDARD_CATEGORIES)
    categories.update(config.get_merged_patterns(case).keys())

    return {
        'banks': banks,
        'branches': branches,
        'accounts': accounts,
        'categories': sort_categories(categories),
        'bank_to_accounts_json': json.dumps(bank_to_accounts, ensure_ascii=False),
    }


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
    totals = all_txs_qs.aggregate(
        total_out=Sum('amount_out'),
        total_in=Sum('amount_in'),
        incoming_tx_count=Count('id', filter=Q(amount_in__gt=0)),
        outgoing_tx_count=Count('id', filter=Q(amount_out__gt=0)),
        earliest_date=Min('date'),
        latest_date=Max('date'),
    )
    total_out = totals['total_out'] or 0
    total_in = totals['total_in'] or 0
    flagged_count = all_txs_qs.filter(is_flagged=True).count()
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
        'total_out': total_out,
        'total_in': total_in,
        'incoming_tx_count': totals['incoming_tx_count'],
        'outgoing_tx_count': totals['outgoing_tx_count'],
        'net_flow': total_in - total_out,
        'flagged_count': flagged_count,
        'earliest_transaction_date': totals['earliest_date'],
        'latest_transaction_date': totals['latest_date'],
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
    unclassified_qs = case.transactions.with_account_info().filter(
        category=UNCATEGORIZED,
    ).order_by(*sort_order)
    group_data = AnalysisService.build_unclassified_groups(unclassified_qs, keyword)
    group_page = paginate(group_data['groups'], request.GET.get('group_page', 1), 50)

    return {
        'unclassified_groups': group_page,
        'unclassified_group_count': len(group_data['groups']),
        'unclassified_tx_total': group_data['tx_total'],
        'max_group_count': group_data['max_group_count'],
        'group_suggestions_json': AnalysisService.build_group_suggestions(group_page, case),
    }


def _build_active_tab_context(request, case, active_tab, filter_state):
    """表示対象タブに必要なデータだけを構築する。"""
    keyword = filter_state.get('keyword', '')
    per_page = get_per_page(request)
    sort_param = filter_state.get('sort', '')
    sort_order = get_sort_order_by(sort_param, default='date_asc')
    transactions = case.transactions.with_account_info().order_by(*sort_order)

    if active_tab == 'overview':
        return {
            'account_summary': AnalysisService._build_account_summary(case),
            **_build_chart_data(case),
        }

    if active_tab == 'all':
        filtered = AnalysisService.apply_filters(transactions, filter_state)
        all_txs_count, all_txs_page = _filter_and_paginate(
            filtered, '', request.GET.get('page', 1), per_page,
        )
        return {
            'all_txs': all_txs_page,
            'all_txs_count': all_txs_count,
        }

    if active_tab == 'unclassified':
        unclassified_qs = transactions.filter(
            category=UNCATEGORIZED,
        )
        _, unclassified_page = _filter_and_paginate(
            unclassified_qs,
            keyword,
            request.GET.get('unclassified_page', 1),
            per_page,
        )
        return {
            'unclassified_txs': unclassified_page,
            **_build_unclassified_context(
                request,
                case,
                sort_order,
                keyword,
            ),
        }

    if active_tab == 'ai':
        ai_data = AnalysisService._build_ai_suggestions(case, filter_state)
        ai_groups = ai_data.get('ai_groups', [])
        return {
            **ai_data,
            'high_confidence_groups': [
                group for group in ai_groups if group.get('score', 0) >= 95
            ],
            'high_confidence_tx_count': sum(
                group.get('count', 0)
                for group in ai_groups
                if group.get('score', 0) >= 95
            ),
            'ai_groups_json': json.dumps(
                [{key: value for key, value in group.items() if key != 'sample_date'}
                 for group in ai_groups],
                ensure_ascii=False,
            ),
            'global_patterns': sort_patterns_dict(config.get_classification_patterns()),
            'case_patterns': sort_patterns_dict(case.custom_patterns or {}),
        }

    if active_tab in {'transfers', 'cleanup'}:
        df = pd.DataFrame(list(transactions.values()))
        if active_tab == 'transfers':
            transfer_pairs = AnalysisService._build_transfer_data(
                df,
                filter_state,
                sort_param,
            )
            return {
                'transfer_pairs': transfer_pairs,
                **_build_transfer_context(transfer_pairs),
            }
        return {
            'duplicate_txs': AnalysisService._get_duplicate_transactions(df),
        }

    flagged_qs = filter_by_keyword(
        transactions.filter(is_flagged=True),
        keyword,
    )
    return {
        'flagged_txs': list(flagged_qs),
    }


def analysis_dashboard(request: HttpRequest, pk: int) -> HttpResponse:
    """分析・表示ダッシュボード"""
    case = get_object_or_404(Case, pk=pk)

    if request.method == 'POST':
        return _handle_analysis_post(request, case, pk)

    active_tab = request.GET.get('tab', 'overview')
    if active_tab not in ANALYSIS_TABS:
        active_tab = 'overview'
    filter_state = build_filter_state(request, include_tab_filters=True)

    tx_counts = case.transactions.aggregate(
        total=Count('id'),
        unclassified=Count(
            'id',
            filter=Q(category=UNCATEGORIZED),
        ),
        flagged=Count('id', filter=Q(is_flagged=True)),
    )
    if not tx_counts['total']:
        return render(request, 'analyzer/analysis.html', {
            'case': case,
            'no_data': True,
            'active_tab': active_tab,
            'filter_state': filter_state,
            'latest_deletion_backup': case.deletion_backups.filter(restored_at__isnull=True).first(),
        })

    classified_count = tx_counts['total'] - tx_counts['unclassified']
    classified_pct = round(
        classified_count / tx_counts['total'] * 100,
        1,
    )
    context = {
        'case': case,
        'active_tab': active_tab,
        'filter_state': filter_state,
        'total_tx_count': tx_counts['total'],
        'classified_count': classified_count,
        'classified_pct': classified_pct,
        'unclassified_count': tx_counts['unclassified'],
        'flagged_count': tx_counts['flagged'],
        'suggestions_count': 0,
        'latest_deletion_backup': case.deletion_backups.filter(restored_at__isnull=True).first(),
        'latest_classification_change': ClassificationHistoryService.latest_summary(case),
        **_build_selection_options(case),
        **_build_active_tab_context(request, case, active_tab, filter_state),
    }

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
