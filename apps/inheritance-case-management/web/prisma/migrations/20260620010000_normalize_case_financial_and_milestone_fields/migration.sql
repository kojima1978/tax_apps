-- 報酬計算用の相続人数であることをDB列名でも明確化する。
ALTER TABLE "InheritanceCase"
RENAME COLUMN "heirCount" TO "feeCalculationHeirCount";

-- 紹介料金額は常に数値として保持し、率計算との差異を手動上書きとして明示する。
ALTER TABLE "InheritanceCase"
ADD COLUMN "isReferralFeeManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isEstimateReferralFeeManual" BOOLEAN NOT NULL DEFAULT false;

UPDATE "InheritanceCase"
SET
  "isReferralFeeManual" = CASE
    WHEN COALESCE("referralFeeRate", 0) > 0
      AND COALESCE("referralFeeAmount", 0) <> FLOOR(COALESCE("feeAmount", 0) * "referralFeeRate" / 100.0)
    THEN true ELSE false
  END,
  "isEstimateReferralFeeManual" = CASE
    WHEN COALESCE("referralFeeRate", 0) > 0
      AND COALESCE("estimateReferralFeeAmount", 0) <> FLOOR(COALESCE("estimateAmount", 0) * "referralFeeRate" / 100.0)
    THEN true ELSE false
  END,
  "referralFeeAmount" = COALESCE("referralFeeAmount", 0),
  "estimateReferralFeeAmount" = COALESCE("estimateReferralFeeAmount", 0);

ALTER TABLE "InheritanceCase"
ALTER COLUMN "referralFeeAmount" SET DEFAULT 0,
ALTER COLUMN "referralFeeAmount" SET NOT NULL,
ALTER COLUMN "estimateReferralFeeAmount" SET DEFAULT 0,
ALTER COLUMN "estimateReferralFeeAmount" SET NOT NULL;

-- 必須マイルストン日付の欠落だけを、既存の後続日付から補完する。
UPDATE "InheritanceCase"
SET "caseAddedDate" = COALESCE(
  "caseAddedDate", "caseCompletedDate", "billedDate", "paidDate", "createdAt"::date
)
WHERE "status" IN ('受託', '手続中', '最終確認', '申告済', '請求済', '入金済')
  AND "caseAddedDate" IS NULL;

UPDATE "InheritanceCase"
SET "caseCompletedDate" = COALESCE(
  "caseCompletedDate", "billedDate", "paidDate", "updatedAt"::date
)
WHERE "status" IN ('申告済', '請求済', '入金済')
  AND "caseCompletedDate" IS NULL;

UPDATE "InheritanceCase"
SET "billedDate" = COALESCE("billedDate", "paidDate", "updatedAt"::date)
WHERE "status" IN ('請求済', '入金済')
  AND "billedDate" IS NULL;

UPDATE "InheritanceCase"
SET "paidDate" = COALESCE("paidDate", "billedDate", "updatedAt"::date)
WHERE "status" = '入金済'
  AND "paidDate" IS NULL;

-- ステータスより先のマイルストン日付は保持しない。
UPDATE "InheritanceCase"
SET
  "caseAddedDate" = CASE
    WHEN "status" IN ('受託', '手続中', '最終確認', '申告済', '請求済', '入金済') THEN "caseAddedDate" ELSE NULL
  END,
  "caseCompletedDate" = CASE
    WHEN "status" IN ('申告済', '請求済', '入金済') THEN "caseCompletedDate" ELSE NULL
  END,
  "billedDate" = CASE
    WHEN "status" IN ('請求済', '入金済') THEN "billedDate" ELSE NULL
  END,
  "paidDate" = CASE
    WHEN "status" = '入金済' THEN "paidDate" ELSE NULL
  END;

ALTER TABLE "InheritanceCase"
ADD CONSTRAINT "InheritanceCase_caseAddedDate_status_check"
CHECK (("status" IN ('受託', '手続中', '最終確認', '申告済', '請求済', '入金済')) = ("caseAddedDate" IS NOT NULL)),
ADD CONSTRAINT "InheritanceCase_caseCompletedDate_status_check"
CHECK (("status" IN ('申告済', '請求済', '入金済')) = ("caseCompletedDate" IS NOT NULL)),
ADD CONSTRAINT "InheritanceCase_billedDate_status_check"
CHECK (("status" IN ('請求済', '入金済')) = ("billedDate" IS NOT NULL)),
ADD CONSTRAINT "InheritanceCase_paidDate_status_check"
CHECK (("status" = '入金済') = ("paidDate" IS NOT NULL));
