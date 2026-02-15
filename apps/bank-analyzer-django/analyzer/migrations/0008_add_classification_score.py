# Generated manually for classification_score field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0007_add_large_transfer_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='classification_score',
            field=models.IntegerField(default=0, help_text='0: 未分類, 100: 完全一致, 90+: ファジーマッチ', verbose_name='分類信頼度'),
        ),
    ]
