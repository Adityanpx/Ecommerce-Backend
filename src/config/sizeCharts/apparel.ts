import { col, row, GENERIC_NOTE, SizeChartDefinition } from './types';
import { BOTTOMS, GEAR, KIDS, NOISE, SWIM, TOPS, WOMEN } from './terms';

const FOOT_WORDS = ['shoe', 'boot', 'sneaker', 'trainer', 'footwear', 'sandal', 'slipper'];

export const apparelTops: SizeChartDefinition = {
  key: 'apparel-tops',
  title: 'T-shirt, jersey & jacket size guide',
  group: 'Apparel',
  description: 'Body measurements for adult tops — T-shirts, jerseys, hoodies and jackets.',
  columns: [
    col('Chest (cm)', 'cm'),
    col('Waist (cm)', 'cm'),
    col('Shoulder (cm)', 'cm'),
    col('Length (cm)', 'cm'),
  ],
  rows: [
    row('XS', '81–86', '66–71', '42', '66'),
    row('S', '86–91', '71–76', '44', '68'),
    row('M', '91–97', '76–81', '46', '70'),
    row('L', '97–104', '81–89', '48', '72'),
    row('XL', '104–112', '89–97', '50', '74'),
    row('XXL', '112–120', '97–105', '52', '76'),
    row('3XL', '120–128', '105–113', '54', '78'),
  ],
  tips: [
    'Chest: measure around the fullest part of your chest, under the arms, keeping the tape level.',
    'Waist: measure around your natural waistline, the narrowest part of your torso.',
    'Shoulder and length are garment measurements — compare them with a top you already own.',
    'If you are between sizes, choose the larger one for a relaxed fit.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [TOPS],
    none: [...WOMEN, ...KIDS, ...GEAR, ...FOOT_WORDS, ...SWIM],
  },
};

export const apparelWomen: SizeChartDefinition = {
  key: 'apparel-women',
  title: "Women's apparel size guide",
  group: 'Apparel',
  description: "Body measurements for women's tops, jerseys, hoodies and jackets.",
  columns: [col('UK size'), col('Bust (cm)', 'cm'), col('Waist (cm)', 'cm'), col('Hip (cm)', 'cm')],
  rows: [
    row('XS', '6', '80–84', '62–66', '86–90'),
    row('S', '8–10', '84–88', '66–70', '90–94'),
    row('M', '12', '88–92', '70–74', '94–98'),
    row('L', '14', '92–98', '74–80', '98–104'),
    row('XL', '16', '98–104', '80–86', '104–110'),
    row('XXL', '18', '104–110', '86–92', '110–116'),
  ],
  tips: [
    'Bust: measure around the fullest part of your chest, keeping the tape level across your back.',
    'Waist: measure around the narrowest part of your waist.',
    'Hip: measure around the fullest part of your hips.',
    'If your measurements fall in two sizes, choose the size that fits your largest measurement.',
  ],
  note: GENERIC_NOTE,
  priority: 3,
  match: {
    all: [TOPS, WOMEN],
    none: [...KIDS, ...GEAR, ...FOOT_WORDS, ...SWIM],
  },
};

export const apparelBottoms: SizeChartDefinition = {
  key: 'apparel-bottoms',
  title: 'Shorts, track pants & tights size guide',
  group: 'Apparel',
  description: 'Waist, hip and inseam for shorts, track pants, joggers and leggings.',
  columns: [
    col('Trouser size (in)'),
    col('Waist (cm)', 'cm'),
    col('Hip (cm)', 'cm'),
    col('Inseam (cm)', 'cm'),
  ],
  rows: [
    row('XS', '26–28', '66–71', '86–91', '76'),
    row('S', '28–30', '71–76', '91–96', '78'),
    row('M', '30–32', '76–81', '96–101', '79'),
    row('L', '32–35', '81–89', '101–106', '80'),
    row('XL', '35–38', '89–97', '106–112', '81'),
    row('XXL', '38–41', '97–105', '112–118', '82'),
    row('3XL', '41–44', '105–113', '118–124', '83'),
  ],
  tips: [
    'Waist: measure around your natural waistline.',
    'Hip: measure around the fullest part of your hips.',
    'Inseam: measure from the top of your inner thigh down to your ankle bone.',
    'For shorts, choose by waist and hip; for track pants also check the inseam.',
  ],
  note: GENERIC_NOTE,
  priority: 1,
  match: {
    all: [BOTTOMS],
    none: [...KIDS, ...GEAR, ...FOOT_WORDS, ...SWIM],
  },
};

export const apparelKids: SizeChartDefinition = {
  key: 'apparel-kids',
  title: 'Kids apparel size guide',
  group: 'Apparel',
  description: 'Clothing sizes by age, height and body measurements for kids and juniors.',
  columns: [col('Height (cm)', 'cm'), col('Chest (cm)', 'cm'), col('Waist (cm)', 'cm')],
  rows: [
    row('3-4 Y', '98–104', '55', '52'),
    row('5-6 Y', '110–116', '58', '54'),
    row('7-8 Y', '122–128', '63', '57'),
    row('9-10 Y', '134–140', '68', '60'),
    row('11-12 Y', '146–152', '74', '64'),
    row('13-14 Y', '158–164', '80', '68'),
  ],
  tips: [
    'Height: stand straight against a wall without shoes and measure from floor to head.',
    'Chest: measure around the fullest part of the chest, under the arms.',
    'Waist: measure around the natural waistline.',
    'Choose by height first — age is only a guide. Kids grow, so size up if in doubt.',
  ],
  note: GENERIC_NOTE,
  priority: 3,
  match: {
    all: [KIDS, [...TOPS, ...BOTTOMS, 'tracksuit', 'uniform', 'kit set']],
    none: [...GEAR, ...FOOT_WORDS, ...SWIM, ...NOISE],
  },
};

export const swimwear: SizeChartDefinition = {
  key: 'swimwear',
  title: 'Swimwear & wetsuit size guide',
  group: 'Snow & water',
  description: 'Swimsuits, trunks and wetsuits sized by height, weight and body measurements.',
  columns: [
    col('Height (cm)', 'cm'),
    col('Weight (kg)', 'kg'),
    col('Chest / bust (cm)', 'cm'),
    col('Waist (cm)', 'cm'),
    col('Hip (cm)', 'cm'),
  ],
  rows: [
    row('XS', '155–163', '45–55', '80–86', '64–70', '84–90'),
    row('S', '163–170', '55–64', '86–92', '70–76', '90–96'),
    row('M', '170–177', '64–73', '92–98', '76–82', '96–102'),
    row('L', '177–184', '73–83', '98–104', '82–88', '102–108'),
    row('XL', '184–191', '83–94', '104–110', '88–95', '108–114'),
    row('XXL', '191–198', '94–105', '110–118', '95–103', '114–120'),
  ],
  tips: [
    'For wetsuits, height and weight matter most — a wetsuit must fit snugly with no gaps at the neck, arms or legs.',
    'Measure over light underwear, keeping the tape snug but not tight.',
    'If you are between sizes, choose the smaller size for wetsuits and the larger for swimwear.',
  ],
  note: GENERIC_NOTE,
  priority: 3,
  match: {
    all: [SWIM],
    none: [
      'goggle',
      'cap',
      'fin',
      'board',
      'kickboard',
      'noodle',
      'float',
      'bag',
      'towel',
      'nose',
      'ear',
      'plug',
      'snorkel',
      'mask',
      'buoy',
      'paddle',
    ],
  },
};
