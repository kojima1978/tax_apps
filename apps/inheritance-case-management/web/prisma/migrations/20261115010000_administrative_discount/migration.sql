-- 遺産整理業務の報酬を相続税申告の報酬から値引く設定。
-- Enabled = 値引くかどうか、Amount = null なら遺産整理明細の合計と同額（自動追従）、
-- 数値ならその案件だけ手入力で固定。
ALTER TABLE "InheritanceCase" ADD COLUMN "administrativeDiscountEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InheritanceCase" ADD COLUMN "administrativeDiscountAmount" INTEGER;
