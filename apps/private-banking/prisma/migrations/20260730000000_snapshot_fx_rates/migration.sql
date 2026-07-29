-- 円換算レートを明細ごとではなく年度ごとに持つ。
ALTER TABLE "Snapshot" ADD COLUMN "fxRates" JSONB;

-- 既存の外貨明細に入力済みのレートを年度設定へ吸い上げる。
-- 同じ年度・同じ通貨に複数のレートがある場合は、最後に更新した明細のレートを採用する。
UPDATE "Snapshot" AS s
SET "fxRates" = aggregated.rates
FROM (
  SELECT "snapshotId", jsonb_object_agg(currency, rate) AS rates
  FROM (
    SELECT DISTINCT ON ("snapshotId", currency)
      "snapshotId", currency, "fxRate"::double precision AS rate
    FROM "Position"
    WHERE currency <> 'JPY' AND "fxRate" > 0
    ORDER BY "snapshotId", currency, "updatedAt" DESC, id DESC
  ) AS latest
  GROUP BY "snapshotId"
) AS aggregated
WHERE s.id = aggregated."snapshotId";
