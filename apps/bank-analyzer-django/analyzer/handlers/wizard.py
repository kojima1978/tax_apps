"""
インポートウィザードハンドラー

複数ファイルのCSVインポートウィザード処理を行う。
"""
import json
import logging
import math
import re
from collections import Counter

from django.contrib import messages
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect, render, get_object_or_404

import pandas as pd

from ..models import Case, Transaction
from ..services import TransactionService
from ..lib import importer
from ..lib.exceptions import CsvImportError
from .base import json_error

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
    ('account_number', 'account_number'),
]

# コミット時の口座情報→行のフィールドマッピング (account dict キー, row キー)
_ACCOUNT_COMMIT_FIELDS = [
    ('bank_name', 'bank_name'),
    ('branch_name', 'branch_name'),
    ('account_type', 'account_type'),
]


def import_wizard(request: HttpRequest, pk: int) -> HttpResponse:
    """
    複数ファイル対応のインポートウィザード

    ステップ:
    1. ファイル選択（複数可）
    2. 口座割り当て（自動検出 + 手動入力）
    3. プレビュー＆確認
    """
    case = get_object_or_404(Case, pk=pk)

    # 既存口座の一覧を Account テーブルから取得
    existing_accounts = list(
        case.accounts
        .values('bank_name', 'branch_name', 'account_type', 'account_number')
        .order_by('bank_name', 'branch_name', 'account_type', 'account_number')
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
        'existing_accounts': existing_accounts,
    })


def _handle_parse_files(request: HttpRequest, case: Case) -> JsonResponse:
    """
    複数CSVファイルをパースしてプレビューデータを返す

    1つのCSV内に複数口座が混在している場合、自動的に口座ごとにグルーピングする
    """
    try:
        files_data = []
        file_index = 0

        # 既存DBとの重複チェック用インデックス（件数 + 残高）
        # 複数ファイルをまたいで消費するため共有する
        existing_counts, existing_balances = build_existing_index(case)

        while f'file_{file_index}' in request.FILES:
            csv_file = request.FILES[f'file_{file_index}']
            logger.info(f"ウィザード: ファイル解析中 - {csv_file.name}")

            try:
                result = _parse_single_file(csv_file, existing_counts, existing_balances)
                files_data.extend(result)

            except CsvImportError as e:
                return json_error(
                    f"ファイル '{csv_file.name}' のエラー: {e.message}",
                    details=e.to_dict(),
                )

            file_index += 1

        if not files_data:
            return json_error('ファイルが見つかりません')

        return JsonResponse({'success': True, 'files': files_data})

    except Exception as e:
        logger.exception("ウィザード: ファイル解析エラー")
        return json_error(str(e))


def _df_to_json_safe_rows(df: pd.DataFrame) -> list[dict]:
    """DataFrame を JSON 互換の dict リストに変換（NaN → None）"""
    rows = df.to_dict(orient='records')
    for row in rows:
        for key, value in row.items():
            if isinstance(value, float) and math.isnan(value):
                row[key] = None
    return rows


# 重複インポートの事前アラート閾値
# - 既存データと連続一致した行数がこの値以上 → 重複インポートの可能性大として警告
DUPLICATE_RUN_THRESHOLD = 3
# - ファイル内の重複候補の割合がこの値以上(かつ最低件数以上) → 警告
DUPLICATE_RATIO_THRESHOLD = 0.3
DUPLICATE_RATIO_MIN_COUNT = 3


def make_dedup_key(account_number, date, amount_out, amount_in, description='') -> tuple:
    """重複チェック用のキータプルを構築

    同じ日・同じ金額でも摘要が異なれば別取引として区別できるよう、
    摘要(description)もキーに含める。残高は確信度判定で別途使う。
    """
    return (
        account_number or '',
        str(date) if date else '',
        int(amount_out or 0),
        int(amount_in or 0),
        (description or '').strip(),
    )


def _norm_balance(value):
    """残高を比較用に正規化する（None / NaN / 数値化不能は None）"""
    if value is None:
        return None
    try:
        if isinstance(value, float) and math.isnan(value):
            return None
        return int(value)
    except (ValueError, TypeError):
        return None


def _row_dedup_key(row: dict, default_account_number: str = '') -> tuple:
    """行から重複チェックキーを構築"""
    account_number = row.get('account_number') or default_account_number
    return make_dedup_key(
        account_number, row.get('date', ''),
        row.get('amount_out'), row.get('amount_in'), row.get('description'),
    )


def build_existing_index(case: Case) -> tuple[Counter, dict]:
    """既存取引の重複チェック用インデックスを構築

    Returns:
        (counts, balances)
        counts:   キー -> 件数 の Counter（多重集合）。DBにある件数分だけを
                  重複としてスキップし、超過分は新規として取り込むための土台。
        balances: キー -> {残高: 件数} の dict。同じ日・同じ金額でも残高が
                  一致するか否かで「重複の確信度」を判定するために使う。
    """
    counts = Counter()
    balances: dict = {}
    for acct_num, dt, amt_out, amt_in, desc, bal in (
        Transaction.objects.filter(case=case)
        .select_related('account')
        .values_list(
            'account__account_number', 'date', 'amount_out', 'amount_in',
            'description', 'balance',
        )
    ):
        key = make_dedup_key(acct_num, dt, amt_out, amt_in, desc)
        counts[key] += 1
        balances.setdefault(key, Counter())[_norm_balance(bal)] += 1
    return counts, balances


def build_existing_counts(case: Case) -> Counter:
    """既存取引の重複チェック用キー件数(多重集合)のみを返す薄いラッパー"""
    counts, _ = build_existing_index(case)
    return counts


def mark_duplicates(
    rows: list[dict],
    remaining_counts: Counter,
    remaining_balances: dict | None = None,
    default_account_number: str = '',
) -> int:
    """行に is_duplicate / dup_confidence を付与し、重複件数を返す

    remaining_counts はDBに存在する同一キーの「残り件数」。CSV内に同じ日・
    同じ金額・同じ摘要の行が複数あっても、DBにある件数分だけを重複と判定し、
    超過分は新規(is_duplicate=False)として扱う。呼び出すたびに remaining_counts を
    消費するため、複数ファイル・複数口座をまたいでも整合的に判定できる。

    remaining_balances を渡すと残高ベースの確信度を付与する:
      - dup_confidence='high': DBの取引と残高まで一致（ほぼ確実に重複）
      - dup_confidence='low' : キーは一致するが残高が無い/合わない（要確認）
    残高一致する行を優先して重複と判定するため、同じ日・同じ金額が複数あっても
    「本当に既存と同じ行」を選んでスキップできる。
    """
    for row in rows:
        row['is_duplicate'] = False
        row['dup_confidence'] = None

    duplicate_count = 0

    # Pass 1: 残高まで一致する行を優先して高確信度の重複としてマーク
    if remaining_balances is not None:
        for row in rows:
            key = _row_dedup_key(row, default_account_number)
            if remaining_counts[key] <= 0:
                continue
            bal = _norm_balance(row.get('balance'))
            bal_counter = remaining_balances.get(key)
            if bal is not None and bal_counter and bal_counter[bal] > 0:
                row['is_duplicate'] = True
                row['dup_confidence'] = 'high'
                remaining_counts[key] -= 1
                bal_counter[bal] -= 1
                duplicate_count += 1

    # Pass 2: 残りの件数分を重複としてマーク（残高なし/不一致 = 低確信度）
    for row in rows:
        if row['is_duplicate']:
            continue
        key = _row_dedup_key(row, default_account_number)
        if remaining_counts[key] > 0:
            row['is_duplicate'] = True
            row['dup_confidence'] = 'low' if remaining_balances is not None else None
            remaining_counts[key] -= 1
            duplicate_count += 1
            if remaining_balances is not None:
                _consume_balance_slot(remaining_balances.get(key), row.get('balance'))

    return duplicate_count


def _consume_balance_slot(bal_counter, raw_balance) -> None:
    """低確信度の重複に対応する残高スロットを1つ消費して整合を保つ"""
    if not bal_counter:
        return
    bal = _norm_balance(raw_balance)
    if bal is not None and bal_counter[bal] > 0:
        bal_counter[bal] -= 1
        return
    for candidate, count in list(bal_counter.items()):
        if count > 0:
            bal_counter[candidate] -= 1
            return


def max_duplicate_run(rows: list[dict]) -> int:
    """重複候補が連続している最大の行数を返す（ファイル重なり検知用）"""
    longest = current = 0
    for row in rows:
        if row.get('is_duplicate'):
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return longest


def build_duplicate_warning(rows: list[dict], duplicate_count: int, row_count: int) -> dict | None:
    """重複の連続性・割合からインポート前アラートを生成（無ければ None）

    「ある程度同じパターンが続く」場合に、コミット前にユーザーへ注意喚起する。
    """
    if duplicate_count <= 0 or row_count <= 0:
        return None

    run = max_duplicate_run(rows)
    ratio = duplicate_count / row_count
    by_run = run >= DUPLICATE_RUN_THRESHOLD
    by_ratio = duplicate_count >= DUPLICATE_RATIO_MIN_COUNT and ratio >= DUPLICATE_RATIO_THRESHOLD

    if not (by_run or by_ratio):
        return None

    if by_run:
        message = f"既存データと {run} 行連続で一致しています。重複インポートの可能性が高いです。"
    else:
        message = f"{row_count} 件中 {duplicate_count} 件（{round(ratio * 100)}%）が既存データと一致しています。"

    return {
        'max_run': run,
        'ratio': round(ratio, 2),
        'duplicate_count': duplicate_count,
        'message': message,
    }


def _parse_single_file(csv_file, existing_counts: Counter, existing_balances: dict) -> list[dict]:
    """単一のCSVファイルをパースして口座ごとにグルーピング"""
    # CSV読込（複数口座混在を許可してウィザード側で分割）
    df = importer.load_csv(csv_file, allow_multiple=True)
    has_balance = df.attrs.get("has_balance", True)
    df = importer.validate_balance(df)

    # 日付を文字列に変換
    df['date'] = df['date'].dt.strftime('%Y-%m-%d').replace('NaT', None)

    rows = _df_to_json_safe_rows(df)

    # CSV内の口座をグルーピング（bank_name + account_number の組み合わせ）
    account_groups = _group_rows_by_account(rows)

    # 口座が1つだけの場合、またはCSVに口座情報がない場合
    if len(account_groups) <= 1:
        return _process_single_account_file(csv_file.name, df, rows, existing_counts, existing_balances, has_balance)
    else:
        return _process_multi_account_file(csv_file.name, account_groups, existing_counts, existing_balances, has_balance)


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
                'account_number': account_number,
                'rows': []
            }

        account_groups[group_key]['rows'].append(row)

    return account_groups


def _process_single_account_file(filename: str, df: pd.DataFrame, rows: list[dict], existing_counts: Counter, existing_balances: dict, has_balance: bool = True) -> list[dict]:
    """単一口座のCSVファイルを処理"""
    detected_account = _detect_account_from_csv(df, filename)
    detected_account_number = detected_account.get('account_number', '')

    duplicate_count = mark_duplicates(rows, existing_counts, existing_balances, detected_account_number)
    warning = build_duplicate_warning(rows, duplicate_count, len(rows))

    return [{
        'filename': filename,
        'row_count': len(rows),
        'duplicate_count': duplicate_count,
        'duplicate_run': max_duplicate_run(rows),
        'warning': warning,
        'detected_account': detected_account,
        'has_balance': has_balance,
        'rows': rows,
    }]


def _process_multi_account_file(filename: str, account_groups: dict, existing_counts: Counter, existing_balances: dict, has_balance: bool = True) -> list[dict]:
    """複数口座を含むCSVファイルを処理（口座ごとに分割）"""
    logger.info(f"ウィザード: {filename} に {len(account_groups)} 口座を検出")

    files_data = []
    for group_key, group_data in account_groups.items():
        group_rows = group_data['rows']
        account_number = group_data['account_number']

        # 口座グループごとに残高検証を再計算
        if len(group_rows) > 0:
            group_df = pd.DataFrame(group_rows)
            # 日付を datetime に戻す（validate_balance が期待する形式）
            group_df['date'] = pd.to_datetime(group_df['date'])
            # has_balance フラグを引き継ぐ（なければ validate_balance が None で演算エラー）
            group_df.attrs["has_balance"] = has_balance
            # 残高検証を実行
            group_df = importer.validate_balance(group_df)
            # 日付を文字列に戻す
            group_df['date'] = group_df['date'].dt.strftime('%Y-%m-%d').replace('NaT', None)
            group_rows = _df_to_json_safe_rows(group_df)

        # 重複チェック
        duplicate_count = mark_duplicates(group_rows, existing_counts, existing_balances, account_number)
        warning = build_duplicate_warning(group_rows, duplicate_count, len(group_rows))

        # 口座名を生成
        display_name = group_data['bank_name'] or '不明'
        if account_number:
            display_name += f" ({account_number})"

        files_data.append({
            'filename': f"{filename} - {display_name}",
            'original_filename': filename,
            'row_count': len(group_rows),
            'duplicate_count': duplicate_count,
            'duplicate_run': max_duplicate_run(group_rows),
            'warning': warning,
            'detected_account': {
                'bank_name': group_data['bank_name'],
                'branch_name': group_data['branch_name'],
                'account_type': group_data['account_type'],
                'account_number': account_number,
            },
            'has_balance': has_balance,
            'rows': group_rows,
            'is_split': True,  # 分割されたことを示すフラグ
        })

    return files_data


def _detect_account_from_csv(df: pd.DataFrame, filename: str) -> dict:
    """
    CSVデータやファイル名から口座情報を推測

    Returns:
        {'bank_name': str, 'branch_name': str, 'account_type': str, 'account_number': str}
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
    if not detected['account_number']:
        account_match = re.search(r'(\d{7,8})', filename)
        if account_match:
            detected['account_number'] = account_match.group(1)

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

        # 既存DBの重複チェック用インデックス（件数 + 残高）を構築
        # DBにある件数分だけをスキップし、CSV内の同じ日・同じ金額・同じ摘要の
        # 取引（2件目以降）は新規として取り込めるようにする。残高一致で確信度判定。
        remaining_counts, remaining_balances = build_existing_index(case)

        total_imported = 0
        total_skipped = 0

        for file_data in files:
            account = file_data.get('account', {})
            rows = file_data.get('rows', [])
            final_account_number = account.get('account_number', '')

            # 口座情報を各行に設定（最終的な口座番号で重複を再チェックするため）
            for row in rows:
                for acct_key, row_key in _ACCOUNT_COMMIT_FIELDS:
                    row[row_key] = account.get(acct_key, '')
                row['account_number'] = final_account_number

            # プレビューと同一ロジックで重複を判定（残高一致で確信度を付与）
            mark_duplicates(rows, remaining_counts, remaining_balances, final_account_number)

            if duplicate_action == 'skip':
                filtered_rows = [row for row in rows if not row.get('is_duplicate')]
                total_skipped += len(rows) - len(filtered_rows)
            else:
                filtered_rows = rows

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
        return redirect('analysis-dashboard', pk=pk)

    except Exception as e:
        logger.exception(f"ウィザードインポートエラー: case_id={pk}")
        messages.error(request, f'インポートエラー: {str(e)}')
        return redirect('import-wizard', pk=pk)
