-- 既存の Person.postalCode を数字 7 桁に正規化
-- ハイフン・全角文字・スペース等を除去し、7 桁未満や 7 桁超は空文字へ
UPDATE "Person"
SET "postalCode" = CASE
    WHEN length(regexp_replace("postalCode", '[^0-9]', '', 'g')) = 7
        THEN regexp_replace("postalCode", '[^0-9]', '', 'g')
    ELSE ''
END
WHERE "postalCode" IS NOT NULL AND "postalCode" <> '';
