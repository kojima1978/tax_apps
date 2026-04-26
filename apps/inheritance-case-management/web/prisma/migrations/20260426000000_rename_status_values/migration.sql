-- ステータス値リネーム: HandlingStatus + AcceptanceStatus
-- HandlingStatus: 対応中/対応終了/未分割 → 対応中/対応終了/対応終了（未分割）/対応外
-- AcceptanceStatus: 受託可/受託不可/未判定/保留 → 未判定/受託/見送り

-- ── 1. 旧CHECK制約をすべて先に削除 ────────────────────────────
ALTER TABLE "InheritanceCase" DROP CONSTRAINT IF EXISTS "InheritanceCase_handlingStatus_check";
ALTER TABLE "InheritanceCase" DROP CONSTRAINT IF EXISTS "InheritanceCase_acceptanceStatus_check";

-- ── 2. handlingStatus 値の書き換え ─────────────────────────────
UPDATE "InheritanceCase" SET "handlingStatus" = '対応終了（未分割）' WHERE "handlingStatus" = '未分割';

-- ── 3. acceptanceStatus 値の書き換え ──────────────────────────
UPDATE "InheritanceCase" SET "acceptanceStatus" = '受託' WHERE "acceptanceStatus" = '受託可';
UPDATE "InheritanceCase" SET "acceptanceStatus" = '見送り' WHERE "acceptanceStatus" = '受託不可';
UPDATE "InheritanceCase" SET "acceptanceStatus" = '未判定' WHERE "acceptanceStatus" = '保留';

-- ── 4. 新CHECK制約を追加 ──────────────────────────────────────
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_handlingStatus_check"
  CHECK ("handlingStatus" IN ('対応中', '対応終了', '対応終了（未分割）', '対応外'));
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_acceptanceStatus_check"
  CHECK ("acceptanceStatus" IN ('未判定', '受託', '見送り'));
