-- 明細の系統キー。年度をまたいで「同じ明細」を1つとして扱う（前年度コピーで明細と一緒に写る）。
-- 既存の明細は、隣り合う年度（同じ顧客で1つ前にある年度）で「確実に同じ」と言えるものだけを結ぶ:
--   区分・科目・名称・金融機関・不動産の種類・所在の原文がすべて一致し、両方の年度でその組が1件だけ。
--   迷うもの（同じ名前の明細が2件以上ある・年度の間で名前を変えた）は結ばずに別のキーを振る。
-- 規則はアプリの src/lib/position-lineage.ts（キーを持たない旧いバックアップの復元で使う）と同じ。
ALTER TABLE "Position" ADD COLUMN "lineageKey" UUID;

WITH RECURSIVE p AS (
  SELECT pos."id", s."householdId" AS h, s."fiscalYear" AS y,
         pos."side", pos."category", pos."name", pos."institution",
         COALESCE(pos."assetDetails"->>'propertyType', '') AS pt,
         COALESCE(pos."assetDetails"->>'propertyAddress', '') AS pa
  FROM "Position" pos JOIN "Snapshot" s ON s."id" = pos."snapshotId"
), g AS (
  SELECT p.*,
         count(*) OVER (PARTITION BY p.h, p.y, p."side", p."category", p."name", p."institution", p.pt, p.pa) AS n,
         (SELECT max(s2."fiscalYear") FROM "Snapshot" s2 WHERE s2."householdId" = p.h AND s2."fiscalYear" < p.y) AS prev_y
  FROM p
), edge AS (
  SELECT a."id" AS parent, b."id" AS child
  FROM g b
  JOIN g a ON a.h = b.h AND a.y = b.prev_y
          AND a."side" = b."side" AND a."category" = b."category" AND a."name" = b."name"
          AND a."institution" = b."institution" AND a.pt = b.pt AND a.pa = b.pa
  WHERE a.n = 1 AND b.n = 1
), chain AS (
  SELECT g."id", gen_random_uuid() AS key FROM g WHERE NOT EXISTS (SELECT 1 FROM edge WHERE edge.child = g."id")
  UNION ALL
  SELECT edge.child, chain.key FROM chain JOIN edge ON edge.parent = chain."id"
)
UPDATE "Position" SET "lineageKey" = chain.key FROM chain WHERE "Position"."id" = chain."id";

ALTER TABLE "Position" ALTER COLUMN "lineageKey" SET DEFAULT gen_random_uuid();
ALTER TABLE "Position" ALTER COLUMN "lineageKey" SET NOT NULL;
CREATE UNIQUE INDEX "Position_snapshotId_lineageKey_key" ON "Position"("snapshotId", "lineageKey");
