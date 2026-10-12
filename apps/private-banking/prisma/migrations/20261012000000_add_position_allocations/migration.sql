CREATE TABLE "PositionAllocation" (
    "id" SERIAL NOT NULL,
    "positionId" INTEGER NOT NULL,
    "familyMemberId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "numerator" INTEGER NOT NULL,
    "denominator" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PositionAllocation_positive_fraction" CHECK ("numerator" > 0 AND "denominator" > 0)
);

CREATE UNIQUE INDEX "PositionAllocation_positionId_familyMemberId_role_key"
ON "PositionAllocation"("positionId", "familyMemberId", "role");

CREATE INDEX "PositionAllocation_familyMemberId_idx" ON "PositionAllocation"("familyMemberId");

ALTER TABLE "PositionAllocation"
ADD CONSTRAINT "PositionAllocation_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionAllocation"
ADD CONSTRAINT "PositionAllocation_familyMemberId_fkey"
FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
