from django.db import migrations


CATEGORY_RENAMES = {
    "証券・株式": "証券・株式・配当",
    "銀行": "銀行・利息・手数料",
    "贈与": "贈与・教育費",
}

REVERSE_CATEGORY_RENAMES = {new: old for old, new in CATEGORY_RENAMES.items()}


def _normalize_patterns(patterns, renames):
    if not patterns:
        return {}

    normalized = {}
    for category, keywords in patterns.items():
        new_category = renames.get(category, category)
        normalized.setdefault(new_category, [])
        for keyword in keywords or []:
            if keyword not in normalized[new_category]:
                normalized[new_category].append(keyword)
    return normalized


def rename_categories(apps, schema_editor):
    Transaction = apps.get_model("analyzer", "Transaction")
    Case = apps.get_model("analyzer", "Case")

    for old_category, new_category in CATEGORY_RENAMES.items():
        Transaction.objects.filter(category=old_category).update(category=new_category)

    for case in Case.objects.exclude(custom_patterns__isnull=True):
        patterns = case.custom_patterns or {}
        normalized = _normalize_patterns(patterns, CATEGORY_RENAMES)
        if normalized != patterns:
            case.custom_patterns = normalized
            case.save(update_fields=["custom_patterns"])


def reverse_rename_categories(apps, schema_editor):
    Transaction = apps.get_model("analyzer", "Transaction")
    Case = apps.get_model("analyzer", "Case")

    for new_category, old_category in REVERSE_CATEGORY_RENAMES.items():
        Transaction.objects.filter(category=new_category).update(category=old_category)

    for case in Case.objects.exclude(custom_patterns__isnull=True):
        patterns = case.custom_patterns or {}
        normalized = _normalize_patterns(patterns, REVERSE_CATEGORY_RENAMES)
        if normalized != patterns:
            case.custom_patterns = normalized
            case.save(update_fields=["custom_patterns"])


class Migration(migrations.Migration):

    dependencies = [
        ("analyzer", "0014_rename_transaction_indexes"),
    ]

    operations = [
        migrations.RunPython(rename_categories, reverse_rename_categories),
    ]
