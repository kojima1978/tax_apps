"""
口座テーブルの正規化マイグレーション

1. Account モデルを作成
2. Transaction の既存データから Account レコードを生成
3. Transaction に account FK を設定
4. Transaction から旧口座フィールドを削除
5. 旧インデックスを削除・新インデックスを追加
"""
from django.db import migrations, models
import django.db.models.deletion


def populate_accounts(apps, schema_editor):
    """Transaction の既存口座データから Account レコードを作成し、FK を設定"""
    Account = apps.get_model('analyzer', 'Account')
    Transaction = apps.get_model('analyzer', 'Transaction')

    # 案件ごとにユニークな口座を抽出
    from django.db.models import Min
    unique_accounts = (
        Transaction.objects
        .values('case_id', 'account_id')
        .annotate(
            first_bank=Min('bank_name'),
            first_branch=Min('branch_name'),
            first_type=Min('account_type'),
            first_holder=Min('holder'),
        )
    )

    # Account レコードを一括作成
    account_map = {}  # (case_id, account_id_str) -> Account.pk
    for entry in unique_accounts:
        account_id_str = entry['account_id'] or 'unknown'
        account = Account.objects.create(
            case_id=entry['case_id'],
            account_number=account_id_str,
            bank_name=entry['first_bank'],
            branch_name=entry['first_branch'],
            account_type=entry['first_type'],
            holder=entry['first_holder'],
        )
        account_map[(entry['case_id'], account_id_str)] = account.pk

    # Transaction に account FK を設定（バッチ処理）
    batch_size = 1000
    for (case_id, account_id_str), account_pk in account_map.items():
        Transaction.objects.filter(
            case_id=case_id,
            account_id=account_id_str if account_id_str != 'unknown' else None,
        ).update(account_id_new=account_pk)

    # account_id が None で unknown にマッチしなかった残りを処理
    remaining = Transaction.objects.filter(account_id_new__isnull=True)
    for tx in remaining.iterator():
        key = (tx.case_id, tx.account_id or 'unknown')
        if key in account_map:
            tx.account_id_new = account_map[key]
            tx.save(update_fields=['account_id_new'])
        else:
            # 新たに Account を作成
            account = Account.objects.create(
                case_id=tx.case_id,
                account_number=tx.account_id or 'unknown',
                bank_name=tx.bank_name,
                branch_name=tx.branch_name,
                account_type=tx.account_type,
                holder=tx.holder,
            )
            account_map[key] = account.pk
            tx.account_id_new = account.pk
            tx.save(update_fields=['account_id_new'])


def reverse_populate(apps, schema_editor):
    """逆マイグレーション: Account の情報を Transaction に書き戻す"""
    Transaction = apps.get_model('analyzer', 'Transaction')
    Account = apps.get_model('analyzer', 'Account')

    for account in Account.objects.all():
        Transaction.objects.filter(account_id_new=account.pk).update(
            account_id=account.account_number,
            bank_name=account.bank_name,
            branch_name=account.branch_name,
            account_type=account.account_type,
            holder=account.holder,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0009_case_custom_patterns'),
    ]

    operations = [
        # 1. Account テーブルを作成
        migrations.CreateModel(
            name='Account',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('account_number', models.CharField(max_length=255, verbose_name='口座番号')),
                ('bank_name', models.CharField(blank=True, max_length=255, null=True, verbose_name='銀行名')),
                ('branch_name', models.CharField(blank=True, max_length=255, null=True, verbose_name='支店名')),
                ('account_type', models.CharField(blank=True, max_length=50, null=True, verbose_name='種別')),
                ('holder', models.CharField(blank=True, max_length=255, null=True, verbose_name='名義人')),
                ('case', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='accounts',
                    to='analyzer.case',
                    verbose_name='案件',
                )),
            ],
            options={
                'verbose_name': '口座',
                'verbose_name_plural': '口座一覧',
                'ordering': ['bank_name', 'branch_name'],
            },
        ),
        migrations.AddConstraint(
            model_name='account',
            constraint=models.UniqueConstraint(
                fields=['case', 'account_number'],
                name='unique_case_account',
            ),
        ),

        # 2. Transaction に一時的な account FK カラムを追加（nullable）
        migrations.AddField(
            model_name='transaction',
            name='account_id_new',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='+',
                to='analyzer.account',
                verbose_name='口座（新）',
                db_column='account_id_new',
            ),
        ),

        # 3. データマイグレーション: 既存データから Account を生成し FK を設定
        migrations.RunPython(populate_accounts, reverse_populate),

        # 4. 旧フィールドを削除
        migrations.RemoveField(model_name='transaction', name='account_id'),
        migrations.RemoveField(model_name='transaction', name='bank_name'),
        migrations.RemoveField(model_name='transaction', name='branch_name'),
        migrations.RemoveField(model_name='transaction', name='account_type'),
        migrations.RemoveField(model_name='transaction', name='holder'),

        # 5. 旧インデックスを削除（account_id フィールドに依存していたもの）
        migrations.RemoveIndex(
            model_name='transaction',
            name='analyzer_tr_case_id_cfc7bb_idx',
        ),

        # 6. account_id_new → account にリネーム
        migrations.RenameField(
            model_name='transaction',
            old_name='account_id_new',
            new_name='account',
        ),

        # 7. account フィールドの related_name を修正
        migrations.AlterField(
            model_name='transaction',
            name='account',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='transactions',
                to='analyzer.account',
                verbose_name='口座',
            ),
        ),

        # 8. 新しいインデックスを追加
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['case', 'account'], name='analyzer_tr_case_id_acct_idx'),
        ),
    ]
