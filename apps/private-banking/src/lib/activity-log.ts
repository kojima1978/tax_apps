import { Prisma, PrismaClient } from "@prisma/client";

type ActivityDb = PrismaClient | Prisma.TransactionClient;

export type ActivityInput = {
  householdId: number | null;
  householdName: string;
  clientCode: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "CALCULATE" | "RESTORE";
  entityType: "CLIENT" | "SNAPSHOT" | "POSITION" | "FAMILY" | "TAX" | "SCENARIO" | "BACKUP";
  entityId?: string | number | null;
  summary: string;
  details?: Prisma.InputJsonValue;
};

/** 業務データの更新と同じトランザクションで呼び出せる監査ログ。 */
export function writeActivityLog(db: ActivityDb, input: ActivityInput) {
  return db.activityLog.create({
    data: {
      ...input,
      entityId: input.entityId == null ? null : String(input.entityId),
      details: input.details ?? Prisma.DbNull,
    },
  });
}

export const activityActionLabel: Record<string, string> = {
  CREATE: "登録", UPDATE: "更新", DELETE: "削除", CALCULATE: "計算", RESTORE: "復元",
};
