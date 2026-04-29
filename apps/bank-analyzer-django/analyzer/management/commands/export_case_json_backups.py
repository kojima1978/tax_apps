"""Export all Bank Analyzer cases as JSON backup files."""
import json
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Sum

from analyzer.lib import config
from analyzer.models import Case
from analyzer.views._helpers import sanitize_filename


class Command(BaseCommand):
    help = "Export all cases as JSON backup files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output-dir",
            required=True,
            help="Directory where JSON backup files will be written.",
        )

    def handle(self, *args, **options):
        output_dir = Path(options["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)

        user_settings = config.load_user_settings()
        exported_count = 0

        for case in Case.objects.all().order_by("id"):
            export_data = self._build_case_export(case, user_settings)
            filename = f"{case.pk:04d}_{sanitize_filename(case.name)}_backup.json"
            path = output_dir / filename
            path.write_text(
                json.dumps(export_data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            exported_count += 1

        self.stdout.write(self.style.SUCCESS(f"Exported {exported_count} case JSON file(s)."))

    def _build_case_export(self, case, user_settings):
        transactions = case.transactions.all().order_by("date", "id")
        totals = transactions.aggregate(total_in=Sum("amount_in"), total_out=Sum("amount_out"))

        export_fields = [
            "date", "bank_name", "branch_name", "account_type", "account_number",
            "description", "amount_out", "amount_in", "balance",
            "category", "holder", "is_large", "is_transfer", "transfer_to",
            "is_flagged", "memo",
        ]

        transactions_data = []
        for tx_dict in transactions.with_account_info().values(*export_fields):
            if tx_dict["date"]:
                tx_dict["date"] = tx_dict["date"].isoformat()
            transactions_data.append(tx_dict)

        return {
            "version": "1.0",
            "exported_at": datetime.now().isoformat(),
            "case": {
                "name": case.name,
                "created_at": case.created_at.isoformat() if case.created_at else None,
            },
            "transactions": transactions_data,
            "statistics": {
                "total_transactions": len(transactions_data),
                "total_in": totals["total_in"] or 0,
                "total_out": totals["total_out"] or 0,
            },
            "settings": user_settings,
        }
