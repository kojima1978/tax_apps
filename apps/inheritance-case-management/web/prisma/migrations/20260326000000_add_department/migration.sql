-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_active_idx" ON "Department"("active");

-- Seed default departments from existing data
INSERT INTO "Department" ("name", "sortOrder", "updatedAt")
VALUES
    ('会計部', 1, NOW()),
    ('医療部', 2, NOW()),
    ('建設部', 3, NOW()),
    ('資産税部', 4, NOW());

-- Add departmentId column to Assignee
ALTER TABLE "Assignee" ADD COLUMN "departmentId" INTEGER;

-- Migrate existing department string to FK
UPDATE "Assignee" a
SET "departmentId" = d."id"
FROM "Department" d
WHERE a."department" = d."name";

-- Drop old department string column
ALTER TABLE "Assignee" DROP COLUMN "department";

-- Add FK constraint and index
ALTER TABLE "Assignee" ADD CONSTRAINT "Assignee_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Assignee_departmentId_idx" ON "Assignee"("departmentId");
