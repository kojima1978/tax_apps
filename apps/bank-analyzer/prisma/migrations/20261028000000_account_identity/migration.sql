-- 口座の同一性を「銀行名・支店名・口座番号」にする（それまでは口座番号だけ）。
--
-- 番号は銀行をまたげば普通に重なるし、同じ銀行でも支店が違えば別の口座。UNIQUE が
-- (case_id, account_number) だったため、別の銀行の口座が1件に合流し、取引も残高証明も
-- まとめて1つの口座に付いていた。アプリ側の判定も server/lib/accountIdentity.ts に集めた。
--
-- 銀行名・支店名を NOT NULL DEFAULT '' にするのが前提 ── Postgres の UNIQUE は NULL を
-- 重複と見ないので、nullable のままでは「銀行名の無い同じ番号の口座」を何件でも作れてしまう
-- （＝ DB 側で同一性を守れない）。

-- 1. 空欄を '' に寄せる（画面・取込の経路は既に '' を書いていたので、NULL と '' が混在していた）
UPDATE "analyzer_account" SET "bank_name" = '' WHERE "bank_name" IS NULL;
UPDATE "analyzer_account" SET "branch_name" = '' WHERE "branch_name" IS NULL;

-- 2. 前後の空白の違いで別の口座にしないため、同一性に使う3欄を btrim する。
--    btrim した結果が同じ案件の別の口座とぶつかる場合は触らない（勝手に合流させない）。
UPDATE "analyzer_account" a
   SET "bank_name" = btrim(a."bank_name"),
       "branch_name" = btrim(a."branch_name"),
       "account_number" = btrim(a."account_number")
 WHERE (a."bank_name" <> btrim(a."bank_name")
     OR a."branch_name" <> btrim(a."branch_name")
     OR a."account_number" <> btrim(a."account_number"))
   AND NOT EXISTS (
     SELECT 1 FROM "analyzer_account" b
      WHERE b."case_id" = a."case_id"
        AND b."id" <> a."id"
        AND btrim(b."bank_name") = btrim(a."bank_name")
        AND btrim(b."branch_name") = btrim(a."branch_name")
        AND btrim(b."account_number") = btrim(a."account_number")
   );

-- 3. 空欄は NULL ではなく ''
ALTER TABLE "analyzer_account"
    ALTER COLUMN "bank_name" SET DEFAULT '',
    ALTER COLUMN "bank_name" SET NOT NULL,
    ALTER COLUMN "branch_name" SET DEFAULT '',
    ALTER COLUMN "branch_name" SET NOT NULL;

-- 4. 同一性の付け替え。新しい方が緩いので、既存のデータが違反することはない
ALTER TABLE "analyzer_account" DROP CONSTRAINT "unique_case_account";
ALTER TABLE "analyzer_account"
    ADD CONSTRAINT "unique_case_account" UNIQUE ("case_id", "bank_name", "branch_name", "account_number");

-- 5. 番号での検索（引き継ぎ候補を探す・一括置換）は旧 UNIQUE の索引に乗っていたので、
--    ユニークでない索引として作り直す
CREATE INDEX "analyzer_account_case_id_account_number"
    ON "analyzer_account" ("case_id", "account_number");
