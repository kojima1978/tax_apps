"""
ダミーデータ作成コマンド

相続案件のリアルな銀行取引データを生成する。
"""
import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand

from analyzer.models import Case, Transaction
from analyzer.lib.constants import UNCATEGORIZED


# ===== 口座定義 =====
ACCOUNTS = [
    {
        'bank_name': 'みずほ銀行',
        'branch_name': '新宿支店',
        'account_type': '普通',
        'account_id': '1234567',
        'initial_balance': 8_500_000,
    },
    {
        'bank_name': '三菱UFJ銀行',
        'branch_name': '渋谷支店',
        'account_type': '普通',
        'account_id': '7654321',
        'initial_balance': 15_200_000,
    },
    {
        'bank_name': 'ゆうちょ銀行',
        'branch_name': '〇一八店',
        'account_type': '通常貯金',
        'account_id': '10234567',
        'initial_balance': 3_800_000,
    },
]

# ===== 取引テンプレート =====
# (摘要, 出金範囲, 入金範囲, カテゴリー, 重み)
RECURRING_TRANSACTIONS = [
    # 生活費
    ('電気料金 東京電力', (5000, 25000), None, '生活費', 12),
    ('ガス料金 東京ガス', (3000, 15000), None, '生活費', 12),
    ('水道料金', (2000, 8000), None, '生活費', 6),
    ('NTTドコモ', (3000, 12000), None, '生活費', 12),
    ('NHK受信料', (2200, 2200), None, '生活費', 2),
    ('イオンカード', (15000, 80000), None, '生活費', 12),
    ('三井住友カード', (20000, 120000), None, '生活費', 12),
    ('セブンイレブン ATM', (10000, 50000), None, '生活費', 8),
    ('ローソン ATM', (10000, 30000), None, '生活費', 4),
    ('家賃 UR都市機構', (85000, 85000), None, '生活費', 12),

    # 給与・年金
    ('年金 厚生労働省', None, (120000, 180000), '給与', 6),
    ('給与 株式会社山田商事', None, (250000, 350000), '給与', 12),
    ('賞与 株式会社山田商事', None, (500000, 800000), '給与', 2),

    # 保険
    ('日本生命保険', (15000, 25000), None, '保険会社', 12),
    ('第一生命保険', (8000, 12000), None, '保険会社', 12),
    ('損保ジャパン', (5000, 8000), None, '保険会社', 12),
    ('保険金 日本生命', None, (500000, 2000000), '保険会社', 1),

    # 銀行関連
    ('利息', None, (1, 500), '銀行', 4),
    ('振込手数料', (220, 880), None, '銀行', 6),

    # 証券・株式
    ('野村證券', (100000, 500000), None, '証券・株式', 3),
    ('野村證券 配当金', None, (10000, 100000), '証券・株式', 4),
    ('SBI証券', (50000, 300000), None, '証券・株式', 2),
    ('SBI証券 売却代金', None, (100000, 500000), '証券・株式', 2),

    # 事業・不動産
    ('家賃収入 ABCマンション', None, (150000, 150000), '事業・不動産', 12),
    ('管理費 ABCマンション管理組合', (15000, 15000), None, '事業・不動産', 12),
    ('固定資産税 東京都', (50000, 200000), None, '事業・不動産', 4),

    # 関連会社
    ('株式会社山田ホールディングス', (500000, 2000000), None, '関連会社', 2),
    ('株式会社山田ホールディングス', None, (300000, 1500000), '関連会社', 3),

    # 贈与
    ('フリコミ ヤマダタロウ', None, (1000000, 3000000), '贈与', 1),
    ('フリコミ ヤマダハナコ', (500000, 1100000), None, '贈与', 2),

    # その他
    ('コクゼイ', (50000, 500000), None, 'その他', 2),
    ('ジュウミンゼイ', (20000, 80000), None, 'その他', 4),
    ('自動車税', (39500, 51000), None, 'その他', 1),
    ('病院 東京大学付属病院', (5000, 50000), None, 'その他', 3),
    ('薬局 スギ薬局', (1000, 5000), None, 'その他', 4),
]

# 通帳間移動用（口座AからBへの振込）
TRANSFER_DESCRIPTIONS = [
    'フリコミ ミズホギンコウ',
    'フリコミ ミツビシユーエフジェイ',
    'フリコミ ユウチョギンコウ',
]

# 未分類にする取引
UNCLASSIFIED_TRANSACTIONS = [
    ('ﾌﾘｺﾐ ﾀﾅｶ', (100000, 500000), None),
    ('ﾌﾘｺﾐ ｽｽﾞｷ', None, (200000, 800000)),
    ('ATM引出', (50000, 200000), None),
    ('ATM入金', None, (100000, 500000)),
    ('振込 カ）ニホンサービス', (30000, 150000), None),
    ('ﾌﾘｺﾐ ｻﾄｳ ﾖｼﾋﾛ', None, (50000, 300000)),
    ('引落 カイジョウホケンリョウ', (10000, 30000), None),
    ('ﾌﾘｺﾐ ﾔﾏﾀﾞ ｼﾞﾛｳ', None, (100000, 1000000)),
    ('自動引落', (5000, 20000), None),
    ('入金', None, (10000, 100000)),
]


def _random_amount(amount_range):
    """金額レンジからランダムな金額を生成（千円単位に丸め）"""
    low, high = amount_range
    if low == high:
        return low
    raw = random.randint(low, high)
    # 小額は100円単位、大額は1000円単位
    if raw < 10000:
        return round(raw / 100) * 100
    return round(raw / 1000) * 1000


def _generate_dates(start_date, end_date, count):
    """期間内にランダムな日付を生成（ソート済み）"""
    delta = (end_date - start_date).days
    dates = sorted(
        start_date + timedelta(days=random.randint(0, delta))
        for _ in range(count)
    )
    return dates


class Command(BaseCommand):
    help = 'ダミーの相続案件データを作成します'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            default='山田太郎（相続）',
            help='案件名（デフォルト: 山田太郎（相続））',
        )
        parser.add_argument(
            '--months',
            type=int,
            default=36,
            help='取引期間（月数、デフォルト: 36）',
        )

    def handle(self, *args, **options):
        case_name = options['name']
        months = options['months']

        # 既存の同名案件を確認
        if Case.objects.filter(name=case_name).exists():
            self.stderr.write(self.style.WARNING(
                f'案件「{case_name}」は既に存在します。別の名前を指定してください。'
            ))
            return

        # 日付範囲: 被相続人の死亡日を基準に過去N ヶ月
        end_date = date(2024, 8, 15)  # 死亡日
        start_date = end_date - timedelta(days=months * 30)

        # 案件作成
        case = Case.objects.create(name=case_name)
        self.stdout.write(f'案件「{case_name}」を作成しました (ID: {case.id})')

        total_count = 0

        for account in ACCOUNTS:
            transactions = []
            balance = account['initial_balance']
            account_info = {
                'bank_name': account['bank_name'],
                'branch_name': account['branch_name'],
                'account_type': account['account_type'],
                'account_id': account['account_id'],
            }

            # 定期取引を生成
            for desc, out_range, in_range, category, weight in RECURRING_TRANSACTIONS:
                # 月数に応じた件数（weightは年間回数）
                count = max(1, int(weight * months / 12))
                dates = _generate_dates(start_date, end_date, count)

                for tx_date in dates:
                    amount_out = _random_amount(out_range) if out_range else 0
                    amount_in = _random_amount(in_range) if in_range else 0
                    balance += amount_in - amount_out

                    transactions.append({
                        'date': tx_date,
                        'description': desc,
                        'amount_out': amount_out,
                        'amount_in': amount_in,
                        'balance': balance,
                        'category': category,
                        'is_large': (amount_out >= 1_000_000 or amount_in >= 1_000_000),
                        **account_info,
                    })

            # 通帳間移動
            transfer_count = random.randint(3, 8)
            for _ in range(transfer_count):
                tx_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
                amount = random.choice([100000, 200000, 300000, 500000, 1000000])
                is_out = random.choice([True, False])
                desc = random.choice(TRANSFER_DESCRIPTIONS)

                if is_out:
                    balance -= amount
                    transactions.append({
                        'date': tx_date,
                        'description': desc,
                        'amount_out': amount,
                        'amount_in': 0,
                        'balance': balance,
                        'category': '通帳間移動',
                        'is_transfer': True,
                        'transfer_to': random.choice([a['account_id'] for a in ACCOUNTS if a['account_id'] != account['account_id']]),
                        **account_info,
                    })
                else:
                    balance += amount
                    transactions.append({
                        'date': tx_date,
                        'description': desc,
                        'amount_out': 0,
                        'amount_in': amount,
                        'balance': balance,
                        'category': '通帳間移動',
                        'is_transfer': True,
                        **account_info,
                    })

            # 未分類取引
            unclassified_count = random.randint(8, 20)
            for _ in range(unclassified_count):
                tx_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
                desc, out_range, in_range = random.choice(UNCLASSIFIED_TRANSACTIONS)
                amount_out = _random_amount(out_range) if out_range else 0
                amount_in = _random_amount(in_range) if in_range else 0
                balance += amount_in - amount_out

                transactions.append({
                    'date': tx_date,
                    'description': desc,
                    'amount_out': amount_out,
                    'amount_in': amount_in,
                    'balance': balance,
                    'category': UNCATEGORIZED,
                    **account_info,
                })

            # 日付順にソートして残高を再計算
            transactions.sort(key=lambda t: t['date'])
            running_balance = account['initial_balance']
            for tx in transactions:
                running_balance += tx['amount_in'] - tx['amount_out']
                tx['balance'] = running_balance

            # 付箋をランダムに付与
            flagged_indices = random.sample(
                range(len(transactions)),
                min(random.randint(2, 5), len(transactions))
            )
            for idx in flagged_indices:
                transactions[idx]['is_flagged'] = True
                transactions[idx]['memo'] = random.choice([
                    '要確認：金額が大きい',
                    '相続人に確認必要',
                    '贈与の可能性あり',
                    '名義変更前の取引？',
                    '事業経費か個人支出か確認',
                ])

            # DB に一括挿入
            tx_objects = [
                Transaction(
                    case=case,
                    date=tx['date'],
                    description=tx['description'],
                    amount_out=tx['amount_out'],
                    amount_in=tx['amount_in'],
                    balance=tx['balance'],
                    bank_name=tx['bank_name'],
                    branch_name=tx['branch_name'],
                    account_type=tx['account_type'],
                    account_id=tx['account_id'],
                    category=tx.get('category', UNCATEGORIZED),
                    is_large=tx.get('is_large', False),
                    is_transfer=tx.get('is_transfer', False),
                    transfer_to=tx.get('transfer_to'),
                    is_flagged=tx.get('is_flagged', False),
                    memo=tx.get('memo'),
                    classification_score=random.choice([85, 90, 95, 100]) if tx.get('category', UNCATEGORIZED) != UNCATEGORIZED else 0,
                )
                for tx in transactions
            ]
            Transaction.objects.bulk_create(tx_objects)

            self.stdout.write(
                f'  {account["bank_name"]} {account["branch_name"]} '
                f'({account["account_id"]}): {len(tx_objects)}件'
            )
            total_count += len(tx_objects)

        self.stdout.write(self.style.SUCCESS(
            f'\n合計 {total_count} 件の取引データを作成しました。'
        ))
