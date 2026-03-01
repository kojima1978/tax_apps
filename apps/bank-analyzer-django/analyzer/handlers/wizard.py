"""
インポートウィザードハンドラー

複数ファイルのCSVインポートウィザード処理を行う。
"""
import json
import logging
import math
import re

from django.contrib import messages
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect, render, get_object_or_404

import pandas as pd

from ..models import Case, Transaction
from ..services import TransactionService
from ..lib import importer
from ..lib.exceptions import CsvImportError

logger = logging.getLogger(__name__)

# ファイル名から銀行名を推測するためのパターン
BANK_NAME_PATTERNS = [
    (r'みずほ', 'みずほ銀行'),
    (r'三井住友', '三井住友銀行'),
    (r'三菱UFJ|MUFG', '三菱UFJ銀行'),
    (r'りそな', 'りそな銀行'),
    (r'ゆうちょ', 'ゆうちょ銀行'),
    (r'楽天', '楽天銀行'),
    (r'住信SBI|SBI', '住信SBIネット銀行'),
    (r'PayPay', 'PayPay銀行'),
]

# CSV→検出結果のフィールドマッピング (CSVカラム名, 検出結果キー)
_ACCOUNT_DETECT_FIELDS = [
    ('bank_name', 'bank_name'),
    ('branch_name', 'branch_name'),
    ('account_type', 'account_type'),
    ('account_number', 'account_id'),
]

# コミット時の口座情報→行のフィールドマッピング (account dict キー, row キー)
_ACCOUNT_COMMIT_FIELDS = [
    ('bank_name', 'bank_name'),
    ('branch_name', 'branch_name'),
    ('account_type', 'account_type'),
]


def _json_error(error: str, details: dict = None) -> JsonResponse:
    """標準化されたエラーJSONレスポンスを生成"""
    data = {'success': False, 'error': error}
    if details:
        data['error_details'] = details
    return JsonResponse(data)


def import_wizard(request: HttpRequest, pk: int) -> HttpResponse:
    """
    複数ファイル対応のインポートウィザード

    ステップ:
    1. ファイル選択（複数可）
    2. 口座割り当て（自動検出 + 手動入力）
    3. プレビュー＆確認
    """
    case = get_object_or_404(Case, pk=pk)

    # 既存口座の一覧を取得
    # order_by(): Meta.ordering (date, id) を除去し DISTINCT を正しく機能させる
    existing_accounts = (
        case.transactions
        .exclude(account_id__isnull=True)
        .exclude(account_id='')
        .values('bank_name', 'branch_name', 'account_type', 'account_id')
        .order_by('bank_name', 'branch_name', 'account_type', 'account_id')
        .distinct()
    )

    if request.method == 'POST':
        action = request.POST.get('action')

        # AJAXリクエスト: ファイルをパース
        if action == 'parse_files' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return _handle_parse_files(request, case)

        # フォーム送信: インポート実行
        if action == 'commit_wizard':
            return _handle_commit_wizard(request, case, pk)

    return render(request, 'analyzer/import_wizard.html', {
        'case': case,
        'existing_accounts': list(existing_accounts),
    })


def _handle_parse_files(request: HttpRequest, case: Case) -> JsonResponse:
    """
    複数CSVファイルをパースしてプレビューデータを返す

    1つのCSV内に複数口座が混在している場合、自動的に口座ごとにグルーピングする
    """
    try:
        files_data = []
        file_index = 0

        # 既存DBとの重複チェック用キー（口座番号+日付+出金+入金）
        existing_keys = build_existing_keys(case)

        while f'file_{file_index}' in request.FILES:
            csv_file = request.FILES[f'file_{file_index}']
            logger.info(f"ウィザード: ファイル解析中 - {csv_file.name}")

            try:
                result = _parse_single_file(csv_file, existing_keys)
                files_data.extend(result)

            except CsvImportError as e:
                return _json_error(
                    f"ファイル '{csv_file.name}' のエラー: {e.message}",
                    e.to_dict(),
                )

            file_index += 1

        if not files_data:
            return _json_error('ファイルが見つかりません')

        return JsonResponse({'success': True, 'files': files_data})

    except Exception as e:
        logger.exception("ウィザード: ファイル解析エラー")
        return _json_error(str(e))


def _df_to_json_safe_rows(df: pd.DataFrame) -> list[dict]:
    """DataFrame を JSON 互換の dict リストに変換（NaN → None）"""
    rows = df.to_dict(orient='records')
    for row in rows:
        for key, value in row.items():
            if isinstance(value, float) and math.isnan(value):
                row[key] = None
    return rows


def make_dedup_key(account_id, date, amount_out, amount_in) -> tuple:
    """重複チェック用のキータプルを構築"""
    return (
        account_id or '',
        str(date) if date else '',
        int(amount_out or 0),
        int(amount_in or 0),
    )


def build_existing_keys(case: Case) -> set:
    """既存取引の重複チェック用キーセットを構築"""
    existing_keys = set()
    for acct_id, dt, amt_out, amt_in in (
        Transaction.objects.filter(case=case)
        .values_list('account_id', 'date', 'amount_out', 'amount_in')
    ):
        existing_keys.add(make_dedup_key(acct_id, dt, amt_out, amt_in))
    return existing_keys


def mark_duplicates(rows: list[dict], existing_keys: set, default_account_id: str = '') -> int:
    """行に is_duplicate フラグを付与し、重複件数を返す"""
    duplicate_count = 0
    for row in rows:
        row_account_id = row.get('account_number') or default_account_id
        key = make_dedup_key(row_account_id, row.get('date', ''), row.get('amount_out'), row.get('amount_in'))
        is_dup = key in existing_keys
        row['is_duplicate'] = is_dup
        if is_dup:
            duplicate_count += 1
    return duplicate_count


def _parse_single_file(csv_file, existing_keys: set) -> list[dict]:
    """単一のCSVファイルをパースして口座ごとにグルーピング"""
    # CSV読込（複数口座混在を許可してウィザード側で分割）
    df = importer.load_csv(csv_file, allow_multiple=True)
    df = importer.validate_balance(df)

    # 日付を文字列に変換
    df['date'] = df['date'].dt.strftime('%Y-%m-%d').replace('NaT', None)

    rows = _df_to_json_safe_rows(df)

    # CSV内の口座をグルーピング（bank_name + account_number の組み合わせ）
    account_groups = _group_rows_by_account(rows)

    # 口座が1つだけの場合、またはCSVに口座情報がない場合
    if len(account_groups) <= 1:
        return _process_single_account_file(csv_file.name, df, rows, existing_keys)
    else:
        return _process_multi_account_file(csv_file.name, account_groups, existing_keys)


def _group_rows_by_account(rows: list[dict]) -> dict:
    """行を口座（銀行名+口座番号）でグルーピング"""
    account_groups = {}
    for row in rows:
        bank_name = row.get('bank_name') or ''
        account_number = row.get('account_number') or ''
        branch_name = row.get('branch_name') or ''
        account_type = row.get('account_type') or ''

        # グループキー: (銀行名, 口座番号)
        group_key = (bank_name, account_number)

        if group_key not in account_groups:
            account_groups[group_key] = {
                'bank_name': bank_name,
                'branch_name': branch_name,
                'account_type': account_type,
                'account_id': account_number,
                'rows': []
            }

        account_groups[group_key]['rows'].append(row)

    return account_groups


def _process_single_account_file(filename: str, df: pd.DataFrame, rows: list[dict], existing_keys: set) -> list[dict]:
    """単一口座のCSVファイルを処理"""
    detected_account = _detect_account_from_csv(df, filename)
    detected_account_id = detected_account.get('account_id', '')

    duplicate_count = mark_duplicates(rows, existing_keys, detected_account_id)

    return [{
        'filename': filename,
        'row_count': len(rows),
        'duplicate_count': duplicate_count,
        'detected_account': detected_account,
        'rows': rows,
    }]


def _process_multi_account_file(filename: str, account_groups: dict, existing_keys: set) -> list[dict]:
    """複数口座を含むCSVファイルを処理（口座ごとに分割）"""
    logger.info(f"ウィザード: {filename} に {len(account_groups)} 口座を検出")

    files_data = []
    for group_key, group_data in account_groups.items():
        group_rows = group_data['rows']
        account_id = group_data['account_id']

        # 口座グループごとに残高検証を再計算
        if len(group_rows) > 0:
            group_df = pd.DataFrame(group_rows)
            # 日付を datetime に戻す（validate_balance が期待する形式）
            group_df['date'] = pd.to_datetime(group_df['date'])
            # 残高検証を実行
            group_df = importer.validate_balance(group_df)
            # 日付を文字列に戻す
            group_df['date'] = group_df['date'].dt.strftime('%Y-%m-%d').replace('NaT', None)
            group_rows = _df_to_json_safe_rows(group_df)

        # 重複チェック
        duplicate_count = mark_duplicates(group_rows, existing_keys, account_id)

        # 口座名を生成
        display_name = group_data['bank_name'] or '不明'
        if account_id:
            display_name += f" ({account_id})"

        files_data.append({
            'filename': f"{filename} - {display_name}",
            'original_filename': filename,
            'row_count': len(group_rows),
            'duplicate_count': duplicate_count,
            'detected_account': {
                'bank_name': group_data['bank_name'],
                'branch_name': group_data['branch_name'],
                'account_type': group_data['account_type'],
                'account_id': account_id,
            },
            'rows': group_rows,
            'is_split': True,  # 分割されたことを示すフラグ
        })

    return files_data


def _detect_account_from_csv(df: pd.DataFrame, filename: str) -> dict:
    """
    CSVデータやファイル名から口座情報を推測

    Returns:
        {'bank_name': str, 'branch_name': str, 'account_type': str, 'account_id': str}
    """
    detected = {key: '' for _, key in _ACCOUNT_DETECT_FIELDS}

    # データフレームから抽出（最初の行から）
    if not df.empty:
        first_row = df.iloc[0]
        for csv_col, detect_key in _ACCOUNT_DETECT_FIELDS:
            if csv_col in df.columns and pd.notna(first_row.get(csv_col)):
                detected[detect_key] = str(first_row[csv_col])

    # ファイル名からの推測（例: "みずほ銀行_1234567.csv"）
    if not detected['bank_name']:
        for pattern, bank_name in BANK_NAME_PATTERNS:
            if re.search(pattern, filename, re.IGNORECASE):
                detected['bank_name'] = bank_name
                break

    # ファイル名から口座番号を推測（7-8桁の数字）
    if not detected['account_id']:
        account_match = re.search(r'(\d{7,8})', filename)
        if account_match:
            detected['account_id'] = account_match.group(1)

    return detected


def _handle_commit_wizard(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    """ウィザードからのインポート実行"""
    try:
        wizard_data = json.loads(request.POST.get('wizard_data', '{}'))
        files = wizard_data.get('files', [])
        duplicate_action = wizard_data.get('duplicateAction', 'skip')

        if not files:
            messages.error(request, 'インポートデータがありません')
            return redirect('import-wizard', pk=pk)

        # 既存DBの重複チェック用キーを構築
        existing_keys = build_existing_keys(case)

        total_imported = 0
        total_skipped = 0

        for file_data in files:
            account = file_data.get('account', {})
            rows = file_data.get('rows', [])
            final_account_id = account.get('account_id', '')

            # 口座情報を各行に設定し、最終的な口座番号で重複を再チェック
            filtered_rows = []
            for row in rows:
                for acct_key, row_key in _ACCOUNT_COMMIT_FIELDS:
                    row[row_key] = account.get(acct_key, '')
                row['account_number'] = final_account_id

                # 最終口座番号で重複チェック
                key = make_dedup_key(final_account_id, row.get('date', ''), row.get('amount_out'), row.get('amount_in'))
                is_duplicate = key in existing_keys

                if duplicate_action == 'skip' and is_duplicate:
                    total_skipped += 1
                    continue

                filtered_rows.append(row)
                # インポート後の重複も検知するためキーを追加
                existing_keys.add(key)

            if not filtered_rows:
                continue

            # インポート実行
            count = TransactionService.commit_import(case, filtered_rows)
            total_imported += count

            logger.info(f"ウィザードインポート完了: case_id={pk}, file={file_data.get('filename')}, count={count}")

        # 結果メッセージ
        if total_skipped > 0:
            messages.success(request, f'{total_imported}件の取引を取り込みました（{total_skipped}件の重複をスキップ）')
        else:
            messages.success(request, f'{total_imported}件の取引を取り込みました')
        return redirect('case-detail', pk=pk)

    except Exception as e:
        logger.exception(f"ウィザードインポートエラー: case_id={pk}")
        messages.error(request, f'インポートエラー: {str(e)}')
        return redirect('import-wizard', pk=pk)
