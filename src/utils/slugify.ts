import slugifyLib from 'slugify';

export function createSlug(text: string): string {
  return slugifyLib(text, { lower: true, strict: true, trim: true });
}

/**
 * Appends -2, -3 ... until the slug is unique.
 * `exists` is supplied by the caller so this stays free of database imports.
 */
export async function createUniqueSlug(
  text: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = createSlug(text);
  let slug = base;
  let counter = 2;
  while (await exists(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}
