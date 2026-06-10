from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0013_add_print_order'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='transaction',
            old_name='analyzer_tr_case_id_acct_idx',
            new_name='analyzer_tr_case_id_cfc7bb_idx',
        ),
        migrations.RenameIndex(
            model_name='transaction',
            old_name='analyzer_tr_case_id_lg_idx',
            new_name='analyzer_tr_case_id_4d6dc2_idx',
        ),
        migrations.RenameIndex(
            model_name='transaction',
            old_name='analyzer_tr_case_id_tf_idx',
            new_name='analyzer_tr_case_id_0b746a_idx',
        ),
    ]
