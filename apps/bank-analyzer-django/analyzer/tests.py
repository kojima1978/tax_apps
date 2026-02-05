"""
ユニットテスト

モデル、フォーム、サービス、テンプレートタグのテストを含む。
"""
from datetime import date, datetime

from django.test import TestCase, Client
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import Case, Transaction
from .forms import CaseForm, ImportForm, SettingsForm
from .services import TransactionService, AnalysisService, _parse_int_ids
from .templatetags.japanese_date import wareki, wareki_short, wareki_year, get_japanese_era


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


class ImportFormTest(TestCase):
    """ImportFormのテスト"""

    def test_valid_csv_file(self):
        """有効なCSVファイル"""
        csv_content = b"test,data\n1,2"
        file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")
        form = ImportForm(files={"csv_file": file})
        self.assertTrue(form.is_valid())

    def test_empty_file(self):
        """空のファイルは無効"""
        file = SimpleUploadedFile("empty.csv", b"", content_type="text/csv")
        form = ImportForm(files={"csv_file": file})
        self.assertFalse(form.is_valid())
        self.assertIn("csv_file", form.errors)

    def test_invalid_extension(self):
        """無効な拡張子は無効"""
        file = SimpleUploadedFile("test.txt", b"test", content_type="text/plain")
        form = ImportForm(files={"csv_file": file})
        self.assertFalse(form.is_valid())


class SettingsFormTest(TestCase):
    """SettingsFormのテスト"""

    def test_valid_settings(self):
        """有効な設定値"""
        form = SettingsForm(data={
            "large_amount_threshold": 500000,
            "transfer_days_window": 3,
            "transfer_amount_tolerance": 1000,
        })
        self.assertTrue(form.is_valid())

    def test_negative_threshold(self):
        """負の閾値は無効"""
        form = SettingsForm(data={
            "large_amount_threshold": -1,
            "transfer_days_window": 3,
            "transfer_amount_tolerance": 1000,
        })
        self.assertFalse(form.is_valid())

    def test_max_threshold(self):
        """最大値を超える閾値は無効"""
        form = SettingsForm(data={
            "large_amount_threshold": 2_000_000_000,  # 20億
            "transfer_days_window": 3,
            "transfer_amount_tolerance": 1000,
        })
        self.assertFalse(form.is_valid())


class ParseIntIdsTest(TestCase):
    """_parse_int_ids関数のテスト"""

    def test_valid_ids(self):
        """有効なIDリスト"""
        result = _parse_int_ids(["1", "2", "3"])
        self.assertEqual(result, [1, 2, 3])

    def test_empty_list(self):
        """空のリスト"""
        result = _parse_int_ids([])
        self.assertEqual(result, [])

    def test_invalid_ids(self):
        """無効なIDを含むリスト"""
        result = _parse_int_ids(["1", "abc", "3"])
        self.assertIsNone(result)

    def test_none_in_list(self):
        """Noneを含むリスト"""
        result = _parse_int_ids(["1", None, "3"])
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
        self.tx1.account_id = "123-456"
        self.tx1.save()
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
            str(self.tx2.id): "贈与",
        }
        count = TransactionService.bulk_update_categories(self.case, updates)
        self.assertEqual(count, 2)
        self.tx1.refresh_from_db()
        self.tx2.refresh_from_db()
        self.assertEqual(self.tx1.category, "生活費")
        self.assertEqual(self.tx2.category, "贈与")

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


class AnalysisServiceTest(TestCase):
    """AnalysisServiceのテスト"""

    def test_standard_categories(self):
        """標準カテゴリーの確認"""
        categories = AnalysisService.STANDARD_CATEGORIES
        self.assertIn("生活費", categories)
        self.assertIn("贈与", categories)
        self.assertIn("未分類", categories)


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


class ViewsTest(TestCase):
    """ビューのテスト"""

    def setUp(self):
        self.client = Client()
        self.case = Case.objects.create(name="テスト案件")

    def test_case_list_view(self):
        """案件一覧ビュー"""
        response = self.client.get(reverse('case-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "テスト案件")

    def test_case_detail_view(self):
        """案件詳細ビュー"""
        response = self.client.get(reverse('case-detail', args=[self.case.pk]))
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

    def test_transaction_import_view(self):
        """インポートビュー GET"""
        response = self.client.get(reverse('transaction-import', args=[self.case.pk]))
        self.assertEqual(response.status_code, 200)
