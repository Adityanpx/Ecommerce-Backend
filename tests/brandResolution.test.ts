import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBrandChoice, type BrandLookup } from '../src/services/brandResolution';

const ADIDAS = { id: '11111111-1111-4111-8111-111111111111', name: 'Adidas' };

const lookup: BrandLookup = {
  findById: async (id) => (id === ADIDAS.id ? ADIDAS : null),
  findByName: async (name) => (name.toLowerCase() === 'adidas' ? ADIDAS : null),
};

describe('resolveBrandChoice', () => {
  it('links a brand by id and copies its canonical name', async () => {
    const r = await resolveBrandChoice({ brandId: ADIDAS.id, brand: 'whatever the client sent' }, lookup);
    assert.deepEqual(r, { brandId: ADIDAS.id, brand: 'Adidas' });
  });

  it('rejects a brand id that does not exist', async () => {
    await assert.rejects(
      resolveBrandChoice({ brandId: '22222222-2222-4222-8222-222222222222' }, lookup),
      /Brand does not exist/,
    );
  });

  it('brandId: null clears the link', async () => {
    assert.deepEqual(await resolveBrandChoice({ brandId: null, brand: null }, lookup), {
      brandId: null,
      brand: null,
    });
  });

  it('brandId: null keeps free text the caller sent', async () => {
    assert.deepEqual(await resolveBrandChoice({ brandId: null, brand: '  Sketchers ' }, lookup), {
      brandId: null,
      brand: 'Sketchers',
    });
  });

  it('links legacy free text to a matching brand, ignoring case and spaces', async () => {
    for (const text of ['Adidas', 'adidas', '  ADIDAS  ']) {
      assert.deepEqual(await resolveBrandChoice({ brand: text }, lookup), {
        brandId: ADIDAS.id,
        brand: 'Adidas',
      });
    }
  });

  it('keeps unmatched free text as plain text with no link', async () => {
    assert.deepEqual(await resolveBrandChoice({ brand: 'Nivia' }, lookup), {
      brandId: null,
      brand: 'Nivia',
    });
  });

  it('blank free text means no brand', async () => {
    assert.deepEqual(await resolveBrandChoice({ brand: '   ' }, lookup), { brandId: null, brand: null });
    assert.deepEqual(await resolveBrandChoice({ brand: null }, lookup), { brandId: null, brand: null });
  });

  it('leaves the brand untouched when the request does not mention it', async () => {
    assert.equal(await resolveBrandChoice({}, lookup), undefined);
  });
});
