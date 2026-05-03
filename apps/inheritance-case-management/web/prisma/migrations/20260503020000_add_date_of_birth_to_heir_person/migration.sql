-- 生年月日列を相続人マスタに追加（NULL 許容、既存データは null で開始）
ALTER TABLE "HeirPerson" ADD COLUMN "dateOfBirth" DATE;
