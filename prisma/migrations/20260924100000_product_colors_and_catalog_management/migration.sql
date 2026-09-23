-- =====================================================================
-- Product colours, colour library, size presets, product relations,
-- admin drafts, extra product fields, order-item return snapshot.
-- Includes a data backfill that turns existing variant colour strings
-- into ProductColor rows. Safe to run on a live database: every change
-- is additive, nothing is dropped.
-- =====================================================================

-- AlterEnum
ALTER TYPE "StockMovementReason" ADD VALUE IF NOT EXISTS 'DAMAGED';
ALTER TYPE "StockMovementReason" ADD VALUE IF NOT EXISTS 'INITIAL_STOCK';

-- CreateEnum
CREATE TYPE "ProductRelationType" AS ENUM ('RELATED', 'BOUGHT_TOGETHER');

-- AlterTable: products
ALTER TABLE "products" ADD COLUMN     "size_system" VARCHAR(30),
ADD COLUMN     "video_url" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "search_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "max_order_quantity" INTEGER,
ADD COLUMN     "is_returnable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "return_window_days" INTEGER,
ADD COLUMN     "cod_available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "country_of_origin" VARCHAR(80),
ADD COLUMN     "manufacturer_details" TEXT,
ADD COLUMN     "packer_details" TEXT,
ADD COLUMN     "importer_details" TEXT,
ADD COLUMN     "net_quantity" VARCHAR(60),
ADD COLUMN     "warranty_info" VARCHAR(255);

-- AlterTable: product_variants
ALTER TABLE "product_variants" ADD COLUMN     "color_id" UUID,
ADD COLUMN     "barcode" VARCHAR(64);

-- AlterTable: product_images
ALTER TABLE "product_images" ADD COLUMN     "color_id" UUID,
ADD COLUMN     "width" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "size_bytes" INTEGER;

-- AlterTable: stock_movements
ALTER TABLE "stock_movements" ADD COLUMN     "admin_id" UUID;

-- AlterTable: order_items
ALTER TABLE "order_items" ADD COLUMN     "is_returnable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "return_window_days" INTEGER;

-- CreateTable
CREATE TABLE "product_colors" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "swatch_id" UUID,
    "name" VARCHAR(50) NOT NULL,
    "hex" VARCHAR(7),
    "secondary_hex" VARCHAR(7),
    "mrp" DECIMAL(10,2),
    "selling_price" DECIMAL(10,2),
    "cost_price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color_swatches" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "hex" VARCHAR(7) NOT NULL,
    "secondary_hex" VARCHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "color_swatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "size_presets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "size_system" VARCHAR(30),
    "sizes" TEXT[],
    "sub_category_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "size_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_relations" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "related_product_id" UUID NOT NULL,
    "type" "ProductRelationType" NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_drafts" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "product_id" UUID,
    "title" VARCHAR(255),
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_tags_idx" ON "products" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "products_search_keywords_idx" ON "products" USING GIN ("search_keywords");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");

-- CreateIndex
CREATE INDEX "product_variants_color_id_idx" ON "product_variants"("color_id");

-- CreateIndex
CREATE INDEX "product_images_color_id_display_order_idx" ON "product_images"("color_id", "display_order");

-- CreateIndex
CREATE INDEX "product_images_public_id_idx" ON "product_images"("public_id");

-- CreateIndex
CREATE INDEX "product_colors_product_id_display_order_idx" ON "product_colors"("product_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_colors_product_id_name_key" ON "product_colors"("product_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "color_swatches_name_key" ON "color_swatches"("name");

-- CreateIndex
CREATE INDEX "color_swatches_is_active_idx" ON "color_swatches"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "size_presets_name_key" ON "size_presets"("name");

-- CreateIndex
CREATE INDEX "size_presets_sub_category_id_idx" ON "size_presets"("sub_category_id");

-- CreateIndex
CREATE INDEX "product_relations_product_id_type_display_order_idx" ON "product_relations"("product_id", "type", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_relations_product_id_related_product_id_type_key" ON "product_relations"("product_id", "related_product_id", "type");

-- CreateIndex
CREATE INDEX "product_drafts_admin_id_updated_at_idx" ON "product_drafts"("admin_id", "updated_at");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "product_colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "product_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_swatch_id_fkey" FOREIGN KEY ("swatch_id") REFERENCES "color_swatches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "size_presets" ADD CONSTRAINT "size_presets_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_fkey" FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- DATA BACKFILL
-- =====================================================================

-- 1. One ProductColor per distinct (product, trimmed colour name) found on existing variants.
--    The colour whose variants were created first becomes the default.
INSERT INTO "product_colors" ("id", "product_id", "name", "hex", "is_default", "display_order", "created_at", "updated_at")
SELECT gen_random_uuid(), t."product_id", t."name", t."hex", (t."rn" = 1), (t."rn" - 1)::int, NOW(), NOW()
FROM (
    SELECT
        "product_id",
        TRIM("color") AS "name",
        MAX("color_hex") AS "hex",
        ROW_NUMBER() OVER (PARTITION BY "product_id" ORDER BY MIN("created_at"), TRIM("color")) AS "rn"
    FROM "product_variants"
    WHERE "color" IS NOT NULL AND TRIM("color") <> ''
    GROUP BY "product_id", TRIM("color")
) AS t;

-- 2. Link every coloured variant to its new colour row.
UPDATE "product_variants" AS v
SET "color_id" = c."id"
FROM "product_colors" AS c
WHERE c."product_id" = v."product_id"
  AND c."name" = TRIM(v."color");

-- 2b. Normalise the denormalised name (" Black " -> "Black") unless that would collide
--     with another variant of the same product + size (unique product_id, size, color).
UPDATE "product_variants" AS v
SET "color" = TRIM(v."color")
WHERE v."color" IS NOT NULL
  AND v."color" <> TRIM(v."color")
  AND NOT EXISTS (
      SELECT 1 FROM "product_variants" AS o
      WHERE o."product_id" = v."product_id"
        AND o."size" IS NOT DISTINCT FROM v."size"
        AND o."color" = TRIM(v."color")
        AND o."id" <> v."id"
  );

-- 3. A colour whose variants are all inactive starts inactive.
UPDATE "product_colors" AS c
SET "is_active" = false
WHERE NOT EXISTS (
    SELECT 1 FROM "product_variants" AS v WHERE v."color_id" = c."id" AND v."is_active" = true
);

-- 4. Starter colour library (idempotent).
INSERT INTO "color_swatches" ("id", "name", "hex", "secondary_hex", "created_at", "updated_at") VALUES
    (gen_random_uuid(), 'Black',        '#111215', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'White',        '#FFFFFF', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Chalk White',  '#F3F1EC', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Grey',         '#8A8F98', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Charcoal',     '#36393F', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Navy',         '#1B2A4A', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Royal Blue',   '#2250C8', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Sky Blue',     '#7FB8E6', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Red',          '#D62B2B', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Coral',        '#FF5A36', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Orange',       '#F28C28', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Yellow',       '#F5D033', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Volt',         '#D4F34A', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Green',        '#2E8B57', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Olive',        '#6B7045', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Maroon',       '#6D1A2A', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Pink',         '#F4A7B9', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Purple',       '#6A3FA0', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Beige',        '#E3D5B8', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Brown',        '#6F4E37', NULL,      NOW(), NOW()),
    (gen_random_uuid(), 'Black / White','#111215', '#FFFFFF', NOW(), NOW()),
    (gen_random_uuid(), 'Chalk White / Pure Grey', '#F3F1EC', '#B9BDC4', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- 5. Starter size presets (idempotent).
INSERT INTO "size_presets" ("id", "name", "size_system", "sizes", "display_order", "created_at", "updated_at") VALUES
    (gen_random_uuid(), 'Apparel XS–XXL',     'INT',    ARRAY['XS','S','M','L','XL','XXL'],                                  0, NOW(), NOW()),
    (gen_random_uuid(), 'Apparel S–XL',       'INT',    ARRAY['S','M','L','XL'],                                             1, NOW(), NOW()),
    (gen_random_uuid(), 'Shoes UK 6–11',      'UK',     ARRAY['UK 6','UK 7','UK 8','UK 9','UK 10','UK 11'],                  2, NOW(), NOW()),
    (gen_random_uuid(), 'Shoes EU 40–46',     'EU MEN', ARRAY['40','40.5','41','42','43','43.5','44','44.5','45','46'],      3, NOW(), NOW()),
    (gen_random_uuid(), 'Cricket bat sizes',  NULL,     ARRAY['Size 4','Size 5','Size 6','Harrow','SH','LH'],                4, NOW(), NOW()),
    (gen_random_uuid(), 'Kids apparel (age)', 'AGE',    ARRAY['4-5Y','6-7Y','8-9Y','10-11Y','12-13Y','14-15Y'],               5, NOW(), NOW()),
    (gen_random_uuid(), 'One size',           NULL,     ARRAY['One Size'],                                                  6, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
