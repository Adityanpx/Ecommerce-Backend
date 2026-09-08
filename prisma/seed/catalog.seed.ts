import { AttributeType, PrismaClient } from '@prisma/client';

interface AttributeSeed {
  name: string;
  code: string;
  type: AttributeType;
  options?: string[];
  unit?: string;
  isRequired?: boolean;
  isFilterable?: boolean;
}

interface SubCategorySeed {
  name: string;
  slug: string;
  gstRate?: number;
  attributes: AttributeSeed[];
}

interface SportSeed {
  name: string;
  slug: string;
  description: string;
  subCategories: SubCategorySeed[];
}

const SPORTS: SportSeed[] = [
  {
    name: 'Snowboarding',
    slug: 'snowboarding',
    description: 'Boards, boots, bindings and outerwear for every rider level.',
    subCategories: [
      {
        name: 'Snowboards',
        slug: 'snowboards',
        gstRate: 18,
        attributes: [
          {
            name: 'Board Length',
            code: 'board_length',
            type: 'NUMBER',
            unit: 'cm',
            isRequired: true,
            isFilterable: true,
          },
          {
            name: 'Flex Rating',
            code: 'flex_rating',
            type: 'DROPDOWN',
            options: ['Soft', 'Medium', 'Stiff'],
            isRequired: true,
            isFilterable: true,
          },
          {
            name: 'Camber Type',
            code: 'camber_type',
            type: 'DROPDOWN',
            options: ['Camber', 'Rocker', 'Flat', 'Hybrid'],
            isFilterable: true,
          },
          {
            name: 'Rider Level',
            code: 'rider_level',
            type: 'MULTI_SELECT',
            options: ['Beginner', 'Intermediate', 'Advanced', 'Pro'],
            isFilterable: true,
          },
          { name: 'Core Material', code: 'core_material', type: 'TEXT' },
        ],
      },
      {
        name: 'Snowboard Boots',
        slug: 'snowboard-boots',
        gstRate: 18,
        attributes: [
          {
            name: 'Flex Index',
            code: 'flex_index',
            type: 'NUMBER',
            isRequired: true,
            isFilterable: true,
          },
          {
            name: 'Lacing System',
            code: 'lacing_system',
            type: 'DROPDOWN',
            options: ['Traditional', 'Speed Lace', 'BOA'],
            isFilterable: true,
          },
          { name: 'Heat Mouldable', code: 'heat_mouldable', type: 'BOOLEAN', isFilterable: true },
        ],
      },
    ],
  },
  {
    name: 'Cricket',
    slug: 'cricket',
    description: 'Bats, protective gear and clothing for club and professional play.',
    subCategories: [
      {
        name: 'Cricket Bats',
        slug: 'cricket-bats',
        gstRate: 12,
        attributes: [
          {
            name: 'Willow Type',
            code: 'willow_type',
            type: 'DROPDOWN',
            options: ['English Willow', 'Kashmir Willow', 'Composite'],
            isRequired: true,
            isFilterable: true,
          },
          {
            name: 'Bat Weight',
            code: 'bat_weight',
            type: 'NUMBER',
            unit: 'gm',
            isRequired: true,
            isFilterable: true,
          },
          {
            name: 'Handle Type',
            code: 'handle_type',
            type: 'DROPDOWN',
            options: ['Round', 'Oval', 'Semi-Oval'],
            isFilterable: true,
          },
          { name: 'Grains', code: 'grains', type: 'NUMBER', isFilterable: true },
        ],
      },
      {
        name: 'Batting Gloves',
        slug: 'batting-gloves',
        gstRate: 12,
        attributes: [
          {
            name: 'Padding Type',
            code: 'padding_type',
            type: 'DROPDOWN',
            options: ['Cotton', 'Foam', 'Gel'],
            isFilterable: true,
          },
          {
            name: 'Hand',
            code: 'hand',
            type: 'DROPDOWN',
            options: ['Right', 'Left'],
            isFilterable: true,
          },
        ],
      },
    ],
  },
  {
    name: 'Running',
    slug: 'running',
    description: 'Shoes, apparel and accessories for road and trail.',
    subCategories: [
      {
        name: 'Running Shoes',
        slug: 'running-shoes',
        gstRate: 12,
        attributes: [
          {
            name: 'Surface',
            code: 'surface',
            type: 'DROPDOWN',
            options: ['Road', 'Trail', 'Track'],
            isRequired: true,
            isFilterable: true,
          },
          { name: 'Drop', code: 'drop', type: 'NUMBER', unit: 'mm', isFilterable: true },
          {
            name: 'Cushioning',
            code: 'cushioning',
            type: 'DROPDOWN',
            options: ['Minimal', 'Balanced', 'Max'],
            isFilterable: true,
          },
        ],
      },
    ],
  },
];

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  for (const [sportIndex, sportSeed] of SPORTS.entries()) {
    const sport = await prisma.sport.upsert({
      where: { slug: sportSeed.slug },
      update: {},
      create: {
        name: sportSeed.name,
        slug: sportSeed.slug,
        description: sportSeed.description,
        displayOrder: sportIndex,
        metaTitle: `${sportSeed.name} Gear & Equipment`,
        metaDescription: sportSeed.description,
      },
    });

    for (const [subIndex, subSeed] of sportSeed.subCategories.entries()) {
      const subCategory = await prisma.subCategory.upsert({
        where: { sportId_slug: { sportId: sport.id, slug: subSeed.slug } },
        update: {},
        create: {
          sportId: sport.id,
          name: subSeed.name,
          slug: subSeed.slug,
          gstRate: subSeed.gstRate ?? null,
          displayOrder: subIndex,
        },
      });

      for (const [attrIndex, attrSeed] of subSeed.attributes.entries()) {
        await prisma.categoryAttribute.upsert({
          where: {
            subCategoryId_code: { subCategoryId: subCategory.id, code: attrSeed.code },
          },
          update: {},
          create: {
            subCategoryId: subCategory.id,
            name: attrSeed.name,
            code: attrSeed.code,
            type: attrSeed.type,
            options: attrSeed.options ?? undefined,
            unit: attrSeed.unit ?? null,
            isRequired: attrSeed.isRequired ?? false,
            isFilterable: attrSeed.isFilterable ?? false,
            displayOrder: attrIndex,
          },
        });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`  Seeded ${SPORTS.length} sports with sub-categories and attributes`);
}
