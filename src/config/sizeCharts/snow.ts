import { col, row, GENERIC_NOTE, SizeChartDefinition, ChartRow } from './types';

/** Accessories and apparel that must not be mistaken for the board / skis themselves. */
const SNOW_ACCESSORIES = [
  'boot',
  'binding',
  'glove',
  'jacket',
  'pant',
  'helmet',
  'goggle',
  'bag',
  'sock',
  'mitten',
  'wax',
  'leash',
  'tool',
  'mask',
  'suit',
  'strap',
  'pole',
];

export const snowboard: SizeChartDefinition = {
  key: 'snowboard',
  title: 'Snowboard size guide',
  group: 'Snow & water',
  description: 'Board length by rider height and weight, with waist width for boot fit.',
  columns: [
    col('Rider height (cm)', 'cm'),
    col('Rider weight (kg)', 'kg'),
    col('Waist width (mm)', 'mm'),
    col('Max boot size (UK)'),
  ],
  rows: [
    row('130cm', '120–135', '25–40', '210', 'UK 3'),
    row('140cm', '130–145', '30–45', '220', 'UK 4'),
    row('146cm', '150–158', '45–55', '235', 'UK 6'),
    row('148cm', '152–160', '47–58', '238', 'UK 7'),
    row('150cm', '155–163', '50–62', '240', 'UK 7'),
    row('152cm', '158–166', '55–66', '243', 'UK 8'),
    row('154cm', '160–168', '58–70', '245', 'UK 8'),
    row('156cm', '163–171', '62–74', '247', 'UK 9'),
    row('158cm', '165–173', '65–78', '250', 'UK 9'),
    row('160cm', '168–176', '68–82', '252', 'UK 10'),
    row('162cm', '170–178', '72–86', '254', 'UK 10'),
    row('164cm', '173–181', '76–90', '256', 'UK 11'),
    row('166cm', '176–184', '80–95', '258', 'UK 11'),
  ],
  tips: [
    'A snowboard usually stands between your chin and nose when placed on its tail.',
    'Go shorter for park and tricks, and longer for powder and speed.',
    'Weight matters as much as height — heavier riders should size up within their height range.',
    'If your boots are larger than the "Max boot size", choose a wide board to avoid toe drag.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [['snowboard', 'snowboarding']],
    none: SNOW_ACCESSORIES,
  },
};

function skiRows(): ChartRow[] {
  const rows: ChartRow[] = [];
  for (let length = 110; length <= 190; length += 5) {
    const type =
      length <= 140
        ? 'Kids / junior'
        : length <= 160
          ? 'Small adult / teen'
          : length <= 175
            ? 'Average adult'
            : 'Tall adult';
    rows.push(row(`${length}cm`, `${length + 5}–${length + 15}`, type));
  }
  return rows;
}

export const skis: SizeChartDefinition = {
  key: 'skis',
  title: 'Ski size guide',
  group: 'Snow & water',
  description: 'Ski length by skier height.',
  columns: [col('Skier height (cm)', 'cm'), col('Typical skier')],
  rows: skiRows(),
  tips: [
    'Skis usually reach between your chin and the top of your head when stood on their tails.',
    'Beginners should choose shorter skis (chin height) for easier turning.',
    'Advanced and powder skiers can go longer for stability at speed.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [['ski', 'skiing']],
    none: [...SNOW_ACCESSORIES, 'snowboard', 'jet', 'water', 'wakeboard', 'nordic'],
  },
};
