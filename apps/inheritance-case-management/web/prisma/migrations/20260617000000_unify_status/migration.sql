-- ステータス統合: 3フィールド(acceptanceStatus/status/handlingStatus) → 1ステータス + isUndivided フラグ
-- 新status: 見積前/見積中/見送り/受託/手続中/申告済/請求済/入金済
-- isUndivided: 遺産未分割フラグ（旧 handlingStatus='対応終了（未分割）' を移行）

-- ── 1. 旧CHECK制約をすべて先に削除（status を旧enum外の値に書き換えるため） ──
ALTER TABLE "InheritanceCase" DROP CONSTRAINT IF EXISTS "InheritanceCase_status_check";
ALTER TABLE "InheritanceCase" DROP CONSTRAINT IF EXISTS "InheritanceCase_handlingStatus_check";
ALTER TABLE "InheritanceCase" DROP CONSTRAINT IF EXISTS "InheritanceCase_acceptanceStatus_check";

-- ── 2. isUndivided カラム追加 + 未分割フラグの移行 ──
ALTER TABLE "InheritanceCase" ADD COLUMN "isUndivided" BOOLEAN NOT NULL DEFAULT false;
UPDATE "InheritanceCase" SET "isUndivided" = true WHERE "handlingStatus" = '対応終了（未分割）';

-- ── 3. status を新値に変換 ──
--   見送り                          → 見送り（終端）
--   受託 + 未着手                   → 受託
--   未判定 + 未着手（見積段階）      → 見積中（既存案件はすべて見積中とみなす運用判断）
--   手続中/申告済/請求済/入金済      → そのまま保持（作業ステータスを優先）
UPDATE "InheritanceCase" SET "status" = CASE
  WHEN "acceptanceStatus" = '見送り'                      THEN '見送り'
  WHEN "status" = '未着手' AND "acceptanceStatus" = '受託' THEN '受託'
  WHEN "status" = '未着手'                                THEN '見積中'
  ELSE "status"
END;

-- ── 4. 新CHECK制約を追加 ──
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_status_check"
  CHECK ("status" IN ('見積前', '見積中', '見送り', '受託', '手続中', '申告済', '請求済', '入金済'));

-- ── 5. 旧カラムのインデックスを削除 ──
DROP INDEX IF EXISTS "InheritanceCase_handlingStatus_idx";
DROP INDEX IF EXISTS "InheritanceCase_acceptanceStatus_idx";

-- ── 6. 旧カラムを削除 ──
ALTER TABLE "InheritanceCase" DROP COLUMN "handlingStatus";
ALTER TABLE "InheritanceCase" DROP COLUMN "acceptanceStatus";

-- ── 7. isUndivided インデックスを追加 ──
CREATE INDEX "InheritanceCase_isUndivided_idx" ON "InheritanceCase"("isUndivided");
