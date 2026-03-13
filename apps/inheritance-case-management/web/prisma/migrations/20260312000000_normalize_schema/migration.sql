-- CreateTable: CaseContact
CREATE TABLE "CaseContact" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CaseContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CaseProgress
CREATE TABLE "CaseProgress" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "date" TEXT,
    "memo" TEXT,
    "isDynamic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CaseProgress_pkey" PRIMARY KEY ("id")
);

-- Add FK columns to InheritanceCase
ALTER TABLE "InheritanceCase" ADD COLUMN "assigneeId" TEXT;
ALTER TABLE "InheritanceCase" ADD COLUMN "referrerId" TEXT;

-- Migrate data: assignee name → assigneeId
UPDATE "InheritanceCase" ic
SET "assigneeId" = a."id"
FROM "Assignee" a
WHERE ic."assignee" IS NOT NULL
  AND ic."assignee" = a."name";

-- Migrate data: referrer string → referrerId
-- Match "company / name" format first, then company-only fallback
UPDATE "InheritanceCase" ic
SET "referrerId" = r."id"
FROM "Referrer" r
WHERE ic."referrer" IS NOT NULL
  AND (ic."referrer" = r."company" || ' / ' || r."name"
    OR ic."referrer" = r."company");

-- Extract contacts JSON → CaseContact rows
INSERT INTO "CaseContact" ("id", "caseId", "sortOrder", "name", "phone", "email")
SELECT
    gen_random_uuid()::TEXT,
    ic."id",
    (ord - 1)::INTEGER,
    COALESCE(elem->>'name', ''),
    COALESCE(elem->>'phone', ''),
    COALESCE(elem->>'email', '')
FROM "InheritanceCase" ic,
     jsonb_array_elements(ic."contacts") WITH ORDINALITY AS t(elem, ord)
WHERE ic."contacts" IS NOT NULL
  AND jsonb_typeof(ic."contacts") = 'array'
  AND jsonb_array_length(ic."contacts") > 0;

-- Extract progress JSON → CaseProgress rows
INSERT INTO "CaseProgress" ("id", "caseId", "stepId", "name", "sortOrder", "date", "memo", "isDynamic")
SELECT
    gen_random_uuid()::TEXT,
    ic."id",
    COALESCE(elem->>'id', ''),
    COALESCE(elem->>'name', ''),
    (ord - 1)::INTEGER,
    NULLIF(elem->>'date', ''),
    NULLIF(elem->>'memo', ''),
    COALESCE((elem->>'isDynamic')::BOOLEAN, false)
FROM "InheritanceCase" ic,
     jsonb_array_elements(ic."progress") WITH ORDINALITY AS t(elem, ord)
WHERE ic."progress" IS NOT NULL
  AND jsonb_typeof(ic."progress") = 'array'
  AND jsonb_array_length(ic."progress") > 0;

-- Drop old columns
ALTER TABLE "InheritanceCase" DROP COLUMN "assignee";
ALTER TABLE "InheritanceCase" DROP COLUMN "referrer";
ALTER TABLE "InheritanceCase" DROP COLUMN "contacts";
ALTER TABLE "InheritanceCase" DROP COLUMN "progress";

-- Add FK constraints
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Assignee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseContact" ADD CONSTRAINT "CaseContact_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InheritanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseProgress" ADD CONSTRAINT "CaseProgress_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InheritanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "InheritanceCase_assigneeId_idx" ON "InheritanceCase"("assigneeId");
CREATE INDEX "InheritanceCase_referrerId_idx" ON "InheritanceCase"("referrerId");
CREATE INDEX "CaseContact_caseId_idx" ON "CaseContact"("caseId");
CREATE INDEX "CaseProgress_caseId_idx" ON "CaseProgress"("caseId");
CREATE INDEX "CaseProgress_caseId_sortOrder_idx" ON "CaseProgress"("caseId", "sortOrder");
