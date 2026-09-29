-- 会社キー（同じ会社の年分をまとめる印）。翌年度更新・複製で引き継ぐ。
-- 既存の案件は NULL のまま＝今までどおり会社名で名寄せするので、入れ直しは要らない。

-- AlterTable
ALTER TABLE "ValuationCase" ADD COLUMN "companyKey" TEXT;

-- CreateIndex
CREATE INDEX "ValuationCase_companyKey_idx" ON "ValuationCase"("companyKey");
