-- 対策シナリオ（PlanningScenario）は画面も API も無く、バックアップで往復するだけの残骸だった。
-- 削除前の行は夜間の pg_dump に残る。旧い JSON バックアップの planningScenarios は読み飛ばす
DROP TABLE "PlanningScenario";
