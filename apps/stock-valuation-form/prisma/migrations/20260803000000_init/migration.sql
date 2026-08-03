-- 類似業種比準価額の計算に使う業種目マスタ＋業種目別株価等の初期スキーマ。

CREATE TYPE "IndustryLevel" AS ENUM ('LARGE', 'MIDDLE', 'SMALL');

CREATE TABLE "IndustryYear" (
  "id" SERIAL NOT NULL,
  "era" TEXT NOT NULL DEFAULT '令和',
  "eraYear" INTEGER NOT NULL,
  "gregorianYear" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IndustryYear_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndustryYear_label_key" ON "IndustryYear"("label");
CREATE UNIQUE INDEX "IndustryYear_gregorianYear_key" ON "IndustryYear"("gregorianYear");
CREATE UNIQUE INDEX "IndustryYear_era_eraYear_key" ON "IndustryYear"("era", "eraYear");

CREATE TABLE "IndustryCategory" (
  "id" SERIAL NOT NULL,
  "yearId" INTEGER NOT NULL,
  "number" INTEGER NOT NULL,
  "largeName" TEXT NOT NULL,
  "middleName" TEXT NOT NULL DEFAULT '',
  "smallName" TEXT NOT NULL DEFAULT '',
  "name" TEXT NOT NULL,
  "level" "IndustryLevel" NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "IndustryCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndustryCategory_yearId_number_key" ON "IndustryCategory"("yearId", "number");
CREATE INDEX "IndustryCategory_yearId_largeName_middleName_smallName_idx"
  ON "IndustryCategory"("yearId", "largeName", "middleName", "smallName");

CREATE TABLE "IndustryMetric" (
  "id" SERIAL NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "dividend" DECIMAL(8,1) NOT NULL,
  "profit" INTEGER NOT NULL,
  "netAsset" INTEGER NOT NULL,
  "previousYearAveragePrice" INTEGER NOT NULL,
  CONSTRAINT "IndustryMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndustryMetric_categoryId_key" ON "IndustryMetric"("categoryId");

CREATE TABLE "IndustryMonthlyPrice" (
  "id" SERIAL NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "twoYearAveragePrice" INTEGER,
  CONSTRAINT "IndustryMonthlyPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndustryMonthlyPrice_categoryId_year_month_key"
  ON "IndustryMonthlyPrice"("categoryId", "year", "month");
CREATE INDEX "IndustryMonthlyPrice_year_month_idx" ON "IndustryMonthlyPrice"("year", "month");

ALTER TABLE "IndustryCategory"
  ADD CONSTRAINT "IndustryCategory_yearId_fkey" FOREIGN KEY ("yearId")
  REFERENCES "IndustryYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IndustryMetric"
  ADD CONSTRAINT "IndustryMetric_categoryId_fkey" FOREIGN KEY ("categoryId")
  REFERENCES "IndustryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IndustryMonthlyPrice"
  ADD CONSTRAINT "IndustryMonthlyPrice_categoryId_fkey" FOREIGN KEY ("categoryId")
  REFERENCES "IndustryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
