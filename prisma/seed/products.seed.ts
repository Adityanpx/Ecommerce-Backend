import { Prisma, PrismaClient } from '@prisma/client';

interface ProductSeed {
  subCategorySlug: string;
  name: string;
  slug: string;
  brand: string;
  shortDescription: string;
  mrp: number;
  sellingPrice: number;
  skuPrefix: string;
  hsnCode: string;
  isOversized?: boolean;
  weightGrams?: number;
  /** Keyed by attribute code. */
  attributes: Record<string, string | number | boolean | string[]>;
  variants: { size: string; color?: string; stock: number }[];
}

const PRODUCTS: ProductSeed[] = [
  {
    subCategorySlug: 'snowboards',
    name: 'Alpine Freeride 158 All-Mountain Snowboard',
    slug: 'alpine-freeride-158-all-mountain-snowboard',
    brand: 'Alpine',
    shortDescription: 'Hybrid camber all-mountain board built for mixed terrain.',
    mrp: 42000,
    sellingPrice: 35999,
    skuPrefix: 'SNB-ALP-FR',
    hsnCode: '95065100',
    isOversized: true,
    weightGrams: 3200,
    attributes: {
      board_length: 158,
      flex_rating: 'Medium',
      camber_type: 'Hybrid',
      rider_level: ['Intermediate', 'Advanced'],
      core_material: 'Poplar and bamboo laminate',
    },
    variants: [
      { size: '154cm', color: 'Black', stock: 6 },
      { size: '158cm', color: 'Black', stock: 9 },
      { size: '162cm', color: 'Black', stock: 4 },
    ],
  },
  {
    subCategorySlug: 'snowboards',
    name: 'Powder Rocker 152 Beginner Snowboard',
    slug: 'powder-rocker-152-beginner-snowboard',
    brand: 'Northline',
    shortDescription: 'Forgiving rocker profile ideal for a first board.',
    mrp: 26000,
    sellingPrice: 21500,
    skuPrefix: 'SNB-NL-PR',
    hsnCode: '95065100',
    isOversized: true,
    weightGrams: 2900,
    attributes: {
      board_length: 152,
      flex_rating: 'Soft',
      camber_type: 'Rocker',
      rider_level: ['Beginner'],
      core_material: 'Poplar',
    },
    variants: [
      { size: '148cm', color: 'Blue', stock: 12 },
      { size: '152cm', color: 'Blue', stock: 15 },
    ],
  },
  {
    subCategorySlug: 'snowboard-boots',
    name: 'Summit BOA Snowboard Boots',
    slug: 'summit-boa-snowboard-boots',
    brand: 'Summit',
    shortDescription: 'Dual BOA closure with heat-mouldable liner.',
    mrp: 19000,
    sellingPrice: 16499,
    skuPrefix: 'SBB-SUM-BOA',
    hsnCode: '64041900',
    weightGrams: 1800,
    attributes: { flex_index: 6, lacing_system: 'BOA', heat_mouldable: true },
    variants: [
      { size: 'UK 8', color: 'Black', stock: 7 },
      { size: 'UK 9', color: 'Black', stock: 11 },
      { size: 'UK 10', color: 'Black', stock: 3 },
    ],
  },
  {
    subCategorySlug: 'cricket-bats',
    name: 'Grade 1 English Willow Players Bat',
    slug: 'grade-1-english-willow-players-bat',
    brand: 'Crestline',
    shortDescription: 'Hand-selected Grade 1 cleft with a mid-to-low sweet spot.',
    mrp: 34000,
    sellingPrice: 28999,
    skuPrefix: 'CRB-CL-G1',
    hsnCode: '95069900',
    isOversized: true,
    weightGrams: 1180,
    attributes: {
      willow_type: 'English Willow',
      bat_weight: 1180,
      handle_type: 'Oval',
      grains: 8,
    },
    variants: [
      { size: 'SH', stock: 5 },
      { size: 'Harrow', stock: 3 },
    ],
  },
  {
    subCategorySlug: 'cricket-bats',
    name: 'Kashmir Willow Club Bat',
    slug: 'kashmir-willow-club-bat',
    brand: 'Crestline',
    shortDescription: 'Durable club-level bat for practice and league matches.',
    mrp: 7500,
    sellingPrice: 5499,
    skuPrefix: 'CRB-CL-KW',
    hsnCode: '95069900',
    isOversized: true,
    weightGrams: 1220,
    attributes: {
      willow_type: 'Kashmir Willow',
      bat_weight: 1220,
      handle_type: 'Round',
      grains: 5,
    },
    variants: [
      { size: 'SH', stock: 20 },
      { size: 'Size 6', stock: 14 },
    ],
  },
  {
    subCategorySlug: 'running-shoes',
    name: 'Tempo Road Running Shoe',
    slug: 'tempo-road-running-shoe',
    brand: 'Stride',
    shortDescription: 'Balanced cushioning for daily road mileage.',
    mrp: 12000,
    sellingPrice: 8999,
    skuPrefix: 'RUN-STR-TMP',
    hsnCode: '64041100',
    weightGrams: 620,
    attributes: { surface: 'Road', drop: 8, cushioning: 'Balanced' },
    variants: [
      { size: 'UK 7', color: 'Grey', stock: 10 },
      { size: 'UK 8', color: 'Grey', stock: 16 },
      { size: 'UK 9', color: 'Grey', stock: 12 },
      { size: 'UK 9', color: 'Navy', stock: 6 },
    ],
  },
];

function buildSku(prefix: string, size: string, color?: string): string {
  return [prefix, size, color]
    .filter(Boolean)
    .map((p) => (p as string).toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .join('-');
}

export async function seedProducts(prisma: PrismaClient): Promise<void> {
  let created = 0;

  for (const seed of PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: seed.slug } });
    if (existing) continue;

    const subCategory = await prisma.subCategory.findFirst({
      where: { slug: seed.subCategorySlug },
      include: { attributes: true },
    });

    if (!subCategory) {
      // eslint-disable-next-line no-console
      console.warn(`  Skipped ${seed.name} — category ${seed.subCategorySlug} not found`);
      continue;
    }

    const byCode = new Map(subCategory.attributes.map((a) => [a.code, a]));

    const attributeValues = Object.entries(seed.attributes)
      .map(([code, value]) => {
        const attribute = byCode.get(code);
        if (!attribute) return null;

        const base = { attributeId: attribute.id };

        switch (attribute.type) {
          case 'NUMBER':
            return { ...base, valueNumber: new Prisma.Decimal(Number(value)) };
          case 'BOOLEAN':
            return { ...base, valueBoolean: Boolean(value) };
          case 'MULTI_SELECT':
            return { ...base, valueJson: value as unknown as Prisma.InputJsonValue };
          default:
            return { ...base, valueText: String(value) };
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    const product = await prisma.product.create({
      data: {
        subCategoryId: subCategory.id,
        name: seed.name,
        slug: seed.slug,
        brand: seed.brand,
        shortDescription: seed.shortDescription,
        description: `<p>${seed.shortDescription}</p>`,
        mrp: new Prisma.Decimal(seed.mrp),
        sellingPrice: new Prisma.Decimal(seed.sellingPrice),
        skuPrefix: seed.skuPrefix,
        hsnCode: seed.hsnCode,
        weightGrams: seed.weightGrams ?? null,
        isOversized: seed.isOversized ?? false,
        countryOfOrigin: 'India',
        status: 'ACTIVE',
        metaTitle: seed.name,
        metaDescription: seed.shortDescription,
        attributeValues: { create: attributeValues },
      },
    });

    // One ProductColor per distinct colour; the first becomes the default.
    const colorIds = new Map<string, string>();
    const colorNames = [...new Set(seed.variants.map((v) => v.color).filter(Boolean))] as string[];
    for (const [index, name] of colorNames.entries()) {
      const color = await prisma.productColor.create({
        data: { productId: product.id, name, isDefault: index === 0, displayOrder: index },
      });
      colorIds.set(name, color.id);
    }

    for (const v of seed.variants) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          colorId: v.color ? (colorIds.get(v.color) ?? null) : null,
          sku: buildSku(seed.skuPrefix, v.size, v.color),
          size: v.size,
          color: v.color ?? null,
          stock: v.stock,
        },
      });
      if (v.stock > 0) {
        await prisma.stockMovement.create({
          data: {
            variantId: variant.id,
            reason: 'INITIAL_STOCK',
            quantityDelta: v.stock,
            stockBefore: 0,
            stockAfter: v.stock,
            note: 'Seed',
          },
        });
      }
    }

    created += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`  Seeded ${created} products`);
}
