"""設定ビュー"""
import json
import logging

from django.contrib import messages
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render, redirect

from ..forms import SettingsForm
from ..lib import config
from ..lib.config.defaults import DEFAULT_FUZZY_CONFIG
from ..lib.constants import sort_patterns_dict

logger = logging.getLogger(__name__)


def settings_view(request: HttpRequest) -> HttpResponse:
    """アプリケーション設定ビュー"""
    current_settings = config.load_user_settings()
    current_patterns = current_settings.get("CLASSIFICATION_PATTERNS", config.DEFAULT_PATTERNS)

    # AJAX: パターン一括変更
    if request.method == 'POST' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        action = request.POST.get('action')
        if action == 'bulk_pattern_changes':
            return _handle_settings_bulk_pattern_changes(request, current_settings, current_patterns)

    # 通常のフォーム送信
    if request.method == 'POST':
        form = SettingsForm(request.POST)
        if form.is_valid():
            new_settings = {
                "LARGE_AMOUNT_THRESHOLD": form.cleaned_data['large_amount_threshold'],
                "TRANSFER_DAYS_WINDOW": form.cleaned_data['transfer_days_window'],
                "TRANSFER_AMOUNT_TOLERANCE": form.cleaned_data['transfer_amount_tolerance'],
                "GIFT_THRESHOLD": form.cleaned_data['gift_threshold'],
                "FUZZY_MATCHING": {
                    "enabled": form.cleaned_data['fuzzy_enabled'],
                    "threshold": form.cleaned_data['fuzzy_threshold'],
                    "fallback_to_substring": True,
                    "use_token_set_ratio": True,
                },
                "CLASSIFICATION_PATTERNS": current_patterns,
            }

            config.save_user_settings(new_settings)
            messages.success(request, "分析パラメータを保存しました。")
            return redirect('settings')
    else:
        fuzzy_config = current_settings.get("FUZZY_MATCHING", DEFAULT_FUZZY_CONFIG)
        initial_data = {
            'large_amount_threshold': current_settings.get("LARGE_AMOUNT_THRESHOLD", 500000),
            'transfer_days_window': current_settings.get("TRANSFER_DAYS_WINDOW", 3),
            'transfer_amount_tolerance': current_settings.get("TRANSFER_AMOUNT_TOLERANCE", 1000),
            'gift_threshold': current_settings.get("GIFT_THRESHOLD", 1_000_000),
            'fuzzy_enabled': fuzzy_config.get("enabled", True),
            'fuzzy_threshold': fuzzy_config.get("threshold", 90),
        }
        form = SettingsForm(initial=initial_data)

    sorted_patterns = sort_patterns_dict(current_patterns)

    return render(request, 'analyzer/settings.html', {
        'form': form,
        'global_patterns': sorted_patterns,
    })


def _handle_settings_bulk_pattern_changes(
    request: HttpRequest, current_settings: dict, current_patterns: dict
) -> JsonResponse:
    """設定ページでのパターン一括変更を処理"""
    try:
        changes = json.loads(request.POST.get('changes', '[]'))
        if not changes:
            return JsonResponse({'success': False, 'error': '変更がありません'})

        new_patterns = {k: list(v) for k, v in current_patterns.items()}
        saved_count = 0

        for change in changes:
            action = change.get('action')
            category = change.get('category')
            keyword = change.get('keyword')
            scope = change.get('scope', 'global')

            if scope != 'global':
                continue

            if action == 'add':
                if category not in new_patterns:
                    new_patterns[category] = []
                if keyword and keyword not in new_patterns[category]:
                    new_patterns[category].append(keyword)
                    saved_count += 1

            elif action == 'delete':
                if category in new_patterns and keyword in new_patterns[category]:
                    new_patterns[category].remove(keyword)
                    saved_count += 1
                    if not new_patterns[category]:
                        del new_patterns[category]

        new_settings = {
            **current_settings,
            "CLASSIFICATION_PATTERNS": new_patterns,
        }
        config.save_user_settings(new_settings)

        return JsonResponse({'success': True, 'saved_count': saved_count})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSONパースエラー'})
    except Exception as e:
        logger.exception("パターン一括変更エラー")
        return JsonResponse({'success': False, 'error': str(e)})
