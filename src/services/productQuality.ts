import { Prisma } from '@prisma/client';
import { UPLOAD } from '../config/constants';

/**
 * "Missing info" warnings for the admin (#17) and the image-quality checks (#16).
 *
 * Each issue has:
 *  - check(): evaluates one product already in memory (list row or edit screen)
 *  - where:   the same rule as a Prisma filter, so the product list can be filtered
 *             by it ("show me every product without photos"). Rules that cannot be
 *             expressed in SQL (size chart is resolved in code) have no `where`.
 */

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueCode =
  | 'NO_IMAGES'
  | 'COLOR_WITHOUT_IMAGES'
  | 'NO_STOCK'
  | 'NO_HSN'
  | 'NO_COUNTRY_OF_ORIGIN'
  | 'NO_MANUFACTURER'
  | 'NO_DESCRIPTION'
  | 'NO_SHORT_DESCRIPTION'
  | 'NO_BRAND'
  | 'NO_WEIGHT'
  | 'NO_SEO'
  | 'MISSING_ALT_TEXT'
  | 'LOW_RES_IMAGES'
  | 'NO_COST_PRICE'
  | 'NO_SIZE_CHART';

/** Normalised shape both the list row and the edit screen are converted into. */
export interface QualityInput {
  description: string | null;
  shortDescription: string | null;
  brandId: string | null;
  hsnCode: string | null;
  weightGrams: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  countryOfOrigin: string | null;
  manufacturerDetails: string | null;
  packerDetails: string | null;
  importerDetails: string | null;
  costPrice: Prisma.Decimal | number | null;
  images: {
    altText: string | null;
    width: number | null;
    height: number | null;
    colorId: string | null;
  }[];
  colors: { name: string; isActive: boolean; imageCount: number }[];
  variants: { isActive: boolean; stock: number; size?: string | null }[];
  /** Only known on the edit screen (resolved from the size-chart config). */
  hasSizeChart?: boolean;
}

export interface Issue {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
}

const blank = (v: string | null | undefined) => !v || v.trim() === '';
const lowRes = (img: { width: number | null; height: number | null }) =>
  img.width !== null &&
  img.height !== null &&
  Math.min(img.width, img.height) < UPLOAD.RECOMMENDED_IMAGE_EDGE_PX;

interface IssueDef {
  code: IssueCode;
  severity: IssueSeverity;
  label: string;
  check: (p: QualityInput) => string | null;
  where?: Prisma.ProductWhereInput;
}

const emptyText = (field: 'description' | 'shortDescription' | 'hsnCode' | 'countryOfOrigin') =>
  ({ OR: [{ [field]: null }, { [field]: '' }] }) as Prisma.ProductWhereInput;

export const ISSUE_DEFS: IssueDef[] = [
  {
    code: 'NO_IMAGES',
    severity: 'error',
    label: 'No photos',
    check: (p) => (p.images.length === 0 ? 'Add at least one photo' : null),
    where: { images: { none: {} } },
  },
  {
    code: 'COLOR_WITHOUT_IMAGES',
    severity: 'error',
    label: 'Colour without photos',
    check: (p) => {
      const missing = p.colors.filter((c) => c.isActive && c.imageCount === 0).map((c) => c.name);
      return missing.length > 0 ? `No photos for: ${missing.join(', ')}` : null;
    },
    where: { colors: { some: { isActive: true, images: { none: {} } } } },
  },
  {
    code: 'NO_STOCK',
    severity: 'warning',
    label: 'Out of stock',
    check: (p) =>
      p.variants.some((v) => v.isActive && v.stock > 0) ? null : 'Every size is out of stock',
    where: { variants: { none: { isActive: true, stock: { gt: 0 } } } },
  },
  {
    code: 'NO_HSN',
    severity: 'error',
    label: 'HSN code missing',
    check: (p) => (blank(p.hsnCode) ? 'HSN code is needed on GST invoices' : null),
    where: emptyText('hsnCode'),
  },
  {
    code: 'NO_COUNTRY_OF_ORIGIN',
    severity: 'error',
    label: 'Country of origin missing',
    check: (p) =>
      blank(p.countryOfOrigin) ? 'Country of origin must be shown on e-commerce listings' : null,
    where: emptyText('countryOfOrigin'),
  },
  {
    code: 'NO_MANUFACTURER',
    severity: 'error',
    label: 'Manufacturer details missing',
    check: (p) =>
      blank(p.manufacturerDetails) && blank(p.packerDetails) && blank(p.importerDetails)
        ? 'Add manufacturer, packer or importer name & address'
        : null,
    where: {
      AND: [
        { OR: [{ manufacturerDetails: null }, { manufacturerDetails: '' }] },
        { OR: [{ packerDetails: null }, { packerDetails: '' }] },
        { OR: [{ importerDetails: null }, { importerDetails: '' }] },
      ],
    },
  },
  {
    code: 'NO_DESCRIPTION',
    severity: 'warning',
    label: 'No description',
    check: (p) => (blank(p.description) ? 'Add a product description' : null),
    where: emptyText('description'),
  },
  {
    code: 'NO_SHORT_DESCRIPTION',
    severity: 'warning',
    label: 'No short description',
    check: (p) =>
      blank(p.shortDescription) ? 'Add a one-line summary for cards and search' : null,
    where: emptyText('shortDescription'),
  },
  {
    code: 'NO_BRAND',
    severity: 'warning',
    label: 'No brand',
    check: (p) => (p.brandId ? null : 'Link the product to a brand'),
    where: { brandId: null },
  },
  {
    code: 'NO_WEIGHT',
    severity: 'warning',
    label: 'Weight missing',
    check: (p) => (p.weightGrams ? null : 'Weight is needed to calculate shipping'),
    where: { OR: [{ weightGrams: null }, { weightGrams: 0 }] },
  },
  {
    code: 'NO_SEO',
    severity: 'warning',
    label: 'SEO incomplete',
    check: (p) =>
      blank(p.metaTitle) || blank(p.metaDescription) ? 'Add an SEO title and description' : null,
    where: {
      OR: [
        { metaTitle: null },
        { metaTitle: '' },
        { metaDescription: null },
        { metaDescription: '' },
      ],
    },
  },
  {
    code: 'MISSING_ALT_TEXT',
    severity: 'warning',
    label: 'Photos without alt text',
    check: (p) => {
      const count = p.images.filter((i) => blank(i.altText)).length;
      return count > 0 ? `${count} photo(s) have no alt text` : null;
    },
    where: { images: { some: { OR: [{ altText: null }, { altText: '' }] } } },
  },
  {
    code: 'LOW_RES_IMAGES',
    severity: 'warning',
    label: 'Low-resolution photos',
    check: (p) => {
      const count = p.images.filter(lowRes).length;
      return count > 0
        ? `${count} photo(s) are under ${UPLOAD.RECOMMENDED_IMAGE_EDGE_PX}px — zoom will look soft`
        : null;
    },
    where: {
      images: {
        some: {
          OR: [
            { width: { lt: UPLOAD.RECOMMENDED_IMAGE_EDGE_PX } },
            { height: { lt: UPLOAD.RECOMMENDED_IMAGE_EDGE_PX } },
          ],
        },
      },
    },
  },
  {
    code: 'NO_COST_PRICE',
    severity: 'info',
    label: 'No cost price',
    check: (p) => (p.costPrice === null ? 'Add cost price to see your margin' : null),
    where: { costPrice: null },
  },
  {
    code: 'NO_SIZE_CHART',
    severity: 'info',
    label: 'No size guide',
    check: (p) =>
      p.hasSizeChart === false && p.variants.some((v) => v.size)
        ? 'This product has sizes but no size guide'
        : null,
    // Resolved in code from name/category — not filterable in SQL.
  },
];

const WEIGHT: Record<IssueSeverity, number> = { error: 3, warning: 2, info: 1 };

export const productQuality = {
  evaluate(input: QualityInput): { score: number; issues: Issue[] } {
    const applicable = ISSUE_DEFS.filter(
      (d) => d.code !== 'NO_SIZE_CHART' || input.hasSizeChart !== undefined,
    );
    const issues: Issue[] = [];
    let failedWeight = 0;
    const totalWeight = applicable.reduce((sum, d) => sum + WEIGHT[d.severity], 0);

    for (const def of applicable) {
      const message = def.check(input);
      if (message) {
        issues.push({ code: def.code, severity: def.severity, message });
        failedWeight += WEIGHT[def.severity];
      }
    }

    return { score: Math.round(100 * (1 - failedWeight / totalWeight)), issues };
  },

  /** Filter for one issue code (`?issue=NO_IMAGES`). Unknown / non-filterable codes → null. */
  whereFor(code: string): Prisma.ProductWhereInput | null {
    return ISSUE_DEFS.find((d) => d.code === code)?.where ?? null;
  },

  /** `?hasIssues=true`: any error- or warning-level problem. */
  whereHasIssues(): Prisma.ProductWhereInput {
    return {
      OR: ISSUE_DEFS.filter((d) => d.where && d.severity !== 'info').map(
        (d) => d.where as Prisma.ProductWhereInput,
      ),
    };
  },

  /** For the admin filter dropdown. */
  catalog() {
    return ISSUE_DEFS.map((d) => ({
      code: d.code,
      label: d.label,
      severity: d.severity,
      filterable: Boolean(d.where),
    }));
  },
};
