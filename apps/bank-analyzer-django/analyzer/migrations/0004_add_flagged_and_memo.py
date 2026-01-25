# Generated manually for adding flagged and memo fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0003_add_updated_at_and_indexes'),
    ]

    operations = [
        # is_flagged フィールド追加
        migrations.AddField(
            model_name='transaction',
            name='is_flagged',
            field=models.BooleanField(default=False, verbose_name='要確認フラグ'),
        ),
        # memo フィールド追加
        migrations.AddField(
            model_name='transaction',
            name='memo',
            field=models.TextField(blank=True, null=True, verbose_name='メモ'),
        ),
        # category フィールドにデフォルト値追加
        migrations.AlterField(
            model_name='transaction',
            name='category',
            field=models.CharField(default='未分類', max_length=100, verbose_name='分類'),
        ),
        # is_flagged 用のインデックス追加
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['case', 'is_flagged'], name='analyzer_tr_case_id_flagged_idx'),
        ),
    ]
