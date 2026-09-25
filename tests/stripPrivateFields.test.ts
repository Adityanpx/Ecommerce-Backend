import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { stripPrivate } from '../src/middlewares/stripPrivateFields';
import { ApiResponse } from '../src/utils/ApiResponse';

test('removes costPrice at any depth inside the ApiResponse envelope', () => {
  const body = ApiResponse.ok({
    product: {
      name: 'Bat',
      costPrice: new Prisma.Decimal(100),
      sellingPrice: new Prisma.Decimal(250),
      colors: [{ name: 'Black', costPrice: new Prisma.Decimal(90) }],
    },
  });

  const json = JSON.parse(JSON.stringify(stripPrivate(body)));

  assert.equal(json.success, true);
  assert.equal(json.data.product.costPrice, undefined);
  assert.equal(json.data.product.colors[0].costPrice, undefined);
  assert.equal(json.data.product.sellingPrice, '250');
  assert.equal(json.data.product.colors[0].name, 'Black');
});

test('leaves Dates and Decimals serialising exactly as before', () => {
  const date = new Date('2026-01-01T00:00:00.000Z');
  const out = stripPrivate({ at: date, price: new Prisma.Decimal('12.50') }) as Record<
    string,
    unknown
  >;
  assert.equal(out.at, date);
  assert.equal(JSON.stringify(out), '{"at":"2026-01-01T00:00:00.000Z","price":"12.5"}');
});
