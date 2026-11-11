-- 社員台帳からの写しの記録（再起動しても前回の結果と最後に成功した時刻が見えるように）
CREATE TABLE "StaffDirectorySyncRun" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "unlinked" JSONB,

    CONSTRAINT "StaffDirectorySyncRun_pkey" PRIMARY KEY ("id")
);
