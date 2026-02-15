# Generated manually for custom_patterns field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0008_add_classification_score'),
    ]

    operations = [
        migrations.AddField(
            model_name='case',
            name='custom_patterns',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='案件固有のキーワードパターン',
                verbose_name='カスタム分類パターン'
            ),
        ),
    ]
