"""
ユニットテスト

モデル、フォーム、サービス、テンプレートタグのテストを含む。
"""
from datetime import date, datetime

from django.test import TestCase, Client, override_settings
from django.urls import reverse, set_script_prefix
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import Account, Case, Transaction
from .forms import CaseForm, SettingsForm
from .services import TransactionService, AnalysisService, parse_int_ids
from .templatetags.japanese_date import wareki, wareki_short, wareki_year, get_japanese_era
from .handlers import parse_amount
from .views import sanitize_filename
from .lib.importer import _convert_japanese_date
from .lib.llm_classifier import classify_by_rules
from .lib.constants import normalize_patterns


class CaseModelTest(TestCase):
    """Caseモデルのテスト"""

    def test_create_case(self):
        """案件を作成できること"""
        case = Case.objects.create(name="テスト案件")
        self.assertEqual(case.name, "テスト案件")
        self.assertIsNotNone(case.created_at)
        self.assertIsNotNone(case.updated_at)

    def test_case_str(self):
        """案件の文字列表現が正しいこと"""
        case = Case.objects.create(name="テスト案件")
        self.assertEqual(str(case), "テスト案件")

    def test_case_unique_name(self):
        """案件名が重複できないこと"""
        Case.objects.create(name="テスト案件")
        with self.assertRaises(Exception):
            Case.objects.create(name="テスト案件")


class TransactionModelTest(TestCase):
    """Transactionモデルのテスト"""

    def setUp(self):
        self.case = Case.objects.create(name="テスト案件")

    def test_create_transaction(self):
        """取引を作成できること"""
        tx = Transaction.objects.create(
            case=self.case,
            date=date(2024, 1, 15),
            description="テスト取引",
            amount_out=10000,
            amount_in=0,
            balance=90000,
        )
        self.assertEqual(tx.description, "テスト取引")
        self.assertEqual(tx.amount_out, 10000)

    def test_transaction_defaults(self):
        """取引のデフォルト値が正しいこと"""
        tx = Transaction.objects.create(
            case=self.case,
            date=date(2024, 1, 15),
            description="テスト",
            balance=100000,
        )
        self.assertEqual(tx.amount_out, 0)
        self.assertEqual(tx.amount_in, 0)
        self.assertFalse(tx.is_large)
        self.assertFalse(tx.is_transfer)
        self.assertEqual(tx.category, "未分類")

    def test_transaction_str(self):
        """取引の文字列表現が正しいこと"""
        tx = Transaction.objects.create(
            case=self.case,
            date=date(2024, 1, 15),
            description="ATM出金",
            balance=100000,
        )
        self.assertIn("2024-01-15", str(tx))
        self.assertIn("ATM出金", str(tx))


class CaseFormTest(TestCase):
    """CaseFormのテスト"""

    def test_valid_form(self):
        """有効なフォームデータ"""
        form = CaseForm(data={"name": "テスト案件"})
        self.assertTrue(form.is_valid())

    def test_empty_name(self):
        """空の名前は無効"""
        form = CaseForm(data={"name": ""})
        self.assertFalse(form.is_valid())
        self.assertIn("name", form.errors)

    def test_duplicate_name(self):
        """重複する名前は無効"""
        Case.objects.create(name="既存案件")
        form = CaseForm(data={"name": "既存案件"})
        self.assertFalse(form.is_valid())


class SettingsFormTest(TestCase):
    """SettingsFormのテスト"""

    def _valid_data(self, **overrides):
        data = {
            "large_amount_threshold": 500000,
            "transfer_days_window": 3,
            "transfer_amount_tolerance": 1000,
            "transfer_date_mode": "after_only",
            "gift_threshold": 1_000_000,
            "fuzzy_enabled": True,
            "fuzzy_threshold": 90,
        }
        data.update(overrides)
        return data

    def test_valid_settings(self):
        """有効な設定値"""
        form = SettingsForm(data=self._valid_data())
        self.assertTrue(form.is_valid())

    def test_negative_threshold(self):
        """負の閾値は無効"""
        form = SettingsForm(data=self._valid_data(large_amount_threshold=-1))
        self.assertFalse(form.is_valid())

    def test_max_threshold(self):
        """最大値を超える閾値は無効"""
        form = SettingsForm(data=self._valid_data(large_amount_threshold=2_000_000_000))
        self.assertFalse(form.is_valid())


class ParseIntIdsTest(TestCase):
    """parse_int_ids関数のテスト"""

    def test_valid_ids(self):
        """有効なIDリスト"""
        result = parse_int_ids(["1", "2", "3"])
        self.assertEqual(result, [1, 2, 3])

    def test_empty_list(self):
        """空のリスト"""
        result = parse_int_ids([])
        self.assertEqual(result, [])

    def test_invalid_ids(self):
        """無効なIDを含むリスト"""
        result = parse_int_ids(["1", "abc", "3"])
        self.assertIsNone(result)

    def test_none_in_list(self):
        """Noneを含むリスト"""
        result = parse_int_ids(["1", None, "3"])
        self.assertIsNone(result)


class TransactionServiceTest(TestCase):
    """TransactionServiceのテスト"""

    def setUp(self):
        self.case = Case.objects.create(name="テスト案件")
        self.tx1 = Transaction.objects.create(
            case=self.case,
            date=date(2024, 1, 15),
            description="取引1",
            amount_out=10000,
            balance=90000,
            category="未分類",
        )
        self.tx2 = Transaction.objects.create(
            case=self.case,
            date=date(2024, 1, 16),
            description="取引2",
            amount_in=5000,
            balance=95000,
            category="未分類",
        )

    def test_delete_account_transactions(self):
        """口座取引の削除"""
        account = Account.objects.create(case=self.case, account_number="123-456")
        self.tx1.account = account
        self.tx1.save(update_fields=["account"])
        count = TransactionService.delete_account_transactions(self.case, "123-456")
        self.assertEqual(count, 1)
        self.assertFalse(Transaction.objects.filter(id=self.tx1.id).exists())

    def test_update_transaction_category(self):
        """カテゴリーの更新"""
        count = TransactionService.update_transaction_category(
            self.case, self.tx1.id, "生活費", apply_all=False
        )
        self.assertEqual(count, 1)
        self.tx1.refresh_from_db()
        self.assertEqual(self.tx1.category, "生活費")

    def test_bulk_update_categories(self):
        """一括カテゴリー更新"""
        updates = {
            str(self.tx1.id): "生活費",
            str(self.tx2.id): "贈与・教育費",
        }
        count = TransactionService.bulk_update_categories(self.case, updates)
        self.assertEqual(count, 2)
        self.tx1.refresh_from_db()
        self.tx2.refresh_from_db()
        self.assertEqual(self.tx1.category, "生活費")
        self.assertEqual(self.tx2.category, "贈与・教育費")

    def test_delete_duplicates(self):
        """重複削除"""
        count = TransactionService.delete_duplicates(
            self.case, [str(self.tx1.id)]
        )
        self.assertEqual(count, 1)
        self.assertFalse(Transaction.objects.filter(id=self.tx1.id).exists())

    def test_delete_duplicates_invalid_ids(self):
        """無効なIDでの重複削除"""
        count = TransactionService.delete_duplicates(
            self.case, ["invalid", "ids"]
        )
        self.assertEqual(count, 0)

    def test_delete_unclassified_transactions_only_deletes_unclassified(self):
        """未分類取引だけを削除"""
        classified = Transaction.objects.create(
            case=self.case,
            date=date(2024, 1, 17),
            description="分類済み",
            amount_in=1000,
            balance=96000,
            category="生活費",
        )

        count, deleted_ids = TransactionService.delete_unclassified_transactions(
            self.case,
            [str(self.tx1.id), str(classified.id)],
        )

        self.assertEqual(count, 1)
        self.assertEqual(deleted_ids, [self.tx1.id])
        self.assertFalse(Transaction.objects.filter(id=self.tx1.id).exists())
        self.assertTrue(Transaction.objects.filter(id=classified.id).exists())

    def test_bulk_replace_account_number(self):
        account = Account.objects.create(case=self.case, account_number="old")
        self.tx1.account = account
        self.tx1.save(update_fields=["account"])

        count = TransactionService.bulk_replace_field_value(
            self.case, "account_number", "old", "new"
        )

        self.assertEqual(count, 1)
        account.refresh_from_db()
        self.assertEqual(account.account_number, "new")

    def test_bulk_replace_account_number_merges_existing_account(self):
        source = Account.objects.create(
            case=self.case,
            account_number="old",
            bank_name="Source Bank",
            passbook_balance=100,
            has_accrued_interest=True,
            passbook_years={"2025": True},
        )
        target = Account.objects.create(
            case=self.case,
            account_number="new",
            branch_name="Target Branch",
            certificate_balance=0,
            passbook_years={"2026": False},
        )
        self.tx1.account = source
        self.tx1.save(update_fields=["account"])

        count = TransactionService.bulk_replace_field_value(
            self.case, "account_number", "old", "new"
        )

        self.assertEqual(count, 1)
        self.assertFalse(Account.objects.filter(pk=source.pk).exists())
        self.tx1.refresh_from_db()
        target.refresh_from_db()
        self.assertEqual(self.tx1.account, target)
        self.assertEqual(target.bank_name, "Source Bank")
        self.assertEqual(target.branch_name, "Target Branch")
        self.assertEqual(target.passbook_balance, 100)
        self.assertEqual(target.certificate_balance, 0)
        self.assertTrue(target.has_accrued_interest)
        self.assertEqual(target.passbook_years, {"2025": True, "2026": False})

    def test_bulk_replace_description(self):
        self.tx2.description = self.tx1.description
        self.tx2.save(update_fields=["description"])
        other_case = Case.objects.create(name="Other Case")
        other_tx = Transaction.objects.create(
            case=other_case,
            description=self.tx1.description,
        )

        count = TransactionService.bulk_replace_field_value(
            self.case, "description", self.tx1.description, "New Description"
        )

        self.assertEqual(count, 2)
        self.tx1.refresh_from_db()
        self.tx2.refresh_from_db()
        other_tx.refresh_from_db()
        self.assertEqual(self.tx1.description, "New Description")
        self.assertEqual(self.tx2.description, "New Description")
        self.assertNotEqual(other_tx.description, "New Description")

    def test_get_unique_description_values(self):
        self.tx2.description = self.tx1.description
        self.tx2.save(update_fields=["description"])

        values = TransactionService.get_unique_field_values(self.case, "description")

        self.assertEqual(values, [{"value": self.tx1.description, "count": 2}])


class AnalysisServiceTest(TestCase):
    """AnalysisServiceのテスト"""

    def test_standard_categories(self):
        """標準カテゴリーの確認"""
        categories = AnalysisService.STANDARD_CATEGORIES
        self.assertIn("生活費", categories)
        self.assertIn("贈与・教育費", categories)
        self.assertIn("税金", categories)
        self.assertIn("修繕・資本", categories)
        self.assertIn("銀行・利息・手数料", categories)
        self.assertIn("証券・株式・配当", categories)
        self.assertNotIn("贈与", categories)
        self.assertNotIn("銀行", categories)
        self.assertNotIn("証券・株式", categories)
        self.assertIn("未分類", categories)

    def test_legacy_categories_are_normalized(self):
        patterns = normalize_patterns({
            "贈与": ["振込"],
            "贈与・教育費": ["教育費"],
            "銀行": ["利息"],
            "証券・株式": ["配当"],
        })

        self.assertNotIn("贈与", patterns)
        self.assertNotIn("銀行", patterns)
        self.assertNotIn("証券・株式", patterns)
        self.assertEqual(patterns["贈与・教育費"], ["振込", "教育費"])
        self.assertEqual(patterns["銀行・利息・手数料"], ["利息"])
        self.assertEqual(patterns["証券・株式・配当"], ["配当"])


class JapaneseDateTest(TestCase):
    """和暦変換のテスト"""

    def test_get_japanese_era_reiwa(self):
        """令和の判定"""
        era_name, era_year = get_japanese_era(date(2024, 1, 15))
        self.assertEqual(era_name, "令和")
        self.assertEqual(era_year, 6)

    def test_get_japanese_era_heisei(self):
        """平成の判定"""
        era_name, era_year = get_japanese_era(date(2018, 1, 1))
        self.assertEqual(era_name, "平成")
        self.assertEqual(era_year, 30)

    def test_get_japanese_era_showa(self):
        """昭和の判定"""
        era_name, era_year = get_japanese_era(date(1980, 1, 1))
        self.assertEqual(era_name, "昭和")
        self.assertEqual(era_year, 55)

    def test_wareki_full(self):
        """和暦フル形式"""
        result = wareki(date(2024, 1, 15), 'full')
        self.assertEqual(result, "令和6年1月15日")

    def test_wareki_short(self):
        """和暦短縮形式"""
        result = wareki_short(date(2024, 1, 15))
        self.assertEqual(result, "R6.1.15")

    def test_wareki_year(self):
        """和暦年のみ"""
        result = wareki_year(date(2024, 1, 15))
        self.assertEqual(result, "令和6年")

    def test_wareki_first_year(self):
        """元年表記"""
        result = wareki(date(2019, 5, 1), 'full')
        self.assertEqual(result, "令和元年5月1日")

    def test_wareki_none(self):
        """Noneの場合"""
        result = wareki(None)
        self.assertEqual(result, "-")

    def test_wareki_string_date(self):
        """文字列日付の変換"""
        result = wareki("2024-01-15", 'short')
        self.assertEqual(result, "R6.1.15")


@override_settings(FORCE_SCRIPT_NAME=None, ALLOWED_HOSTS=['*'])
class ViewsTest(TestCase):
    """ビューのテスト"""

    def setUp(self):
        set_script_prefix('/')
        self.client = Client()
        self.case = Case.objects.create(name="テスト案件")

    def test_case_list_view(self):
        """案件一覧ビュー"""
        response = self.client.get(reverse('case-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "テスト案件")

    def test_case_create_view(self):
        """案件作成ビュー GET"""
        response = self.client.get(reverse('case-create'))
        self.assertEqual(response.status_code, 200)

    def test_case_create_post(self):
        """案件作成ビュー POST"""
        response = self.client.post(reverse('case-create'), {"name": "新規案件"})
        self.assertEqual(response.status_code, 302)  # リダイレクト
        self.assertTrue(Case.objects.filter(name="新規案件").exists())

    def test_analysis_dashboard_no_data(self):
        """分析ダッシュボード（データなし）"""
        response = self.client.get(reverse('analysis-dashboard', args=[self.case.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "取引データがありません")

    def test_analysis_dashboard_with_data(self):
        """分析ダッシュボード（データあり）"""
        Transaction.objects.create(
            case=self.case,
            date=date(2024, 1, 15),
            description="テスト取引",
            amount_out=10000,
            balance=90000,
        )
        response = self.client.get(reverse('analysis-dashboard', args=[self.case.pk]))
        self.assertEqual(response.status_code, 200)

    def test_export_csv_all(self):
        """全取引CSVエクスポート"""
        Transaction.objects.create(
            case=self.case, date=date(2024, 1, 15),
            description="テスト", amount_out=1000, balance=9000,
        )
        response = self.client.get(reverse('export-csv', args=[self.case.pk, 'all']))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8-sig')

    def test_export_csv_no_data(self):
        """データなしCSVエクスポート（リダイレクト）"""
        response = self.client.get(reverse('export-csv', args=[self.case.pk, 'all']))
        self.assertEqual(response.status_code, 302)

    def test_api_toggle_flag(self):
        """付箋トグルAPI"""
        tx = Transaction.objects.create(
            case=self.case, date=date(2024, 1, 15),
            description="テスト", balance=100000,
        )
        response = self.client.post(
            reverse('api-toggle-flag', args=[self.case.pk]),
            {'tx_id': str(tx.id)}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertTrue(data['is_flagged'])

    def test_api_toggle_flag_no_id(self):
        """付箋トグルAPI（ID未指定）"""
        response = self.client.post(
            reverse('api-toggle-flag', args=[self.case.pk]),
            {}
        )
        self.assertEqual(response.status_code, 400)

    def test_api_create_transaction(self):
        """取引追加API"""
        response = self.client.post(
            reverse('api-create-transaction', args=[self.case.pk]),
            {'date': '2024-01-15', 'description': 'API追加', 'amount_out': '5000'}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['transaction']['description'], 'API追加')

    def test_api_delete_transaction(self):
        """取引削除API"""
        tx = Transaction.objects.create(
            case=self.case, date=date(2024, 1, 15),
            description="削除テスト", balance=100000,
        )
        response = self.client.post(
            reverse('api-delete-transaction', args=[self.case.pk]),
            {'tx_id': str(tx.id)}
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Transaction.objects.filter(id=tx.id).exists())

    def test_api_delete_transaction_not_found(self):
        """取引削除API（存在しないID）"""
        response = self.client.post(
            reverse('api-delete-transaction', args=[self.case.pk]),
            {'tx_id': '99999'}
        )
        self.assertEqual(response.status_code, 404)

    def test_api_delete_unclassified_transactions(self):
        """未分類取引の一括削除API"""
        unclassified = Transaction.objects.create(
            case=self.case, date=date(2024, 1, 15),
            description="未分類削除", balance=100000,
            category="未分類",
        )
        classified = Transaction.objects.create(
            case=self.case, date=date(2024, 1, 16),
            description="分類済み維持", balance=100000,
            category="生活費",
        )

        response = self.client.post(
            reverse('api-delete-unclassified-transactions', args=[self.case.pk]),
            {'tx_ids': [str(unclassified.id), str(classified.id)]}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['deleted_ids'], [unclassified.id])
        self.assertFalse(Transaction.objects.filter(id=unclassified.id).exists())
        self.assertTrue(Transaction.objects.filter(id=classified.id).exists())

    def test_api_delete_unclassified_transactions_no_unclassified(self):
        """未分類取引の一括削除API（削除対象なし）"""
        classified = Transaction.objects.create(
            case=self.case, date=date(2024, 1, 16),
            description="分類済み維持", balance=100000,
            category="生活費",
        )

        response = self.client.post(
            reverse('api-delete-unclassified-transactions', args=[self.case.pk]),
            {'tx_ids': [str(classified.id)]}
        )

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Transaction.objects.filter(id=classified.id).exists())


@override_settings(FORCE_SCRIPT_NAME=None, ALLOWED_HOSTS=['*'])
class PassbookInventoryAccountTest(TestCase):
    """通帳有無一覧表の口座追加・取込テスト"""

    def setUp(self):
        set_script_prefix('/')
        self.client = Client()
        self.case = Case.objects.create(name="通帳テスト")

    def test_add_certificate_account_without_transactions(self):
        response = self.client.post(reverse('add-certificate-account', args=[self.case.pk]), {
            'bank_name': 'みずほ銀行',
            'branch_name': '本店',
            'account_type': '普通',
            'account_number': '9999999',
            'certificate_balance': '1,234,567',
            'inventory_remarks': '取引履歴なし・残高証明書あり',
        })

        self.assertEqual(response.status_code, 302)
        account = Account.objects.get(case=self.case, account_number='9999999')
        self.assertEqual(account.certificate_balance, 1234567)
        self.assertEqual(account.transactions.count(), 0)

        page = self.client.get(reverse('passbook-inventory', args=[self.case.pk]))
        self.assertContains(page, 'みずほ銀行')
        self.assertContains(page, '9999999')
        self.assertContains(page, '証明のみ')

    def test_add_certificate_account_updates_existing_account(self):
        Account.objects.create(
            case=self.case,
            account_number='1111111',
            bank_name='旧銀行',
            certificate_balance=100,
        )

        response = self.client.post(reverse('add-certificate-account', args=[self.case.pk]), {
            'bank_name': '新銀行',
            'account_number': '1111111',
            'certificate_balance': '200',
            'passbook_balance': '200',
        })

        self.assertEqual(response.status_code, 302)
        account = Account.objects.get(case=self.case, account_number='1111111')
        self.assertEqual(account.bank_name, '新銀行')
        self.assertEqual(account.certificate_balance, 200)
        self.assertEqual(account.passbook_balance, 200)

    def test_import_certificate_accounts_csv(self):
        csv = (
            '銀行名,支店名,種類,口座番号,残証残高,通帳残高,既経過利息,備考\n'
            '三井住友銀行,東京支店,普通,0222222,"2,000",,有,証明書のみ\n'
            'りそな銀行,大阪支店,定期,3333333,3000,3000,,\n'
        ).encode('utf-8-sig')
        upload = SimpleUploadedFile('accounts.csv', csv, content_type='text/csv')

        response = self.client.post(
            reverse('import-certificate-accounts', args=[self.case.pk]),
            {'certificate_file': upload},
        )

        self.assertEqual(response.status_code, 302)
        first = Account.objects.get(case=self.case, account_number='0222222')
        second = Account.objects.get(case=self.case, account_number='3333333')
        self.assertEqual(first.certificate_balance, 2000)
        self.assertTrue(first.has_accrued_interest)
        self.assertEqual(first.inventory_remarks, '証明書のみ')
        self.assertEqual(second.passbook_balance, 3000)


class ParseAmountTest(TestCase):
    """parse_amount関数のテスト"""

    def test_normal_integer(self):
        """通常の整数"""
        value, ok = parse_amount('12345')
        self.assertEqual(value, 12345)
        self.assertTrue(ok)

    def test_comma_separated(self):
        """カンマ区切り"""
        value, ok = parse_amount('1,234,567')
        self.assertEqual(value, 1234567)
        self.assertTrue(ok)

    def test_empty_string(self):
        """空文字列"""
        value, ok = parse_amount('')
        self.assertEqual(value, 0)
        self.assertTrue(ok)

    def test_none_value(self):
        """None"""
        value, ok = parse_amount(None)
        self.assertEqual(value, 0)
        self.assertTrue(ok)

    def test_invalid_string(self):
        """不正な文字列"""
        value, ok = parse_amount('abc')
        self.assertEqual(value, 0)
        self.assertFalse(ok)

    def test_custom_default(self):
        """カスタムデフォルト値"""
        value, ok = parse_amount('abc', default=-1)
        self.assertEqual(value, -1)
        self.assertFalse(ok)


class SanitizeFilenameTest(TestCase):
    """sanitize_filename関数のテスト"""

    def test_normal_name(self):
        """通常の名前"""
        self.assertEqual(sanitize_filename('テスト案件'), 'テスト案件')

    def test_with_slashes(self):
        """スラッシュを含む名前"""
        self.assertEqual(sanitize_filename('山田/太郎'), '山田_太郎')

    def test_with_special_chars(self):
        """特殊文字を含む名前"""
        result = sanitize_filename('案件: "テスト" <1>')
        self.assertNotIn(':', result)
        self.assertNotIn('"', result)
        self.assertNotIn('<', result)
        self.assertNotIn('>', result)

    def test_empty_name(self):
        """空の名前"""
        self.assertEqual(sanitize_filename(''), 'export')


class ConvertJapaneseDateTest(TestCase):
    """_convert_japanese_date関数のテスト"""

    def test_heisei_date(self):
        """平成日付の変換"""
        self.assertEqual(_convert_japanese_date('H28.6.3'), '2016-06-03')

    def test_reiwa_date(self):
        """令和日付の変換"""
        self.assertEqual(_convert_japanese_date('R5.4.1'), '2023-04-01')

    def test_showa_date(self):
        """昭和日付の変換"""
        self.assertEqual(_convert_japanese_date('S50.1.15'), '1975-01-15')

    def test_slash_separator(self):
        """スラッシュ区切り"""
        self.assertEqual(_convert_japanese_date('H28/6/3'), '2016-06-03')

    def test_invalid_month(self):
        """不正な月（13月）"""
        result = _convert_japanese_date('H28.13.1')
        # 不正な日付はそのまま返される
        self.assertEqual(result, 'H28.13.1')

    def test_invalid_day(self):
        """不正な日（32日）"""
        result = _convert_japanese_date('H28.1.32')
        self.assertEqual(result, 'H28.1.32')

    def test_western_date(self):
        """西暦はそのまま"""
        self.assertEqual(_convert_japanese_date('2024-01-15'), '2024-01-15')

    def test_none_value(self):
        """None"""
        self.assertIsNone(_convert_japanese_date(None))


class ClassifyByRulesTest(TestCase):
    """classify_by_rules関数のテスト

    Note: classify_by_rules は (カテゴリー, スコア) のタプルを返す
          スコアは 100=完全一致、0=未分類
    """

    def test_salary_keyword(self):
        """給与キーワードの検出"""
        category, score = classify_by_rules('給与振込', 0, 300000)
        self.assertEqual(category, '給与')
        self.assertEqual(score, 100)  # 完全一致

    def test_life_expense(self):
        """生活費キーワードの検出"""
        category, score = classify_by_rules('イオンモール', 5000, 0)
        self.assertEqual(category, '生活費')
        self.assertEqual(score, 100)

    def test_case_insensitive(self):
        """大文字小文字の区別なし"""
        category1, _ = classify_by_rules('NTT通信料', 3000, 0)
        category2, _ = classify_by_rules('ntt通信料', 3000, 0)
        self.assertEqual(category1, '生活費')
        self.assertEqual(category2, '生活費')

    def test_unclassified(self):
        """未分類"""
        category, score = classify_by_rules('不明な取引', 100, 0)
        self.assertEqual(category, '未分類')
        self.assertEqual(score, 0)

    def test_empty_description(self):
        """空の摘要"""
        category, score = classify_by_rules('', 100, 0)
        self.assertEqual(category, '未分類')
        self.assertEqual(score, 0)

    def test_gift_over_threshold(self):
        """贈与（閾値以上）"""
        category, score = classify_by_rules('振込', 1500000, 0)
        self.assertEqual(category, '贈与・教育費')
        self.assertEqual(score, 100)

    def test_gift_under_threshold(self):
        """贈与（閾値未満は未分類）"""
        category, score = classify_by_rules('振込', 500000, 0)
        self.assertEqual(category, '未分類')
        self.assertEqual(score, 0)


class ApplyFiltersTest(TestCase):
    """AnalysisService.apply_filters のテスト"""

    def setUp(self):
        self.case = Case.objects.create(name="フィルターテスト")
        mizuho = Account.objects.create(
            case=self.case, bank_name="みずほ銀行", account_number="1234567"
        )
        smbc = Account.objects.create(
            case=self.case, bank_name="三井住友銀行", account_number="7654321"
        )
        Transaction.objects.create(
            case=self.case, date=date(2024, 1, 15),
            description="イオン 買い物", amount_out=5000,
            account=mizuho,
            category="生活費", balance=95000,
        )
        Transaction.objects.create(
            case=self.case, date=date(2024, 2, 1),
            description="給与振込", amount_in=300000,
            account=smbc,
            category="給与", balance=395000,
        )
        Transaction.objects.create(
            case=self.case, date=date(2024, 3, 1),
            description="家賃", amount_out=100000,
            account=mizuho,
            category="生活費", balance=295000,
        )

    def test_filter_by_bank(self):
        """銀行名フィルター"""
        qs = self.case.transactions.all()
        result = AnalysisService.apply_filters(qs, {'bank': ['みずほ銀行']})
        self.assertEqual(result.count(), 2)

    def test_filter_by_category(self):
        """分類フィルター"""
        qs = self.case.transactions.all()
        result = AnalysisService.apply_filters(qs, {'category': ['給与']})
        self.assertEqual(result.count(), 1)

    def test_filter_by_category_exclude(self):
        """分類除外フィルター"""
        qs = self.case.transactions.all()
        result = AnalysisService.apply_filters(qs, {
            'category': ['生活費'],
            'category_mode': 'exclude'
        })
        self.assertEqual(result.count(), 1)

    def test_filter_by_keyword(self):
        """キーワードフィルター"""
        qs = self.case.transactions.all()
        result = AnalysisService.apply_filters(qs, {'keyword': 'イオン'})
        self.assertEqual(result.count(), 1)

    def test_filter_by_date_range(self):
        """日付範囲フィルター"""
        qs = self.case.transactions.all()
        result = AnalysisService.apply_filters(qs, {
            'date_from': '2024-02-01',
            'date_to': '2024-02-28'
        })
        self.assertEqual(result.count(), 1)

    def test_filter_by_amount_out(self):
        """出金フィルター"""
        qs = self.case.transactions.all()
        result = AnalysisService.apply_filters(qs, {
            'amount_type': 'out',
            'amount_min': '10000'
        })
        self.assertEqual(result.count(), 1)

    def test_empty_filter(self):
        """空フィルター（全件）"""
        qs = self.case.transactions.all()
        result = AnalysisService.apply_filters(qs, {})
        self.assertEqual(result.count(), 3)


class UpdateTransactionTest(TestCase):
    """TransactionService.update_transaction のテスト"""

    def setUp(self):
        self.case = Case.objects.create(name="更新テスト")
        self.tx = Transaction.objects.create(
            case=self.case, date=date(2024, 1, 15),
            description="テスト取引", amount_out=10000,
            amount_in=0, balance=90000, category="未分類",
        )

    def test_update_success(self):
        """正常な更新"""
        result = TransactionService.update_transaction(
            self.case, self.tx.id, {
                'date': '2024-02-01', 'description': '更新取引',
                'amount_out': 5000, 'amount_in': 0, 'category': '生活費',
            }
        )
        self.assertTrue(result)
        self.tx.refresh_from_db()
        self.assertEqual(self.tx.description, '更新取引')
        self.assertEqual(self.tx.category, '生活費')

    def test_update_invalid_date(self):
        """不正な日付"""
        result = TransactionService.update_transaction(
            self.case, self.tx.id, {
                'date': 'not-a-date', 'description': 'テスト',
                'amount_out': 0, 'amount_in': 0, 'category': '未分類',
            }
        )
        self.assertFalse(result)

    def test_update_nonexistent(self):
        """存在しない取引"""
        result = TransactionService.update_transaction(
            self.case, 99999, {
                'date': '2024-01-01', 'description': 'テスト',
                'amount_out': 0, 'amount_in': 0, 'category': '未分類',
            }
        )
        self.assertFalse(result)
