import { ApiError } from '../utils/ApiError';

/** The two lookups the rule needs. Injected so the rule is testable without a database. */
export interface BrandLookup {
  findById(id: string): Promise<{ id: string; name: string } | null>;
  findByName(name: string): Promise<{ id: string; name: string } | null>;
}

export interface BrandChoice {
  brandId: string | null;
  brand: string | null;
}

/**
 * Works out which Brand a product belongs to and the text to store in Product.brand.
 *
 * - `brandId` given: link that brand and copy its name.
 * - `brandId: null`: no brand record (keeps `brand` text if the caller sent one).
 * - only `brand` text given: link the Brand whose name matches (case-insensitive) so products
 *   created by older clients still show up under their brand; otherwise keep it as plain text.
 * - neither given: undefined — leave the product's brand untouched.
 */
export async function resolveBrandChoice(
  input: { brandId?: string | null; brand?: string | null },
  lookup: BrandLookup,
): Promise<BrandChoice | undefined> {
  if (input.brandId !== undefined) {
    if (input.brandId === null) return { brandId: null, brand: input.brand?.trim() || null };

    const brand = await lookup.findById(input.brandId);
    if (!brand) {
      throw ApiError.validation('Brand does not exist', [
        { field: 'brandId', message: 'Choose an existing brand' },
      ]);
    }
    return { brandId: brand.id, brand: brand.name };
  }

  if (input.brand !== undefined) {
    const name = input.brand?.trim() || null;
    if (!name) return { brandId: null, brand: null };

    const match = await lookup.findByName(name);
    return match ? { brandId: match.id, brand: match.name } : { brandId: null, brand: name };
  }

  return undefined;
}
