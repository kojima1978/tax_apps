-- Split Person master into HeirPerson and RelatedPartyPerson
-- 全ての既存 Person 行は相続人として使用されているため HeirPerson に id を保持して移行
-- RelatedPartyPerson は空テーブルで開始

-- 1. HeirPerson テーブル作成
CREATE TABLE "HeirPerson" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameKana" TEXT NOT NULL DEFAULT '',
  "nameKanaNormalized" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "postalCode" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "addressFromPostalCode" TEXT NOT NULL DEFAULT '',
  "addressManual" TEXT NOT NULL DEFAULT '',
  "memo" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HeirPerson_name_idx" ON "HeirPerson"("name");
CREATE INDEX "HeirPerson_nameKana_idx" ON "HeirPerson"("nameKana");
CREATE INDEX "HeirPerson_nameKanaNormalized_idx" ON "HeirPerson"("nameKanaNormalized");
CREATE INDEX "HeirPerson_active_idx" ON "HeirPerson"("active");

-- 2. RelatedPartyPerson テーブル作成
CREATE TABLE "RelatedPartyPerson" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameKana" TEXT NOT NULL DEFAULT '',
  "nameKanaNormalized" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "postalCode" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "addressFromPostalCode" TEXT NOT NULL DEFAULT '',
  "addressManual" TEXT NOT NULL DEFAULT '',
  "memo" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RelatedPartyPerson_name_idx" ON "RelatedPartyPerson"("name");
CREATE INDEX "RelatedPartyPerson_nameKana_idx" ON "RelatedPartyPerson"("nameKana");
CREATE INDEX "RelatedPartyPerson_nameKanaNormalized_idx" ON "RelatedPartyPerson"("nameKanaNormalized");
CREATE INDEX "RelatedPartyPerson_active_idx" ON "RelatedPartyPerson"("active");

-- 3. 既存 Person データを HeirPerson に id を保持してコピー
INSERT INTO "HeirPerson" (
  "id", "name", "nameKana", "nameKanaNormalized",
  "phone", "postalCode", "address",
  "addressFromPostalCode", "addressManual",
  "memo", "active", "createdAt", "updatedAt"
)
SELECT
  "id", "name", "nameKana", "nameKanaNormalized",
  "phone", "postalCode", "address",
  "addressFromPostalCode", "addressManual",
  "memo", "active", "createdAt", "updatedAt"
FROM "Person";

-- 4. シーケンスを最大値に合わせる（次の挿入で id 衝突を防ぐ）
SELECT setval(
  pg_get_serial_sequence('"HeirPerson"', 'id'),
  COALESCE((SELECT MAX("id") FROM "HeirPerson"), 0) + 1,
  false
);

-- 5. CaseHeir の FK を Person → HeirPerson に張り替え
ALTER TABLE "CaseHeir" DROP CONSTRAINT "CaseHeir_personId_fkey";
ALTER TABLE "CaseHeir" ADD CONSTRAINT "CaseHeir_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "HeirPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. CaseRelatedParty の FK を Person → RelatedPartyPerson に張り替え
-- 既存 CaseRelatedParty 行は 0 件（B案決定時にユーザー確認済）。
-- 万一行が残っていれば FK 違反で失敗する（=未移行データの保全）
ALTER TABLE "CaseRelatedParty" DROP CONSTRAINT "CaseRelatedParty_personId_fkey";
ALTER TABLE "CaseRelatedParty" ADD CONSTRAINT "CaseRelatedParty_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "RelatedPartyPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. 旧 Person テーブルを削除
DROP TABLE "Person";
