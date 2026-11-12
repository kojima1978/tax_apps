-- 担当者（社員台帳の写し）にフリガナを足す。既存の行は空のまま、次の写しで台帳から入る
ALTER TABLE "Assignee" ADD COLUMN "nameKana" TEXT NOT NULL DEFAULT '';
