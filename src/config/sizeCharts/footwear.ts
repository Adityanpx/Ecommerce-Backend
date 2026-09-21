import { col, row, GENERIC_NOTE, SizeChartDefinition, ChartRow } from './types';
import { FOOTWEAR, KIDS, NOISE } from './terms';

const roundHalf = (n: number) => Math.round(n * 2) / 2;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * One consistent formula keeps the columns from contradicting each other:
 *   foot length (cm) = UK + 19,  US men = UK + 1,  US women = UK + 2.5,
 *   EU = 1.5 x (foot length + 1.5), rounded to the nearest half size.
 * e.g. UK 8 -> 27 cm, US 9, US women 10.5, EU 42.5.
 */
function adultRows(fromUk: number, toUk: number): ChartRow[] {
  const rows: ChartRow[] = [];
  for (let uk = fromUk; uk <= toUk; uk += 0.5) {
    const footCm = uk + 19;
    rows.push(
      row(
        `UK ${fmt(uk)}`,
        `UK ${fmt(uk)}`,
        fmt(uk + 1),
        fmt(uk + 2.5),
        fmt(roundHalf(1.5 * (footCm + 1.5))),
        fmt(footCm),
      ),
    );
  }
  return rows;
}

const FOOT_TIPS = [
  'Stand on a sheet of paper against a wall and mark the tip of your longest toe.',
  'Measure from the wall to the mark in cm — that is your foot length.',
  'Measure in the evening, when feet are at their largest, and wear the socks you will play in.',
  'Between two sizes, go up a half size for sports use.',
];

export const footwearAdult: SizeChartDefinition = {
  key: 'footwear-adult',
  title: 'Footwear size guide',
  group: 'Footwear',
  description: 'Shoes, trainers, cleats and sandals — UK, US, EU and foot length.',
  columns: [
    col('UK'),
    col('US (Men)'),
    col('US (Women)'),
    col('EU'),
    col('Foot length (cm)', 'cm'),
  ],
  rows: adultRows(3, 13),
  tips: FOOT_TIPS,
  note: GENERIC_NOTE,
  match: {
    all: [FOOTWEAR],
    none: [...KIDS, ...NOISE, 'snowboard', 'ski', 'skate'],
  },
};

const KIDS_ROWS: [string, string, string, string, string][] = [
  // label, UK, US, EU, foot cm, (age appended below)
  ['Kids UK 4', 'UK 4', '4.5', '20', '12.3'],
  ['Kids UK 5', 'UK 5', '5.5', '21', '13.2'],
  ['Kids UK 6', 'UK 6', '6.5', '22.5', '14.0'],
  ['Kids UK 7', 'UK 7', '7.5', '23.5', '14.9'],
  ['Kids UK 8', 'UK 8', '8.5', '25', '15.7'],
  ['Kids UK 9', 'UK 9', '9.5', '26', '16.6'],
  ['Kids UK 10', 'UK 10', '10.5', '27', '17.4'],
  ['Kids UK 11', 'UK 11', '11.5', '28.5', '18.3'],
  ['Kids UK 12', 'UK 12', '12.5', '30', '19.1'],
  ['Kids UK 13', 'UK 13', '13.5', '31', '20.0'],
  ['Junior UK 1', 'UK 1', '1.5', '32.5', '20.8'],
  ['Junior UK 2', 'UK 2', '2.5', '33.5', '21.6'],
  ['Junior UK 3', 'UK 3', '3.5', '35', '22.4'],
  ['Junior UK 4', 'UK 4', '4.5', '36', '23.2'],
  ['Junior UK 5', 'UK 5', '5.5', '37.5', '24.0'],
];

const KIDS_AGES = [
  '12–18 months',
  '1.5–2 yrs',
  '2 yrs',
  '2–3 yrs',
  '3 yrs',
  '3–4 yrs',
  '4–5 yrs',
  '5–6 yrs',
  '6–7 yrs',
  '7–8 yrs',
  '8 yrs',
  '8–9 yrs',
  '9–10 yrs',
  '10–11 yrs',
  '11–12 yrs',
];

export const footwearKids: SizeChartDefinition = {
  key: 'footwear-kids',
  title: 'Kids footwear size guide',
  group: 'Footwear',
  description: 'Toddler, kids and junior shoe sizes with foot length and approximate age.',
  columns: [col('UK'), col('US'), col('EU'), col('Foot length (cm)', 'cm'), col('Approx. age')],
  rows: KIDS_ROWS.map(([label, uk, us, eu, cm], i) => row(label, uk, us, eu, cm, KIDS_AGES[i])),
  tips: [
    ...FOOT_TIPS.slice(0, 3),
    'Leave about 1 cm of growing room beyond the longest toe.',
    'Age is only a guide — always go by foot length.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [FOOTWEAR, KIDS],
    none: [...NOISE, 'snowboard', 'ski', 'skate'],
  },
};

export const snowboardBoots: SizeChartDefinition = {
  key: 'snowboard-boots',
  title: 'Snowboard & ski boot size guide',
  group: 'Snow & water',
  description: 'Boot sizes with Mondo point (foot length in cm), the measurement boot makers use.',
  columns: [
    col('UK'),
    col('US (Men)'),
    col('US (Women)'),
    col('EU'),
    col('Mondo / foot length (cm)', 'cm'),
  ],
  rows: adultRows(4, 13),
  tips: [
    'Mondo point is your foot length in cm — measure it as described and match it to the last column.',
    'Snow boots should feel snug with toes just touching the front; they pack out about half a size.',
    'If you are between sizes, choose the smaller size for a performance fit.',
    'Wear your usual ski or snowboard sock when trying boots.',
  ],
  note: GENERIC_NOTE,
  priority: 3,
  match: {
    all: [['snowboard', 'snowboarding', 'ski', 'skiing', 'snow'], ['boot']],
    none: [...NOISE],
  },
};
