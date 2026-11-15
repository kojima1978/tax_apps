-- 行政書士業務の料金表（全社共通のマスタ）と、案件ごとの明細。
-- 既定の25項目は投入しない（料金表が空のときにアプリ側が既定値を入れる。
-- 定数は src/lib/constants/administrative-fees.ts の1か所だけ）
CREATE TABLE "AdministrativeFeeItem" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "categoryOrder" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(120) NOT NULL,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "note" VARCHAR(200),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrativeFeeItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdministrativeFeeItem_category_name_key" ON "AdministrativeFeeItem"("category", "name");
CREATE INDEX "AdministrativeFeeItem_categoryOrder_sortOrder_idx" ON "AdministrativeFeeItem"("categoryOrder", "sortOrder");

CREATE TABLE "CaseAdministrativeFee" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "feeItemId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "category" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "memo" VARCHAR(200),

    CONSTRAINT "CaseAdministrativeFee_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaseAdministrativeFee_caseId_idx" ON "CaseAdministrativeFee"("caseId");
CREATE INDEX "CaseAdministrativeFee_caseId_sortOrder_idx" ON "CaseAdministrativeFee"("caseId", "sortOrder");

ALTER TABLE "CaseAdministrativeFee" ADD CONSTRAINT "CaseAdministrativeFee_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InheritanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseAdministrativeFee" ADD CONSTRAINT "CaseAdministrativeFee_feeItemId_fkey" FOREIGN KEY ("feeItemId") REFERENCES "AdministrativeFeeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
