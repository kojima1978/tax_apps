-- CaseContact: email廃止 → postalCode, address, memo追加
ALTER TABLE "CaseContact" ADD COLUMN "postalCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CaseContact" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CaseContact" ADD COLUMN "memo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CaseContact" DROP COLUMN "email";
