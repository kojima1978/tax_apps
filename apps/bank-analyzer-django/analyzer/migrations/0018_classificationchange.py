import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("analyzer", "0017_add_description_search"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClassificationChange",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("transaction_identifier", models.PositiveBigIntegerField(verbose_name="取引ID")),
                (
                    "transaction_description",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=255,
                        verbose_name="摘要（変更時点）",
                    ),
                ),
                ("old_category", models.CharField(max_length=100, verbose_name="変更前分類")),
                ("new_category", models.CharField(max_length=100, verbose_name="変更後分類")),
                ("change_group", models.UUIDField(db_index=True, verbose_name="変更操作ID")),
                ("source", models.CharField(default="manual", max_length=50, verbose_name="変更元")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="変更日時")),
                ("reverted_at", models.DateTimeField(blank=True, null=True, verbose_name="取消日時")),
                (
                    "case",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="classification_changes",
                        to="analyzer.case",
                        verbose_name="案件",
                    ),
                ),
                (
                    "transaction",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="classification_changes",
                        to="analyzer.transaction",
                        verbose_name="対象取引",
                    ),
                ),
            ],
            options={
                "verbose_name": "分類変更履歴",
                "verbose_name_plural": "分類変更履歴",
                "ordering": ["-created_at", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="classificationchange",
            index=models.Index(
                fields=["case", "created_at"],
                name="analyzer_cl_case_id_18f699_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="classificationchange",
            index=models.Index(
                fields=["case", "reverted_at"],
                name="analyzer_cl_case_id_855c2c_idx",
            ),
        ),
    ]
