"""正解記録（dump_golden）の入力ファイルを作る。

ここに並ぶ取引はすべて架空。実在の口座・人名は1つも入れないこと（リポジトリは公開）。
残高は行の並びから計算して埋めるので、整合している行はわざわざ数字を合わせなくてよい。

    python make_inputs.py <出力先 inputs/files>

Shift_JIS と xlsx を作るために Python で書いている（openpyxl が要る。
旧 bank-analyzer-django のイメージに入っていた。作り直し方は README）。
"""
import sys
from pathlib import Path

from openpyxl import Workbook

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

FULL_HEADER = ["銀行名", "支店名", "口座番号", "種別", "日付", "摘要", "払戻額", "お預り額", "差引残高"]
SHORT_HEADER = ["日付", "摘要", "払戻額", "お預り額", "差引残高"]


def with_balance(rows, start):
    """(日付, 摘要, 出金, 入金) の並びに、上から順に計算した残高を付ける"""
    out, bal = [], start
    for d, desc, o, i in rows:
        bal = bal - (o or 0) + (i or 0)
        out.append([d, desc, fmt(o), fmt(i), fmt(bal)])
    return out


def fmt(v):
    return "" if v in (None, 0) else f"{v}"


def write_csv(name, header, rows, *, encoding="utf-8", newline="\n"):
    text = newline.join(",".join(str(c) for c in r) for r in [header, *rows]) + newline
    (OUT / name).write_bytes(text.encode(encoding))


def account(bank, branch, number, kind, rows):
    return [[bank, branch, number, kind, *r] for r in rows]


# ---------------------------------------------------------------------------
# 資金移動・多額・贈与・分類（2口座）
# ---------------------------------------------------------------------------
A = ("テスト銀行", "本店", "1111111", "普通")
B = ("サンプル信用金庫", "駅前支店", "2222222", "普通")

a_rows = with_balance([
    ("R6.4.1", "振込 サンプルシンキン", 1_000_000, 0),      # B が 999,560 受取（手数料440）
    ("R6.4.1", "ATM", 10_000, 0),
    ("R6.4.1", "ATM", 10_000, 0),                         # 同日・同額・同摘要（重複候補）
    ("R6.4.5", "振替 駅前", 300_000, 0),                   # B が 3日後に受取（窓の端）
    ("R6.4.10", "振替 駅前", 200_000, 0),                  # B が 4日後に受取（窓の外）
    ("R6.4.15", "振替 駅前", 150_000, 0),                  # B の受取が 1,001 少ない（許容の外）
    ("R6.4.20", "振替 駅前", 50_000, 0),                   # 候補2件（金額差の小さい方を選ぶ）
    ("R6.4.25", "振替 駅前", 80_000, 0),                   # B の受取が前日（after_only では対象外）
    ("R6.4.28", "振込 ヤマダハナコ", 1_500_000, 0),          # 贈与（閾値以上）
    ("R6.4.30", "振込 ヤマダジロウ", 999_999, 0),            # 閾値未満
    ("R6.5.1", "ﾈﾝｷﾝ ｺｳｾｲﾛｳﾄﾞｳｼｮｳ", 0, 500_000),          # 多額の境界ちょうど
    ("R6.5.2", "ｶ)ﾔﾏﾀﾞｼｮｳｼﾞ ｷﾕｳﾖ", 0, 499_999),
    ("R6.5.10", "ﾃﾞﾝｷﾘﾖｳ", 8_800, 0),
    ("R6.5.11", "ｾﾌﾞﾝｲﾚﾌﾞﾝ", 1_200, 0),
    ("R6.5.12", "docomo ご利用料金", 6_500, 0),
    ("R6.5.13", "ａｕ　料金", 4_300, 0),
    ("R6.5.14", "ニホンセイメイ", 12_000, 0),
    ("R6.5.15", "ノムラショウケン", 200_000, 0),
    ("R6.5.16", "固定資産税", 45_000, 0),
    ("R6.5.17", "定期預金 満期", 0, 1_000_000),
    ("R6.5.18", "利息", 0, 12),
    ("R6.5.19", "ｺｳｻﾞﾌﾘｶｴ ｶｰﾄﾞ", 33_000, 0),
    ("R6.5.20", "カード", 2_000, 0),
    ("R6.6.3", "マンシヨン カンリヒ", 15_000, 0),
    ("R6.6.4", "家賃 6月分", 0, 120_000),
], 5_000_000)

b_rows = with_balance([
    ("R6.4.1", "振込 テストギンコウ", 0, 999_560),
    ("R6.4.8", "振替 本店", 0, 300_000),
    ("R6.4.14", "振替 本店", 0, 200_000),
    ("R6.4.15", "振替 本店", 0, 148_999),
    ("R6.4.20", "振替 本店", 0, 50_500),
    ("R6.4.22", "振替 本店", 0, 50_000),
    ("R6.4.24", "振替 本店", 0, 80_000),
    ("R6.5.1", "ATM", 30_000, 0),
    ("R6.5.25", "給与 カ)サンプルコウギョウ", 0, 280_000),
], 1_000_000)

write_csv("transfer_a.csv", FULL_HEADER, account(*A, a_rows))
write_csv("transfer_b.csv", FULL_HEADER, account(*B, b_rows))

# 2口座を1ファイルに混ぜたもの（ウィザードが口座ごとに分ける）
mixed = []
for ra, rb in zip(account(*A, a_rows[:9]), account(*B, b_rows)):
    mixed += [ra, rb]
write_csv("multi_account.csv", FULL_HEADER, mixed)

# ---------------------------------------------------------------------------
# 重複取込（前半は既存と同じ、1行だけ残高違い、後半は新規）
# ---------------------------------------------------------------------------
overlap = [list(r) for r in account(*A, a_rows[:6])]
overlap[2][-1] = "1"  # 残高だけ違う → 低確信度の重複
overlap += account(*A, with_balance([
    ("R6.7.1", "ATM", 5_000, 0),
    ("R6.7.2", "イオン", 3_000, 0),
], int(a_rows[-1][-1])))
write_csv("overlap_a.csv", FULL_HEADER, overlap)

# ---------------------------------------------------------------------------
# 取込の境界ケース（§3 の5件ほか）
# ---------------------------------------------------------------------------
simple = with_balance([
    ("R3.4.1", "ATM", 10_000, 0),
    ("R3.4.2", "給与", 0, 200_000),
    ("R3.4.3", "イオン", 3_000, 0),
], 100_000)

write_csv("e01_leading_zero_account.csv", FULL_HEADER,
          account("テスト銀行", "本店", "0012345", "普通", simple))

e02 = [list(r) for r in simple]
e02[1][-1] = ""
write_csv("e02_blank_balance.csv", SHORT_HEADER, e02)

e03 = [list(r) for r in simple]
e03[1][0] = "2021/4/2"
write_csv("e03_mixed_wareki_seireki.csv", SHORT_HEADER, e03)

write_csv("e04_decimal_amount.csv", SHORT_HEADER, [
    ["R3.4.1", "利息", "", "100.7", "100100.7"],
    ["R3.4.2", "ATM", "1000", "", "99100.7"],
])

write_csv("e05_us_date.csv", SHORT_HEADER, [
    ["04/03/2021", "ATM", "1000", "", "99000"],
    ["04/15/2021", "ATM", "1000", "", "98000"],
])

write_csv("e06_cp932_crlf.csv", SHORT_HEADER, simple, encoding="cp932", newline="\r\n")
write_csv("e07_utf8bom_crlf.csv", SHORT_HEADER, simple, encoding="utf-8-sig", newline="\r\n")

(OUT / "e08_title_row.csv").write_text(
    "普通預金 取引明細\n" + ",".join(SHORT_HEADER) + "\n"
    + "\n".join(",".join(r) for r in simple) + "\n", encoding="utf-8")

write_csv("e09_no_balance_column.csv", SHORT_HEADER[:4], [r[:4] for r in simple])
write_csv("e10_missing_description.csv", ["日付", "払戻額", "お預り額", "差引残高"],
          [[r[0], *r[2:]] for r in simple])
write_csv("e11_bad_amount.csv", SHORT_HEADER, [
    ["R3.4.1", "ATM", "abc", "", "100"],
    ["R3.4.2", "ATM", "△100", "", "100"],
])
write_csv("e12_bad_date.csv", SHORT_HEADER, [
    ["R3.13.1", "ATM", "1000", "", "99000"],
    ["2021-02-30", "ATM", "1000", "", "98000"],
])
write_csv("e13_wareki_variants.csv", SHORT_HEADER, with_balance([
    ("S64.1.7", "昭和最終日", 1, 0),
    ("H1.1.8", "平成初日", 1, 0),
    ("H31.4.30", "平成最終日", 1, 0),
    ("R1.5.1", "令和初日", 1, 0),
    ("R03.04.01", "ゼロ埋め", 1, 0),
    ("R3/4/2", "スラッシュ", 1, 0),
    ("2021-04-03", "ISO", 1, 0),
    ("2021/4/4", "西暦スラッシュ", 1, 0),
], 1_000))
# e13 は和暦と西暦が混ざってファイルごと失敗するので、片方ずつで読める範囲も残す
write_csv("e13a_wareki_only.csv", SHORT_HEADER, with_balance([
    ("S64.1.7", "昭和最終日", 1, 0),
    ("H1.1.8", "平成初日", 1, 0),
    ("H31.4.30", "平成最終日", 1, 0),
    ("R1.5.1", "令和初日", 1, 0),
    ("R03.04.01", "ゼロ埋め", 1, 0),
    ("R3/4/2", "スラッシュ", 1, 0),
], 1_000))
write_csv("e13b_seireki_only.csv", SHORT_HEADER, with_balance([
    ("2021-04-03", "ISO", 1, 0),
    ("2021/4/4", "西暦スラッシュ", 1, 0),
    ("2021/04/05", "ゼロ埋め", 1, 0),
], 1_000))
write_csv("e14_kanji_era.csv", SHORT_HEADER, [["令和3年4月1日", "ATM", "1000", "", "99000"]])
write_csv("e15_amount_formats.csv", SHORT_HEADER, [
    ["R3.4.1", "カンマ", "\"1,234\"", "", "\"98,766\""],
    ["R3.4.2", "空白", " 500 ", "", "98266"],
    ["R3.4.3", "負号", "-100", "", "98366"],
    ["R3.4.4", "全角数字", "１２３", "", "98243"],
])
write_csv("e15b_amount_formats_ascii.csv", SHORT_HEADER, [
    ["R3.4.1", "カンマ", "\"1,234\"", "", "\"98,766\""],
    ["R3.4.2", "空白", " 500 ", "", "98266"],
    ["R3.4.3", "負号", "-100", "", "98366"],
])
write_csv("e16_header_variants.csv", ["年月日", "摘要", "払戻", "お預り", "残高"], simple)
write_csv("e17_unsorted_dates.csv", SHORT_HEADER, [
    ["R3.4.3", "イオン", "3000", "", "297000"],
    ["R3.4.1", "ATM", "10000", "", "90000"],
    ["R3.4.2", "給与", "", "200000", "290000"],
])
e18 = [list(r) for r in simple]
e18[1][-1] = "999999"
write_csv("e18_balance_mismatch.csv", SHORT_HEADER, e18)
write_csv("e19_header_only.csv", SHORT_HEADER, [])
write_csv("e20_multi_bank.csv", FULL_HEADER,
          account("テスト銀行", "本店", "1111111", "普通", simple[:2])
          + account("サンプル信用金庫", "駅前支店", "1111111", "普通", simple[2:]))
write_csv("e23_blank_description.csv", SHORT_HEADER, [simple[0], ["R3.4.2", "", "1000", "", "89000"], simple[2]])
write_csv("e21_blank_row.csv", SHORT_HEADER, [simple[0], ["", "", "", "", ""], simple[2]])

wb = Workbook()
ws = wb.active
ws.append(FULL_HEADER)
from datetime import date  # noqa: E402
ws.append(["テスト銀行", "本店", 7654321, "普通", date(2021, 4, 1), "ATM", 10000, None, 90000])
ws.append(["テスト銀行", "本店", 7654321, "普通", "R3.4.2", "給与", None, 200000, 290000])
ws.append(["テスト銀行", "本店", 7654321, "普通", date(2021, 4, 3), "イオン", 3000.0, None, 287000])
wb.save(OUT / "e22_excel.xlsx")

# 日付セルがすべて日付型の xlsx（e22 は文字列の和暦が混ざって失敗する）
wb = Workbook()
ws = wb.active
ws.append(FULL_HEADER)
ws.append(["テスト銀行", "本店", 7654321, "普通", date(2021, 4, 1), "ATM", 10000, None, 90000])
ws.append(["テスト銀行", "本店", 7654321, "普通", date(2021, 4, 2), "給与", None, 200000, 290000])
ws.append(["テスト銀行", "本店", 7654321, "普通", date(2021, 4, 3), "イオン", 3000.0, None, 287000])
wb.save(OUT / "e24_excel_dates.xlsx")

print("\n".join(sorted(p.name for p in OUT.iterdir())))
