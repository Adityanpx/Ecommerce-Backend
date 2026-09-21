-- Link existing products to their Brand record when the free-text brand matches a brand name.
-- Products were saved with only the brand name text, so brands showed 0 products and could not
-- be protected from deletion. Only unambiguous matches are linked (exactly one brand with that
-- name, ignoring case); the stored text is normalised to the brand's own spelling.
UPDATE "products" AS p
SET "brand_id" = b."id",
    "brand" = b."name"
FROM "brands" AS b
WHERE p."brand_id" IS NULL
  AND p."brand" IS NOT NULL
  AND lower(btrim(p."brand")) = lower(b."name")
  AND (SELECT count(*) FROM "brands" AS b2 WHERE lower(b2."name") = lower(b."name")) = 1;
