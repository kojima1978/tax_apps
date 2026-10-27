-- 相続税・その他税金・承継関連費用を年度（Snapshot）だけに持たせる。
-- Household 側の同じ列は現在年度の写しで、画面はもともと年度側を表示していた。
-- 年度を増やすと写しだけ前年の値のまま残り、「税金を入力」が前年の税額を初期値として
-- 出していた（保存すると新年度へ写る）ので、持ち主を年度1つにする。

ALTER TABLE "Snapshot" ADD COLUMN "successionCosts" DECIMAL(24,0) NOT NULL DEFAULT 0;
ALTER TABLE "Snapshot" ADD COLUMN "inheritanceTaxUpdatedAt" TIMESTAMP(3);

-- 承継関連費用は顧客単位だったため、すべての年度へ同じ値を写す
-- （どの年度のB/Sでも同じ額を差し引いていたので、そのときの表示をそのまま保つ）。
UPDATE "Snapshot" AS s
SET "successionCosts" = h."successionCosts"
FROM "Household" AS h
WHERE s."householdId" = h."id" AND h."successionCosts" <> 0;

-- 計算時刻は現在年度のものだけが意味を持つ（ほかの年度は計算していない）。
UPDATE "Snapshot" AS s
SET "inheritanceTaxUpdatedAt" = h."inheritanceTaxUpdatedAt"
FROM "Household" AS h
WHERE s."householdId" = h."id" AND s."isCurrent" AND h."inheritanceTaxUpdatedAt" IS NOT NULL;

-- 相続税額・その他税金は写さない。画面が読んでいたのは年度側なので、
-- ここで顧客側の値を上書きすると今まで見えていた金額が変わってしまう。

-- 現在年度は顧客ごとに1つ。重複していたら年度の新しいほうを残す。
UPDATE "Snapshot"
SET "isCurrent" = false
WHERE "isCurrent" AND "id" NOT IN (
  SELECT DISTINCT ON ("householdId") "id"
  FROM "Snapshot"
  WHERE "isCurrent"
  ORDER BY "householdId", "fiscalYear" DESC, "id" DESC
);

-- 全件の `WHERE "isCurrent"` も部分索引で引けるので、単独の索引は落とす。
DROP INDEX IF EXISTS "Snapshot_isCurrent_idx";
CREATE UNIQUE INDEX "Snapshot_householdId_isCurrent_key" ON "Snapshot" ("householdId") WHERE "isCurrent";

ALTER TABLE "Household"
  DROP COLUMN "estimatedInheritanceTax",
  DROP COLUMN "otherTaxes",
  DROP COLUMN "successionCosts",
  DROP COLUMN "inheritanceTaxUpdatedAt";
