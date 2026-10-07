-- Django がアプリ側（Python）で持っていた既定値と削除の連鎖を、DB に持たせる。
--
-- Prisma は既定値も onDelete も DB に任せる（自分では埋めない・子を消しに行かない）。
-- Django の表のままだと、値を省いた INSERT は NOT NULL で落ち、案件の削除は
-- 外部キーで落ちる。
--
-- Django 版がまだ同じ DB に書いても壊れない変更だけにしてある:
--   - 既定値: Django は INSERT で全列を明示するので使われない
--   - 外部キー: Django は子から順に消すので、ON DELETE CASCADE / SET NULL は空振りする。
--     DEFERRABLE INITIALLY DEFERRED は外す（Prisma の既定の形にそろえる）。
--     Django は親を先に作ってから子を入れるので、即時検査でも通る
--
-- 外部キーの名前は Prisma の既定（<表>_<列>_fkey）にそろえる。こうしておくと
-- `prisma migrate diff` で schema.prisma との差が出ない。

-- 既定値
ALTER TABLE "analyzer_case"
    ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "custom_patterns" SET DEFAULT '{}';

ALTER TABLE "analyzer_account"
    ALTER COLUMN "has_accrued_interest" SET DEFAULT false,
    ALTER COLUMN "passbook_years" SET DEFAULT '{}',
    ALTER COLUMN "inventory_remarks" SET DEFAULT '',
    ALTER COLUMN "print_order" SET DEFAULT 0;

ALTER TABLE "analyzer_transaction"
    ALTER COLUMN "amount_out" SET DEFAULT 0,
    ALTER COLUMN "amount_in" SET DEFAULT 0,
    ALTER COLUMN "is_large" SET DEFAULT false,
    ALTER COLUMN "is_transfer" SET DEFAULT false,
    ALTER COLUMN "category" SET DEFAULT '未分類',
    ALTER COLUMN "classification_score" SET DEFAULT 0,
    ALTER COLUMN "is_flagged" SET DEFAULT false;

ALTER TABLE "analyzer_deletionbackup"
    ALTER COLUMN "transaction_data" SET DEFAULT '[]',
    ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "analyzer_classificationchange"
    ALTER COLUMN "transaction_description" SET DEFAULT '',
    ALTER COLUMN "source" SET DEFAULT 'manual',
    ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- 外部キー（Django: NO ACTION + DEFERRABLE → Prisma: CASCADE / SET NULL）
ALTER TABLE "analyzer_account"
    DROP CONSTRAINT "analyzer_account_case_id_eeba72e1_fk_analyzer_case_id",
    ADD CONSTRAINT "analyzer_account_case_id_fkey" FOREIGN KEY ("case_id")
        REFERENCES "analyzer_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analyzer_transaction"
    DROP CONSTRAINT "analyzer_transaction_case_id_c94f6f84_fk_analyzer_case_id",
    DROP CONSTRAINT "analyzer_transaction_account_id_2bfe6161_fk_analyzer_account_id",
    ADD CONSTRAINT "analyzer_transaction_case_id_fkey" FOREIGN KEY ("case_id")
        REFERENCES "analyzer_case"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "analyzer_transaction_account_id_fkey" FOREIGN KEY ("account_id")
        REFERENCES "analyzer_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analyzer_deletionbackup"
    DROP CONSTRAINT "analyzer_deletionbackup_case_id_43d64ad8_fk_analyzer_case_id",
    ADD CONSTRAINT "analyzer_deletionbackup_case_id_fkey" FOREIGN KEY ("case_id")
        REFERENCES "analyzer_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analyzer_classificationchange"
    DROP CONSTRAINT "analyzer_classificat_case_id_521737b8_fk_analyzer_",
    DROP CONSTRAINT "analyzer_classificat_transaction_id_6a4f7c8a_fk_analyzer_",
    ADD CONSTRAINT "analyzer_classificationchange_case_id_fkey" FOREIGN KEY ("case_id")
        REFERENCES "analyzer_case"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "analyzer_classificationchange_transaction_id_fkey" FOREIGN KEY ("transaction_id")
        REFERENCES "analyzer_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
