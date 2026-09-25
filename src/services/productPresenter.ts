import { Prisma } from '@prisma/client';
import type {
  AdminListProduct,
  AdminProductDetail,
  RelatedCard,
  StorefrontListProduct,
  StorefrontProductDetail,
} from '../repositories/product.repository';
import {
  discountPercent,
  effectiveCostPrice,
  effectiveMrp,
  effectiveSellingPrice,
  marginPercent,
} from '../utils/productPricing';
import { productQuality } from './productQuality';
import { resolveForProduct } from '../config/sizeCharts/resolver';
import { toDTO } from '../config/sizeCharts/types';

/**
 * Turns repository rows into API responses. Pure functions, no database access.
 * Every response keeps the fields the old clients used (images, variants,
 * sellingPrice…) and ADDS the colour-aware fields, so nothing breaks before the
 * frontends are updated.
 */

const STOREFRONT_VISIBLE = new Set(['ACTIVE', 'OUT_OF_STOCK']);

function priceRangeOf(
  product: { sellingPrice: Prisma.Decimal },
  colors: { id: string; sellingPrice: Prisma.Decimal | null }[],
  variants: { priceOverride: Prisma.Decimal | null; colorId: string | null }[],
): { min: number; max: number } {
  const colorById = new Map(colors.map((c) => [c.id, c]));
  const prices = variants.map((v) =>
    effectiveSellingPrice(v, v.colorId ? colorById.get(v.colorId) : null, product),
  );
  if (prices.length === 0) {
    const base = Number(product.sellingPrice);
    return { min: base, max: base };
  }
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function relatedCard(p: RelatedCard) {
  const mrp = Number(p.mrp);
  const sellingPrice = Number(p.sellingPrice);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    mrp,
    sellingPrice,
    discountPercent: discountPercent(mrp, sellingPrice),
    image: p.images[0] ?? null,
    inStock: p.variants.some((v) => v.stock > 0),
    subCategorySlug: p.subCategory.slug,
    sportSlug: p.subCategory.sport.slug,
  };
}

function splitRelations(
  relations: { type: 'RELATED' | 'BOUGHT_TOGETHER'; relatedProduct: RelatedCard }[],
  onlyVisible: boolean,
) {
  const visible = relations.filter(
    (r) =>
      !onlyVisible ||
      (r.relatedProduct.deletedAt === null && STOREFRONT_VISIBLE.has(r.relatedProduct.status)),
  );
  return {
    related: visible.filter((r) => r.type === 'RELATED').map((r) => relatedCard(r.relatedProduct)),
    boughtTogether: visible
      .filter((r) => r.type === 'BOUGHT_TOGETHER')
      .map((r) => relatedCard(r.relatedProduct)),
  };
}

function resolveSizeChart(product: {
  name: string;
  sizeChartKey: string | null;
  subCategory: { name: string; sport: { name: string } };
}) {
  const { chart } = resolveForProduct({
    name: product.name,
    subCategoryName: product.subCategory.name,
    sportName: product.subCategory.sport.name,
    sizeChartKey: product.sizeChartKey,
  });
  return chart ? toDTO(chart) : null;
}

export const productPresenter = {
  /** Listing / search / category card. */
  storefrontCard(p: StorefrontListProduct) {
    const mrp = Number(p.mrp);
    const sellingPrice = Number(p.sellingPrice);
    return {
      ...p,
      discountPercent: discountPercent(mrp, sellingPrice),
      priceRange: priceRangeOf(p, p.colors, p.variants),
      defaultColorId: p.colors.find((c) => c.isDefault)?.id ?? p.colors[0]?.id ?? null,
      /** Small swatches under the card; `image` lets the card swap photo on hover. */
      colors: p.colors.map((c) => ({
        id: c.id,
        name: c.name,
        hex: c.hex,
        secondaryHex: c.secondaryHex,
        isDefault: c.isDefault,
        image: c.images[0] ?? null,
      })),
      inStock: p.variants.some((v) => v.stock > 0),
    };
  },

  /** Product page. Only active colours and sizes are included (see detailInclude). */
  storefrontDetail(p: StorefrontProductDetail) {
    const activeColorIds = new Set(p.colors.map((c) => c.id));
    const variants = p.variants.filter((v) => v.colorId === null || activeColorIds.has(v.colorId));
    const colorById = new Map(p.colors.map((c) => [c.id, c]));

    const pricedVariants = variants.map((v) => {
      const color = v.colorId ? colorById.get(v.colorId) : null;
      const price = effectiveSellingPrice(v, color, p);
      const mrp = effectiveMrp(color, p);
      return {
        ...v,
        price,
        mrp,
        discountPercent: discountPercent(mrp, price),
        inStock: v.stock > 0,
        isLowStock: v.stock > 0 && v.stock <= v.lowStockThreshold,
      };
    });

    const sharedImages = p.images.filter((img) => img.colorId === null);
    const colors = p.colors.map((c) => {
      const mrp = effectiveMrp(c, p);
      const sellingPrice = effectiveSellingPrice({ priceOverride: null }, c, p);
      const sizes = pricedVariants
        .filter((v) => v.colorId === c.id)
        .map((v) => ({
          variantId: v.id,
          size: v.size,
          sku: v.sku,
          price: v.price,
          mrp: v.mrp,
          stock: v.stock,
          inStock: v.inStock,
          isLowStock: v.isLowStock,
        }));
      return {
        id: c.id,
        name: c.name,
        hex: c.hex,
        secondaryHex: c.secondaryHex,
        isDefault: c.isDefault,
        mrp,
        sellingPrice,
        discountPercent: discountPercent(mrp, sellingPrice),
        /** Colour photos first, then the shared photos (shown under every colour). */
        images: [...c.images, ...sharedImages],
        inStock: sizes.some((s) => s.inStock),
        sizes,
      };
    });

    const { relationsFrom, ...rest } = p;
    const mrp = Number(p.mrp);
    const sellingPrice = Number(p.sellingPrice);

    return {
      ...rest,
      // Only photos of visible colours + shared ones (hidden colours' photos never leak).
      images: p.images.filter((img) => img.colorId === null || activeColorIds.has(img.colorId)),
      sharedImages,
      variants: pricedVariants,
      colors,
      defaultColorId: colors.find((c) => c.isDefault)?.id ?? colors[0]?.id ?? null,
      discountPercent: discountPercent(mrp, sellingPrice),
      priceRange: priceRangeOf(p, p.colors, variants),
      ...splitRelations(relationsFrom, true),
      sizeChart: resolveSizeChart(p),
    };
  },

  /** Admin products table row. */
  adminListRow(p: AdminListProduct) {
    const activeVariants = p.variants.filter((v) => v.isActive);
    const totalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);
    const lowStockCount = activeVariants.filter(
      (v) => v.stock > 0 && v.stock <= v.lowStockThreshold,
    ).length;
    const outOfStockCount = activeVariants.filter((v) => v.stock === 0).length;
    const mrp = Number(p.mrp);
    const sellingPrice = Number(p.sellingPrice);
    const cost = p.costPrice === null ? null : Number(p.costPrice);

    const quality = productQuality.evaluate({
      ...p,
      colors: p.colors.map((c) => ({ ...c, imageCount: c._count.images })),
    });

    return {
      ...p,
      /** Only the cover is sent back — the full list was loaded just for the checks. */
      images: p.images.slice(0, 1),
      totalStock,
      lowStockCount,
      outOfStockCount,
      stockStatus: totalStock === 0 ? 'OUT' : lowStockCount > 0 ? 'LOW' : 'IN',
      discountPercent: discountPercent(mrp, sellingPrice),
      marginPercent: marginPercent(sellingPrice, cost),
      priceRange: priceRangeOf(p, p.colors, activeVariants),
      completeness: quality,
    };
  },

  /** Admin edit screen: everything grouped the way the new form works. */
  adminDetail(p: AdminProductDetail) {
    const sizeChart = resolveSizeChart(p);

    const colors = p.colors.map((c) => {
      const mrp = effectiveMrp(c, p);
      const sellingPrice = effectiveSellingPrice({ priceOverride: null }, c, p);
      const cost = effectiveCostPrice(c, p);
      const colorVariants = p.variants.filter((v) => v.colorId === c.id);
      return {
        ...c,
        variants: colorVariants,
        totalStock: colorVariants.reduce((sum, v) => sum + (v.isActive ? v.stock : 0), 0),
        pricing: {
          mrp,
          sellingPrice,
          costPrice: cost,
          discountPercent: discountPercent(mrp, sellingPrice),
          marginPercent: marginPercent(sellingPrice, cost),
          /** true = this colour just follows the product price. */
          inheritsPrice: c.sellingPrice === null && c.mrp === null,
        },
      };
    });

    const activeVariants = p.variants.filter((v) => v.isActive);
    const mrp = Number(p.mrp);
    const sellingPrice = Number(p.sellingPrice);
    const cost = p.costPrice === null ? null : Number(p.costPrice);
    const { relationsFrom, ...rest } = p;

    return {
      ...rest,
      colors,
      sharedImages: p.images.filter((img) => img.colorId === null),
      /** Variants of a product that has no colours (one-colour / legacy products). */
      uncoloredVariants: p.variants.filter((v) => v.colorId === null),
      ...splitRelations(relationsFrom, false),
      pricing: {
        discountPercent: discountPercent(mrp, sellingPrice),
        marginPercent: marginPercent(sellingPrice, cost),
      },
      stockSummary: {
        totalStock: activeVariants.reduce((sum, v) => sum + v.stock, 0),
        lowStockVariants: activeVariants.filter(
          (v) => v.stock > 0 && v.stock <= v.lowStockThreshold,
        ).length,
        outOfStockVariants: activeVariants.filter((v) => v.stock === 0).length,
      },
      sizeChart,
      completeness: productQuality.evaluate({
        ...p,
        colors: p.colors.map((c) => ({ ...c, imageCount: c.images.length })),
        hasSizeChart: sizeChart !== null,
      }),
    };
  },
};
