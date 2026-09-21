import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SIZE_CHARTS, getChartDefinition, isValidChartKey } from '../src/config/sizeCharts';
import { resolveForProduct, resolveSizeChart } from '../src/config/sizeCharts/resolver';

type Case = [name: string, subCategory: string, sport: string, expectedKey: string | null];

const pick = (name: string, subCategory: string, sport: string) =>
  resolveSizeChart({ name, subCategoryName: subCategory, sportName: sport })?.chart.key ?? null;

describe('size chart library integrity', () => {
  it('ships at least 20 charts with unique keys', () => {
    assert.ok(SIZE_CHARTS.length >= 20, `only ${SIZE_CHARTS.length} charts`);
    const keys = SIZE_CHARTS.map((c) => c.key);
    assert.equal(new Set(keys).size, keys.length, 'duplicate chart key');
  });

  for (const chart of SIZE_CHARTS) {
    it(`${chart.key}: every row has one value per column and unique labels`, () => {
      assert.ok(chart.columns.length > 0, 'no columns');
      assert.ok(chart.rows.length > 0, 'no rows');
      assert.ok(chart.tips.length > 0, 'no measuring tips');
      for (const r of chart.rows) {
        assert.equal(
          r.values.length,
          chart.columns.length,
          `row "${r.label}" has ${r.values.length} values for ${chart.columns.length} columns`,
        );
      }
      const labels = chart.rows.map((r) => r.label);
      assert.equal(new Set(labels).size, labels.length, 'duplicate row label');
    });
  }
});

describe('automatic chart detection', () => {
  const cases: Case[] = [
    // ---- The real products currently in the catalogue ----
    ['Powder Rocker 152 Beginner Snowboard', 'Snowboards', 'Snowboarding', 'snowboard'],
    ['Alpine Freeride 158 All-Mountain Snowboard', 'Snowboards', 'Snowboarding', 'snowboard'],
    ['Summit BOA Snowboard Boots', 'Snowboard Boots', 'Snowboarding', 'snowboard-boots'],
    ['Kashmir Willow Club Bat', 'Cricket Bats', 'Cricket', 'cricket-bat'],
    ['Grade 1 English Willow Players Bat', 'Cricket Bats', 'Cricket', 'cricket-bat'],
    ['Tempo Road Running Shoe', 'Running Shoes', 'Running', 'footwear-adult'],
    ['Men Decathlon Running Shoes', 'Footwear', 'General', 'footwear-adult'],
    ['PYONAA Cross Training Duffel (Purple, Kit Bag)', 'Bags', 'General', 'bags'],
    ['Head CYBER ELITE-2024-190GMS Black Strung Squash Racquet', 'Racquet', 'squash', 'racquet-grip'],
    ['Squash ball', 'squash ball', 'squash', null],

    // ---- Footwear ----
    ['Kids Running Shoes', 'Running Shoes', 'Running', 'footwear-kids'],
    ['Junior Football Boots', 'Football Boots', 'Football', 'footwear-kids'],
    ['Football Boots', 'Boots', 'Football', 'footwear-adult'],
    ['Basketball Shoes', 'Shoes', 'Basketball', 'footwear-adult'],
    ['Ski Boots', 'Ski Boots', 'Skiing', 'snowboard-boots'],
    ['Shoe Bag', 'Bags', 'General', 'bags'],

    // ---- Apparel ----
    ["Men's Dri-FIT Running T-Shirt", 'T-Shirts', 'Running', 'apparel-tops'],
    ['Team India Cricket Jersey', 'Jerseys', 'Cricket', 'apparel-tops'],
    ['Zip Hoodie', 'Hoodies', 'General', 'apparel-tops'],
    ['Short Sleeve Polo', 'Polos', 'General', 'apparel-tops'],
    ["Women's Training Jersey", 'Jerseys', 'General', 'apparel-women'],
    ["Women's Cap Sleeve Tee", 'Tops', 'Yoga', 'apparel-women'],
    ["Men's Running Shorts", 'Shorts', 'Running', 'apparel-bottoms'],
    ['Track Pants', 'Lowers', 'General', 'apparel-bottoms'],
    ["Women's Leggings", 'Tights', 'Gym', 'apparel-bottoms'],
    ['Boys Football Shorts', 'Kids Clothing', 'Football', 'apparel-kids'],
    ['Kids Hoodie', 'Hoodies', 'General', 'apparel-kids'],
    ['Team Jersey', 'Jerseys', 'Swimming', 'apparel-tops'], // sport must not veto
    ['Ski Jacket', 'Jackets', 'Skiing', 'apparel-tops'],
    ["Men's Swim Trunks", 'Swimwear', 'Swimming', 'swimwear'],
    ['Neoprene Wetsuit 3/2', 'Wetsuits', 'Surfing', 'swimwear'],

    // ---- Cricket ----
    ['Batting Gloves RH', 'Batting Gloves', 'Cricket', 'cricket-gloves'],
    ['Wicket Keeping Gloves', 'Gloves', 'Cricket', 'cricket-gloves'],
    ['Cricket Batting Pads', 'Pads', 'Cricket', 'cricket-pads'],
    ['Leather Cricket Ball', 'Balls', 'Cricket', 'cricket-ball'],
    ['Cricket Kit Bag', 'Bags', 'Cricket', 'bags'],
    ['Cricket Bat Cover', 'Accessories', 'Cricket', null],
    ['Baseball Bat', 'Bats', 'Baseball', null],
    ['Cricket Helmet with Titanium Grille', 'Helmets', 'Cricket', 'helmets'],

    // ---- Protection & headwear ----
    ['Cycling Helmet', 'Helmets', 'Cycling', 'helmets'],
    ['Goalkeeper Gloves', 'Gloves', 'Football', 'gloves-general'],
    ['Winter Training Gloves', 'Gloves', 'Running', 'gloves-general'],
    ['Football Shin Guards', 'Shin Guards', 'Football', 'shin-guards'],
    ['Compression Socks', 'Socks', 'Running', 'socks'],
    ['Sports Cap', 'Caps', 'General', 'caps'],

    // ---- Snow ----
    ['All Mountain Skis', 'Skis', 'Skiing', 'skis'],
    ['Ski Goggles', 'Goggles', 'Skiing', null],
    ['Snowboard Bindings', 'Bindings', 'Snowboarding', null],

    // ---- Balls & equipment ----
    ['Size 5 Football', 'Footballs', 'Football', 'football'],
    ['Match Ball', 'Balls', 'Football', 'football'],
    ['Basketball', 'Balls', 'Basketball', 'basketball'],
    ['Field Hockey Stick', 'Hockey Sticks', 'Hockey', 'hockey-stick'],
    ['Tennis Racket', 'Rackets', 'Tennis', 'racquet-grip'],
    ['Racquet Bag', 'Bags', 'Squash', 'bags'],
    ['Mountain Bike 27.5', 'Bicycles', 'Cycling', 'bicycle'],
    ['Football Jersey', 'Jerseys', 'Football', 'apparel-tops'],

    // ---- Things that should have no chart ----
    ['Yoga Mat', 'Mats', 'Yoga', null],
    ['Swimming Goggles', 'Goggles', 'Swimming', null],
    ['Corner Flag', 'Accessories', 'Football', null], // sport alone is not enough
    ['Water Bottle', 'Accessories', 'General', null],
    ['Skipping Rope', 'Fitness', 'Gym', null],
  ];

  for (const [name, subCategory, sport, expected] of cases) {
    it(`"${name}" (${subCategory} / ${sport}) -> ${expected ?? 'no chart'}`, () => {
      assert.equal(pick(name, subCategory, sport), expected);
    });
  }
});

describe('per-product override', () => {
  const base = { name: 'Tempo Road Running Shoe', subCategoryName: 'Running Shoes', sportName: 'Running' };

  it('auto-detects when no key is set', () => {
    const r = resolveForProduct({ ...base, sizeChartKey: null });
    assert.equal(r.source, 'auto');
    assert.equal(r.chart?.key, 'footwear-adult');
    assert.match(r.reason, /Matched/);
  });

  it('honours a pinned chart', () => {
    const r = resolveForProduct({ ...base, sizeChartKey: 'apparel-tops' });
    assert.equal(r.source, 'override');
    assert.equal(r.chart?.key, 'apparel-tops');
  });

  it('"none" switches the guide off', () => {
    const r = resolveForProduct({ ...base, sizeChartKey: 'none' });
    assert.equal(r.source, 'disabled');
    assert.equal(r.chart, null);
  });

  it('falls back to auto when a stored key no longer exists', () => {
    const r = resolveForProduct({ ...base, sizeChartKey: 'removed-chart' });
    assert.equal(r.source, 'auto');
    assert.equal(r.chart?.key, 'footwear-adult');
  });

  it('reports "none" when nothing matches', () => {
    const r = resolveForProduct({ name: 'Water Bottle', subCategoryName: 'Accessories', sportName: 'General' });
    assert.equal(r.source, 'none');
    assert.equal(r.chart, null);
  });

  it('validates keys', () => {
    assert.ok(isValidChartKey('none'));
    assert.ok(isValidChartKey('cricket-bat'));
    assert.ok(!isValidChartKey('nope'));
    assert.ok(getChartDefinition('bags'));
  });
});
