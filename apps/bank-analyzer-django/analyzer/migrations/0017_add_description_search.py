import unicodedata

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations, models


KATAKANA_TO_HIRAGANA = str.maketrans(
    'アイウエオカキクケコサシスセソタチツテト'
    'ナニヌネノハヒフヘホマミムメモヤユヨ'
    'ラリルレロワヲンァィゥェォッャュョヮヴ'
    'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ',
    'あいうえおかきくけこさしすせそたちつてと'
    'なにぬねのはひふへほまみむめもやゆよ'
    'らりるれろわをんぁぃぅぇぉっゃゅょゎゔ'
    'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ',
)


def normalize_description(text):
    return unicodedata.normalize('NFKC', text or '').casefold().translate(
        KATAKANA_TO_HIRAGANA
    )


def populate_description_search(apps, schema_editor):
    Transaction = apps.get_model('analyzer', 'Transaction')
    batch = []
    for transaction in Transaction.objects.only('id', 'description').iterator(chunk_size=1000):
        transaction.description_search = normalize_description(transaction.description)
        batch.append(transaction)
        if len(batch) >= 1000:
            Transaction.objects.bulk_update(batch, ['description_search'])
            batch = []
    if batch:
        Transaction.objects.bulk_update(batch, ['description_search'])


class Migration(migrations.Migration):

    dependencies = [
        ('analyzer', '0016_deletionbackup'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='description_search',
            field=models.TextField(
                blank=True,
                default='',
                editable=False,
                verbose_name='検索用摘要',
            ),
        ),
        TrigramExtension(),
        migrations.RunPython(
            populate_description_search,
            migrations.RunPython.noop,
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=GinIndex(
                fields=['description_search'],
                name='analyzer_tx_desc_trgm',
                opclasses=['gin_trgm_ops'],
            ),
        ),
    ]
