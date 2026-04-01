from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0010_normalize_account'),
    ]

    operations = [
        migrations.AddField(
            model_name='case',
            name='reference_date',
            field=models.DateField(
                blank=True,
                help_text='この日付を基準に取引を前/当日/後に分類',
                null=True,
                verbose_name='基準日',
            ),
        ),
    ]
