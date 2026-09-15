import { PrismaClient, BannerPosition, CollectionType } from '@prisma/client';

// ──────────────────────────────────────────────────────────────
// Images — all Unsplash, free to hotlink in development
// ──────────────────────────────────────────────────────────────

const IMG = {
  // Sport icons (square, small)
  runningIcon: 'https://images.unsplash.com/photo-1461896836934-bd45ba48c3e5?w=200&h=200&fit=crop',
  snowIcon: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&h=200&fit=crop',
  cricketIcon: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=200&h=200&fit=crop',
  surfingIcon: 'https://images.unsplash.com/photo-1502680390548-bdbac40d7154?w=200&h=200&fit=crop',
  tennisIcon: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=200&h=200&fit=crop',
  trailIcon: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=200&fit=crop',

  // Sport banners (wide, hero)
  runningBanner:
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1600&h=600&fit=crop',
  snowBanner: 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=1600&h=600&fit=crop',
  cricketBanner:
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1600&h=600&fit=crop',

  // Homepage hero
  heroBg: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1920&h=900&fit=crop',
  heroMobile: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=800&fit=crop',

  // Promo banner
  promoBg: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&h=700&fit=crop',

  // Subcategory images
  snowboards: 'https://images.unsplash.com/photo-1522056615691-da7b8106c665?w=600&h=600&fit=crop',
  snowboardBoots:
    'https://images.unsplash.com/photo-1580910528923-c21c3cce0753?w=600&h=600&fit=crop',
  cricketBats: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=600&h=600&fit=crop',
  battingGloves:
    'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=600&h=600&fit=crop',
  runningShoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',

  // Testimonial avatars
  avatar1:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  avatar2:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  avatar3:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',

  // Product images (for new products that don't have images yet)
  shoe1: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
  shoe2: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop',
  shoe3: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&h=800&fit=crop',
  bat1: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=800&h=800&fit=crop',
  bat2: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&h=800&fit=crop',
  board1: 'https://images.unsplash.com/photo-1522056615691-da7b8106c665?w=800&h=800&fit=crop',
  board2: 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=800&h=800&fit=crop',
  boots1: 'https://images.unsplash.com/photo-1580910528923-c21c3cce0753?w=800&h=800&fit=crop',
  gloves1: 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800&h=800&fit=crop',
};

export async function seedHomepage(prisma: PrismaClient): Promise<void> {
  // ────────────────────────────────────────
  // 1. Announcement bar items
  // ────────────────────────────────────────

  const announcements = [
    { text: 'Free Express Shipping on Orders Over ₹2,000', emoji: '🚚', displayOrder: 0 },
    { text: '30-Day Athlete Trial Guarantee on all footwear & gear', emoji: '🛡️', displayOrder: 1 },
    {
      text: 'Track Order',
      linkUrl: '/account/orders',
      linkText: 'Track Order',
      emoji: null,
      displayOrder: 2,
    },
    {
      text: 'Store Locator',
      linkUrl: '/stores',
      linkText: 'Store Locator',
      emoji: null,
      displayOrder: 3,
    },
    {
      text: '24/7 Athlete Support',
      linkUrl: '/contact',
      linkText: '24/7 Support',
      emoji: '💬',
      displayOrder: 4,
    },
  ];

  // AnnouncementItem.id is a real Postgres UUID column (not a slug), so it
  // can't be upserted on a human-readable key like 'ann-0'. Match on `text`
  // instead — stable enough for seed data — to keep this idempotent.
  for (const a of announcements) {
    const existing = await prisma.announcementItem.findFirst({ where: { text: a.text } });
    if (existing) {
      await prisma.announcementItem.update({
        where: { id: existing.id },
        data: { ...a, isActive: true },
      });
    } else {
      await prisma.announcementItem.create({ data: { ...a, isActive: true } });
    }
  }
  console.log(`  ✓ ${announcements.length} announcement items`);

  // ────────────────────────────────────────
  // 2. Trust badges
  // ────────────────────────────────────────

  const trustBadges = [
    {
      icon: 'truck',
      title: 'Free Express Ship',
      subtitle: 'Orders over ₹2,000 ship today',
      displayOrder: 0,
    },
    {
      icon: 'shield-check',
      title: '30-Day Pro Trial',
      subtitle: 'Run, surf, ride. Full refund guarantee',
      displayOrder: 1,
    },
    {
      icon: 'badge-check',
      title: '100% Authentic Gear',
      subtitle: 'Direct competition-batch verified',
      displayOrder: 2,
    },
    {
      icon: 'headset',
      title: 'ATHLX Concierge',
      subtitle: '24/7 fit & gear consultancy',
      displayOrder: 3,
    },
  ];

  // Same UUID-id constraint as above — match on `title` instead.
  for (const tb of trustBadges) {
    const existing = await prisma.trustBadge.findFirst({ where: { title: tb.title } });
    if (existing) {
      await prisma.trustBadge.update({
        where: { id: existing.id },
        data: { ...tb, isActive: true },
      });
    } else {
      await prisma.trustBadge.create({ data: { ...tb, isActive: true } });
    }
  }
  console.log(`  ✓ ${trustBadges.length} trust badges`);

  // ────────────────────────────────────────
  // 3. Banners — Hero + Promo Mid
  // ────────────────────────────────────────

  // Get first running shoe product for featured product in hero
  const featuredProduct = await prisma.product.findFirst({
    where: { slug: 'tempo-road-running-shoe' },
    select: { id: true },
  });

  // Banner.id is a real UUID column too, so it can't be upserted on a
  // literal like 'banner-hero-main'. Match on `publicId` instead (also
  // used here purely as a stable seed marker, not a real R2 key).
  const heroBannerData = {
    title: 'BUILT FOR CHAMPIONS.\nALL SPORTS. ONE STORE.',
    subtitle: 'ALL SPORTS, ALL GEAR / FOOTWEAR + HARDGOODS + APPAREL',
    description:
      'Discover peak athletic equipment engineered for world-record strides, custom drops, and championship rallies. Equipped with responsive propulsion cushioning and pro-caliber durability.',
    imageUrl: IMG.heroBg,
    mobileImageUrl: IMG.heroMobile,
    ctaText: 'Shop Best Sellers',
    ctaLink: '/products?sort=popularity',
    secondaryCtaText: 'View Marathon Flagship',
    secondaryCtaLink: '/running/running-shoes',
    position: BannerPosition.HERO,
    featuredProductId: featuredProduct?.id ?? null,
    isActive: true,
    displayOrder: 0,
  };
  const existingHeroBanner = await prisma.banner.findFirst({
    where: { publicId: 'seed-banner-hero-main' },
  });
  if (existingHeroBanner) {
    await prisma.banner.update({ where: { id: existingHeroBanner.id }, data: heroBannerData });
  } else {
    await prisma.banner.create({
      data: { ...heroBannerData, publicId: 'seed-banner-hero-main' },
    });
  }

  // Promo mid-page banner
  const promoBannerData = {
    title: 'BREAK YOUR PERSONAL RECORD.\nZERO COMPROMISE GEAR.',
    subtitle: 'OFFICIAL RACE CHAMPION / MARATHON EDITION',
    description:
      'Engineered with high-rebound PEBA foams, aerospace carbon plates, and breathable rise fabrics to sustain maximum cadence through every split.',
    imageUrl: IMG.promoBg,
    ctaText: 'Explore Race Gear',
    ctaLink: '/running/running-shoes',
    position: BannerPosition.PROMO_MID,
    isActive: true,
    displayOrder: 0,
  };
  const existingPromoBanner = await prisma.banner.findFirst({
    where: { publicId: 'seed-banner-promo-mid' },
  });
  if (existingPromoBanner) {
    await prisma.banner.update({ where: { id: existingPromoBanner.id }, data: promoBannerData });
  } else {
    await prisma.banner.create({
      data: { ...promoBannerData, publicId: 'seed-banner-promo-mid' },
    });
  }

  console.log('  ✓ 2 banners (hero + promo)');

  // ────────────────────────────────────────
  // 4. Update sports with hero fields + images
  // ────────────────────────────────────────

  await prisma.sport.update({
    where: { slug: 'running' },
    data: {
      iconUrl: IMG.runningIcon,
      bannerUrl: IMG.runningBanner,
      heroTitle: 'ENGINEERED FOR SPEED.\nBUILT FOR DISTANCE.',
      heroSubtitle: '2026 MARATHON SEASON',
      heroDescription:
        'Discover road and trail footwear engineered for world-record strides. Carbon-plated race shoes, daily trainers, and ultramarathon specialists — all with responsive propulsion cushioning.',
      heroCtaText: 'Shop Running Shoes',
      heroCtaLink: '/running/running-shoes',
      heroSecondaryCtaText: 'View Race Collection',
      heroSecondaryCtaLink: '/running',
      heroBadges: ['PRO MARATHON COLLECTION', 'CARBON PLATED'],
      highlights: [
        { label: 'Stack Height', value: '39.5mm', description: 'Maximum energy return foam' },
        { label: 'Weight', value: '185g', description: 'Race-day ultralight construction' },
        { label: 'Drop', value: '8mm', description: 'Optimal heel-to-toe transition' },
      ],
    },
  });

  await prisma.sport.update({
    where: { slug: 'cricket' },
    data: {
      iconUrl: IMG.cricketIcon,
      bannerUrl: IMG.cricketBanner,
      heroTitle: 'CRICKET IMPACT DYNAMICS // 2026 MATCH SEASON',
      heroSubtitle: 'PRO WILLOW EDITION',
      heroDescription:
        'Engineered from grade 1+ unbleached Sussex English Willow, aerospace impact-absorbing D30 padding, and ultra-traction Ti-pin bowling outsoles calibrated for multi-day Test defence and relentless T20 strike velocity.',
      heroCtaText: 'Order 1L Sussex Compliant Gauge',
      heroCtaLink: '/cricket/cricket-bats',
      heroSecondaryCtaText: 'Lab 16,020 Strobe Matching',
      heroSecondaryCtaLink: '/cricket',
      heroBadges: ['PRO WILLOW COLLECTION', 'MATCH SEASON 2026'],
      highlights: [
        { label: 'Sweet Spot', value: '2lb 8.5oz', description: 'Ultra-light balanced drive edge' },
        {
          label: 'Handle Profile',
          value: 'Mid-to-High',
          description: 'Extended reach lock & cut driver velocity',
        },
        {
          label: 'Handle Composition',
          value: '12-Piece Oval',
          description: 'Triple sabre spring vibration damper',
        },
      ],
    },
  });

  await prisma.sport.update({
    where: { slug: 'snowboarding' },
    data: {
      iconUrl: IMG.snowIcon,
      bannerUrl: IMG.snowBanner,
      heroTitle: 'ALPINE PRECISION.\nZERO DRAG.',
      heroSubtitle: '2026 BACKCOUNTRY SEASON',
      heroDescription:
        'From park to powder — directional camber freeride boards, responsive BOA boots, and carbon-reinforced bindings designed for riders who push every boundary.',
      heroCtaText: 'Shop Snowboards',
      heroCtaLink: '/snowboarding/snowboards',
      heroSecondaryCtaText: 'View Full Collection',
      heroSecondaryCtaLink: '/snowboarding',
      heroBadges: ['BACKCOUNTRY SERIES', 'FREERIDE TECH'],
      highlights: [
        { label: 'Core', value: 'Paulownia', description: 'Ultra-light wood core technology' },
        { label: 'Flex', value: '6/10', description: 'All-mountain versatility index' },
        { label: 'Profile', value: 'CamRock', description: 'Camber underfoot, rocker tip & tail' },
      ],
    },
  });

  console.log('  ✓ 3 sports updated with hero fields & images');

  // ────────────────────────────────────────
  // 5. Update subcategories with images
  // ────────────────────────────────────────

  const subCategoryImages: Record<string, string> = {
    snowboards: IMG.snowboards,
    'snowboard-boots': IMG.snowboardBoots,
    'cricket-bats': IMG.cricketBats,
    'batting-gloves': IMG.battingGloves,
    'running-shoes': IMG.runningShoes,
  };

  for (const [slug, imageUrl] of Object.entries(subCategoryImages)) {
    await prisma.subCategory.updateMany({
      where: { slug },
      data: { imageUrl },
    });
  }
  console.log(`  ✓ ${Object.keys(subCategoryImages).length} subcategories updated with images`);

  // ────────────────────────────────────────
  // 6. Add images to products that don't have any
  // ────────────────────────────────────────

  const productImages: Record<string, string[]> = {
    'tempo-road-running-shoe': [IMG.shoe1, IMG.shoe2, IMG.shoe3],
    'alpine-freeride-158-all-mountain-snowboard': [IMG.board1, IMG.board2],
    'powder-rocker-152-beginner-snowboard': [IMG.board2, IMG.board1],
    'summit-boa-snowboard-boots': [IMG.boots1],
    'grade-1-english-willow-players-bat': [IMG.bat1, IMG.bat2],
    'kashmir-willow-club-bat': [IMG.bat2, IMG.bat1],
  };

  for (const [slug, images] of Object.entries(productImages)) {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) continue;

    const existingCount = await prisma.productImage.count({ where: { productId: product.id } });
    if (existingCount > 0) continue; // don't overwrite admin-uploaded images

    for (const [i, url] of images.entries()) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url,
          publicId: `seed-${slug}-${i}`,
          altText: slug.replace(/-/g, ' '),
          displayOrder: i,
          isPrimary: i === 0,
        },
      });
    }
  }
  console.log('  ✓ Product images seeded (skipped products that already have images)');

  // ────────────────────────────────────────
  // 7. Testimonials
  // ────────────────────────────────────────

  const runningSport = await prisma.sport.findUnique({
    where: { slug: 'running' },
    select: { id: true },
  });
  const cricketSport = await prisma.sport.findUnique({
    where: { slug: 'cricket' },
    select: { id: true },
  });
  const snowSport = await prisma.sport.findUnique({
    where: { slug: 'snowboarding' },
    select: { id: true },
  });

  const testimonials = [
    {
      authorName: 'Malik Kearns',
      authorTitle: 'Sub-3:00 Marathon · Amateur',
      authorAvatar: IMG.avatar1,
      rating: 5.0,
      text: '"The AeroStride Carbon V2 gave me back over 2 min over a flat marathon attempt. The energy rebound of the forefoot is genuinely a new benchmark."',
      sportId: runningSport?.id ?? null,
      displayOrder: 0,
    },
    {
      authorName: 'Elena Romanova',
      authorTitle: 'Intermediate World Tour · Aspirant',
      authorAvatar: IMG.avatar2,
      rating: 4.5,
      text: '"Chopping onto high-speed wind at your usually chatters teeth. The board stiffness in the Apex deck paired up on ice chunks without sacrificing park."',
      sportId: snowSport?.id ?? null,
      displayOrder: 1,
    },
    {
      authorName: 'David MacIntyre',
      authorTitle: 'First-Class County Batsman · Amateur',
      authorAvatar: IMG.avatar3,
      rating: 5.0,
      text: '"The pickup weight on the Artisan 8Elite is mind-blowing. Feels like a feather yet punches to the rope with precision against seam movement every touring."',
      sportId: cricketSport?.id ?? null,
      displayOrder: 2,
    },
  ];

  // Testimonial.id is a real UUID column too — match on `authorName` instead.
  for (const t of testimonials) {
    const existing = await prisma.testimonial.findFirst({ where: { authorName: t.authorName } });
    if (existing) {
      await prisma.testimonial.update({
        where: { id: existing.id },
        data: { ...t, isActive: true },
      });
    } else {
      await prisma.testimonial.create({ data: { ...t, isActive: true } });
    }
  }
  console.log(`  ✓ ${testimonials.length} testimonials`);

  // ────────────────────────────────────────
  // 8. Collections — Trending & Best Sellers
  // ────────────────────────────────────────

  const collection = await prisma.collection.upsert({
    where: { slug: 'trending-and-best-sellers' },
    update: {
      name: 'Trending & Best Sellers',
      type: CollectionType.TRENDING,
      description:
        'The most popular gear across all sports — curated from competition data and athlete purchases.',
      isActive: true,
    },
    create: {
      name: 'Trending & Best Sellers',
      slug: 'trending-and-best-sellers',
      type: CollectionType.TRENDING,
      description:
        'The most popular gear across all sports — curated from competition data and athlete purchases.',
      isActive: true,
      displayOrder: 0,
    },
  });

  // Assign all existing products to this collection
  const allProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    select: { id: true },
    orderBy: { orderCount: 'desc' },
    take: 12,
  });

  // Clear existing assignments and re-assign
  await prisma.collectionProduct.deleteMany({ where: { collectionId: collection.id } });
  for (const [i, product] of allProducts.entries()) {
    await prisma.collectionProduct.create({
      data: {
        collectionId: collection.id,
        productId: product.id,
        displayOrder: i,
      },
    });
  }
  console.log(`  ✓ Collection "${collection.name}" with ${allProducts.length} products`);

  // ────────────────────────────────────────
  // 9. Featured Spotlights
  // ────────────────────────────────────────

  // Homepage spotlight — feature the first running shoe
  const spotlightProduct = await prisma.product.findFirst({
    where: { slug: 'tempo-road-running-shoe' },
    select: { id: true },
  });

  if (spotlightProduct) {
    await prisma.featuredSpotlight.upsert({
      where: { key: 'homepage' },
      update: {
        title: 'AEROSTRIDE CARBON V2 RACING SHOE',
        subtitle: 'OFFICIAL MARATHON FLAGSHIP · SPORTS SHOP',
        description:
          'Engineered for zero-gravity cadence. Features full-length carbon plate with super-critical foam for maximum energy return across all marathon distances.',
        productId: spotlightProduct.id,
        isActive: true,
      },
      create: {
        key: 'homepage',
        title: 'AEROSTRIDE CARBON V2 RACING SHOE',
        subtitle: 'OFFICIAL MARATHON FLAGSHIP · SPORTS SHOP',
        description:
          'Engineered for zero-gravity cadence. Features full-length carbon plate with super-critical foam for maximum energy return across all marathon distances.',
        productId: spotlightProduct.id,
        isActive: true,
      },
    });
    console.log('  ✓ Homepage featured spotlight');
  }

  // Cricket sport spotlight — feature the English Willow bat
  const cricketSpotlightProduct = await prisma.product.findFirst({
    where: { slug: 'grade-1-english-willow-players-bat' },
    select: { id: true },
  });

  if (cricketSpotlightProduct) {
    await prisma.featuredSpotlight.upsert({
      where: { key: 'sport:cricket' },
      update: {
        title: 'ARTISAN RESERVE ENGLISH WILLOW BAT (PLAYER EDITION)',
        subtitle: 'HIGHEST MATCH SPEC // 2026 EDITION',
        description:
          'Individually pressed and carved by master bat makers from unbleached Grade 1+ Sussex clefts. Each blade is hand-graded for acoustic ping frequency and minimal pickup weight index.',
        productId: cricketSpotlightProduct.id,
        isActive: true,
      },
      create: {
        key: 'sport:cricket',
        title: 'ARTISAN RESERVE ENGLISH WILLOW BAT (PLAYER EDITION)',
        subtitle: 'HIGHEST MATCH SPEC // 2026 EDITION',
        description:
          'Individually pressed and carved by master bat makers from unbleached Grade 1+ Sussex clefts. Each blade is hand-graded for acoustic ping frequency and minimal pickup weight index.',
        productId: cricketSpotlightProduct.id,
        isActive: true,
      },
    });
    console.log('  ✓ Cricket sport featured spotlight');
  }

  console.log('');
}
