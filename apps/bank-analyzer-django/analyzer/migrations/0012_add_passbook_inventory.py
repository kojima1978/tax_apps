from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0011_add_reference_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='passbook_balance',
            field=models.IntegerField(blank=True, null=True, verbose_name='通帳残高'),
        ),
        migrations.AddField(
            model_name='account',
            name='certificate_balance',
            field=models.IntegerField(blank=True, null=True, verbose_name='残証残高'),
        ),
        migrations.AddField(
            model_name='account',
            name='has_accrued_interest',
            field=models.BooleanField(default=False, verbose_name='既経過利息計算'),
        ),
        migrations.AddField(
            model_name='account',
            name='passbook_years',
            field=models.JSONField(blank=True, default=dict, verbose_name='通帳有無(年別)'),
        ),
        migrations.AddField(
            model_name='account',
            name='inventory_remarks',
            field=models.TextField(blank=True, default='', verbose_name='備考/利用状況'),
        ),
    ]
