"""分類変更履歴の記録と安全な取り消し。"""
import uuid

from django.db import transaction as db_transaction
from django.utils import timezone

from ..models import Case, ClassificationChange, Transaction
from .utils import parse_int_ids


class ClassificationHistoryService:
    """分類変更を操作単位で記録し、LIFO順で復元する。"""

    @staticmethod
    @db_transaction.atomic
    def apply_changes(
        case: Case,
        category_updates: dict[str | int, str],
        *,
        source: str = "manual",
    ) -> tuple[int, str | None]:
        if not category_updates:
            return 0, None

        normalized = {str(key): value for key, value in category_updates.items() if value}
        tx_ids = parse_int_ids(list(normalized.keys()))
        if tx_ids is None:
            return 0, None

        # 案件単位で分類操作を直列化し、「直前」の順序を確定させる。
        Case.objects.select_for_update().only("pk").get(pk=case.pk)
        transactions = list(
            case.transactions.select_for_update()
            .filter(id__in=tx_ids)
            .only("id", "description", "category")
        )
        changes = []
        updates = []
        change_group = uuid.uuid4()

        for tx in transactions:
            new_category = normalized.get(str(tx.id))
            if not new_category or tx.category == new_category:
                continue
            changes.append(
                ClassificationChange(
                    case=case,
                    transaction=tx,
                    transaction_identifier=tx.id,
                    transaction_description=tx.description or "",
                    old_category=tx.category,
                    new_category=new_category,
                    change_group=change_group,
                    source=source,
                )
            )
            tx.category = new_category
            updates.append(tx)

        if not updates:
            return 0, None

        ClassificationChange.objects.bulk_create(changes)
        Transaction.objects.bulk_update(updates, ["category"])
        return len(updates), str(change_group)

    @staticmethod
    def latest_group(case: Case):
        return (
            case.classification_changes
            .filter(reverted_at__isnull=True)
            .order_by("-created_at", "-id")
            .values_list("change_group", flat=True)
            .first()
        )

    @staticmethod
    @db_transaction.atomic
    def undo_latest(case: Case, change_group: str) -> dict:
        try:
            group_uuid = uuid.UUID(str(change_group))
        except (ValueError, TypeError, AttributeError):
            return {"success": False, "error": "変更履歴IDが正しくありません。", "status": 400}

        Case.objects.select_for_update().only("pk").get(pk=case.pk)
        latest_change = (
            case.classification_changes.select_for_update()
            .filter(reverted_at__isnull=True)
            .order_by("-created_at", "-id")
            .first()
        )
        latest_group = latest_change.change_group if latest_change else None
        if not latest_group or latest_group != group_uuid:
            return {
                "success": False,
                "error": "直前の分類変更ではないため取り消せません。画面を再読み込みしてください。",
                "status": 409,
            }

        changes = list(
            case.classification_changes.select_for_update()
            .filter(change_group=group_uuid, reverted_at__isnull=True)
            .order_by("id")
        )
        if not changes:
            return {"success": False, "error": "取り消せる分類変更がありません。", "status": 404}

        transaction_ids = [change.transaction_identifier for change in changes]
        transactions = {
            tx.id: tx
            for tx in case.transactions.select_for_update().filter(id__in=transaction_ids)
        }
        if len(transactions) != len(set(transaction_ids)):
            return {
                "success": False,
                "error": "対象取引が削除されているため取り消せません。",
                "status": 409,
            }

        for change in changes:
            tx = transactions[change.transaction_identifier]
            if tx.category != change.new_category:
                return {
                    "success": False,
                    "error": (
                        f"取引ID {tx.id} はその後分類が変更されているため、"
                        "安全に取り消せません。"
                    ),
                    "status": 409,
                }

        updates = []
        restored_categories = set()
        for change in changes:
            tx = transactions[change.transaction_identifier]
            tx.category = change.old_category
            updates.append(tx)
            restored_categories.add(change.old_category)

        Transaction.objects.bulk_update(updates, ["category"])
        reverted_at = timezone.now()
        ClassificationChange.objects.filter(
            case=case,
            change_group=group_uuid,
            reverted_at__isnull=True,
        ).update(reverted_at=reverted_at)

        return {
            "success": True,
            "count": len(updates),
            "restored_categories": sorted(restored_categories),
            "reverted_at": reverted_at,
        }

    @staticmethod
    def latest_summary(case: Case) -> dict | None:
        group = ClassificationHistoryService.latest_group(case)
        if not group:
            return None
        changes = list(
            case.classification_changes
            .filter(change_group=group, reverted_at__isnull=True)
            .order_by("id")
        )
        if not changes:
            return None

        old_categories = sorted({change.old_category for change in changes})
        new_categories = sorted({change.new_category for change in changes})
        first = changes[0]
        return {
            "change_group": str(group),
            "count": len(changes),
            "old_category": old_categories[0] if len(old_categories) == 1 else "複数分類",
            "new_category": new_categories[0] if len(new_categories) == 1 else "複数分類",
            "created_at": first.created_at,
            "description": first.transaction_description,
            "source": first.source,
        }
