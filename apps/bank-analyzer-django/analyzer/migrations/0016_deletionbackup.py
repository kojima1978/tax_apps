from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("analyzer", "0015_rename_categories"),
    ]

    operations = [
        migrations.CreateModel(
            name="DeletionBackup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("start_id", models.PositiveBigIntegerField(verbose_name="開始ID")),
                ("end_id", models.PositiveBigIntegerField(verbose_name="終了ID")),
                ("transaction_data", models.JSONField(default=list, verbose_name="取引バックアップ")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="作成日時")),
                ("restored_at", models.DateTimeField(blank=True, null=True, verbose_name="復元日時")),
                (
                    "case",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="deletion_backups",
                        to="analyzer.case",
                        verbose_name="案件",
                    ),
                ),
            ],
            options={
                "verbose_name": "削除バックアップ",
                "verbose_name_plural": "削除バックアップ",
                "ordering": ["-created_at"],
            },
        ),
    ]
