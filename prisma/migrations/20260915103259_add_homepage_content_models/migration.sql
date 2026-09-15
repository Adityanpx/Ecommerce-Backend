-- CreateEnum
CREATE TYPE "BannerPosition" AS ENUM ('HERO', 'CAROUSEL', 'PROMO_MID');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('CURATED', 'TRENDING', 'BEST_SELLERS', 'NEW_ARRIVALS');

-- DropIndex
DROP INDEX "banners_is_active_display_order_idx";

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "cta_link" TEXT,
ADD COLUMN     "cta_text" VARCHAR(100),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "featured_product_id" UUID,
ADD COLUMN     "position" "BannerPosition" NOT NULL DEFAULT 'CAROUSEL',
ADD COLUMN     "secondary_cta_link" TEXT,
ADD COLUMN     "secondary_cta_text" VARCHAR(100),
ADD COLUMN     "subtitle" VARCHAR(255);

-- AlterTable
ALTER TABLE "sports" ADD COLUMN     "hero_badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hero_cta_link" TEXT,
ADD COLUMN     "hero_cta_text" VARCHAR(100),
ADD COLUMN     "hero_description" TEXT,
ADD COLUMN     "hero_secondary_cta_link" TEXT,
ADD COLUMN     "hero_secondary_cta_text" VARCHAR(100),
ADD COLUMN     "hero_subtitle" VARCHAR(255),
ADD COLUMN     "hero_title" VARCHAR(255),
ADD COLUMN     "highlights" JSONB;

-- CreateTable
CREATE TABLE "announcement_items" (
    "id" UUID NOT NULL,
    "text" VARCHAR(255) NOT NULL,
    "link_url" TEXT,
    "link_text" VARCHAR(100),
    "emoji" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "announcement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_badges" (
    "id" UUID NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "subtitle" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "trust_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" UUID NOT NULL,
    "author_name" VARCHAR(150) NOT NULL,
    "author_title" VARCHAR(150),
    "author_avatar" TEXT,
    "rating" DECIMAL(2,1) NOT NULL,
    "text" TEXT NOT NULL,
    "sport_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(170) NOT NULL,
    "type" "CollectionType" NOT NULL DEFAULT 'CURATED',
    "description" TEXT,
    "sport_id" UUID,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_products" (
    "id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "collection_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_spotlights" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255),
    "subtitle" VARCHAR(255),
    "description" TEXT,
    "product_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "featured_spotlights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_items_is_active_display_order_idx" ON "announcement_items"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "trust_badges_is_active_display_order_idx" ON "trust_badges"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "testimonials_is_active_display_order_idx" ON "testimonials"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "testimonials_sport_id_idx" ON "testimonials"("sport_id");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_is_active_display_order_idx" ON "collections"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "collections_sport_id_idx" ON "collections"("sport_id");

-- CreateIndex
CREATE INDEX "collections_slug_idx" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collection_products_collection_id_display_order_idx" ON "collection_products"("collection_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "collection_products_collection_id_product_id_key" ON "collection_products"("collection_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "featured_spotlights_key_key" ON "featured_spotlights"("key");

-- CreateIndex
CREATE INDEX "featured_spotlights_key_idx" ON "featured_spotlights"("key");

-- CreateIndex
CREATE INDEX "banners_position_is_active_display_order_idx" ON "banners"("position", "is_active", "display_order");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_featured_product_id_fkey" FOREIGN KEY ("featured_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_spotlights" ADD CONSTRAINT "featured_spotlights_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
