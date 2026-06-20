CREATE INDEX "InheritanceCase_list_status_idx"
ON "InheritanceCase"("fiscalYear", "status", "dateOfDeath");

CREATE INDEX "InheritanceCase_list_assignee_idx"
ON "InheritanceCase"("fiscalYear", "assigneeId", "dateOfDeath");

CREATE INDEX "InheritanceCase_list_internal_referrer_idx"
ON "InheritanceCase"("fiscalYear", "internalReferrerId", "dateOfDeath");
