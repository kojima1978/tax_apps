-- 自動計算モードでは、保存額と率計算結果の一致をDBでも保証する。
UPDATE "InheritanceCase"
SET "isReferralFeeManual" = true
WHERE "referralFeeAmount" <> FLOOR(COALESCE("feeAmount", 0) * COALESCE("referralFeeRate", 0) / 100.0);

UPDATE "InheritanceCase"
SET "isEstimateReferralFeeManual" = true
WHERE "estimateReferralFeeAmount" <> FLOOR(COALESCE("estimateAmount", 0) * COALESCE("referralFeeRate", 0) / 100.0);

ALTER TABLE "InheritanceCase"
ADD CONSTRAINT "InheritanceCase_referralFee_auto_amount_check"
CHECK (
  "isReferralFeeManual"
  OR "referralFeeAmount" = FLOOR(COALESCE("feeAmount", 0) * COALESCE("referralFeeRate", 0) / 100.0)
),
ADD CONSTRAINT "InheritanceCase_estimateReferralFee_auto_amount_check"
CHECK (
  "isEstimateReferralFeeManual"
  OR "estimateReferralFeeAmount" = FLOOR(COALESCE("estimateAmount", 0) * COALESCE("referralFeeRate", 0) / 100.0)
);
