from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0006_transaction_analyzer_tr_case_id_96ba3a_idx'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['case', 'is_large'], name='analyzer_tr_case_id_lg_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['case', 'is_transfer'], name='analyzer_tr_case_id_tf_idx'),
        ),
    ]
