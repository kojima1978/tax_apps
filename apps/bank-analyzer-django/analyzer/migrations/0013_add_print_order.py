from django.db import migrations, models


def set_initial_order(apps, schema_editor):
    Account = apps.get_model('analyzer', 'Account')
    for case_id in Account.objects.values_list('case_id', flat=True).distinct():
        accounts = Account.objects.filter(case_id=case_id).order_by('bank_name', 'branch_name', 'account_number')
        for i, acc in enumerate(accounts):
            acc.print_order = i
            acc.save(update_fields=['print_order'])


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0012_add_passbook_inventory'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='print_order',
            field=models.IntegerField(default=0, verbose_name='印刷順序'),
        ),
        migrations.RunPython(set_initial_order, migrations.RunPython.noop),
        migrations.AlterModelOptions(
            name='account',
            options={
                'ordering': ['print_order', 'bank_name', 'branch_name'],
                'verbose_name': '口座',
                'verbose_name_plural': '口座一覧',
            },
        ),
    ]
