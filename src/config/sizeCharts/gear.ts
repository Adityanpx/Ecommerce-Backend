import { col, row, GENERIC_NOTE, SizeChartDefinition } from './types';
import { NOISE } from './terms';

/** Words that mean the product is kit or an accessory, not the ball itself. */
const NOT_A_BALL = [
  'boot',
  'shoe',
  'jersey',
  'shirt',
  'tee',
  'short',
  'sock',
  'glove',
  'shin',
  'guard',
  'bag',
  'cap',
  'pump',
  'net',
  'cone',
  'bib',
  'whistle',
  'goal',
  'hoop',
  'backboard',
  'rim',
  'kit',
];

export const football: SizeChartDefinition = {
  key: 'football',
  title: 'Football size guide',
  group: 'Balls & equipment',
  description: 'Ball sizes by age, with circumference and weight.',
  columns: [col('Age'), col('Circumference (cm)', 'cm'), col('Weight (g)', 'g')],
  rows: [
    row('Size 1', 'Mini / skills ball', '46–51', '110–140'),
    row('Size 3', 'Under 8', '59–61', '310–340'),
    row('Size 4', '8–12 yrs', '63.5–66', '350–390'),
    row('Size 5', '12+ and adults', '68–70', '410–450'),
  ],
  tips: [
    'Size 5 is the standard adult match ball; Size 4 is used for youth football; Size 3 for the youngest players.',
    'Size 1 mini balls are for skills practice and souvenirs, not matches.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [
      ['football', 'soccer', 'futsal'],
      ['ball', 'football', 'soccer'],
    ],
    none: NOT_A_BALL,
  },
};

export const basketball: SizeChartDefinition = {
  key: 'basketball',
  title: 'Basketball size guide',
  group: 'Balls & equipment',
  description: 'Ball sizes by age and level, with circumference and weight.',
  columns: [col('Played by'), col('Circumference (cm)', 'cm'), col('Weight (g)', 'g')],
  rows: [
    row('Size 3', 'Mini (ages 4–6)', '56–58', '300–350'),
    row('Size 5', 'Youth (ages 8–11)', '69–71', '470–500'),
    row('Size 6', 'Women and youth (12–14)', '72.4–73.7', '510–567'),
    row('Size 7', 'Men (standard)', '74.9–78', '567–650'),
  ],
  tips: [
    'Size 7 is the official men’s size; Size 6 is the official women’s size.',
    'Choose by the age or level of the player — a ball that is too big hurts shooting form.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [['basketball'], ['ball', 'basketball']],
    none: NOT_A_BALL,
  },
};

export const hockeyStick: SizeChartDefinition = {
  key: 'hockey-stick',
  title: 'Hockey stick size guide',
  group: 'Balls & equipment',
  description: 'Stick length by player height.',
  columns: [col('Player height (cm)', 'cm'), col('Stick length (cm)', 'cm')],
  rows: [
    row('28 in', '120–130', '71.1'),
    row('30 in', '130–140', '76.2'),
    row('32 in', '140–150', '81.3'),
    row('34 in', '150–160', '86.4'),
    row('35 in', '160–165', '88.9'),
    row('36 in', '165–170', '91.4'),
    row('36.5 in', '170–175', '92.7'),
    row('37.5 in', '175–185', '95.3'),
    row('38 in', '185+', '96.5'),
  ],
  tips: [
    'Stand the stick upright beside you: the top should reach about your hip bone.',
    'A shorter stick gives more control; a longer stick gives more reach and power.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [['hockey'], ['stick']],
    none: ['bag', 'grip', 'tape', 'glove', 'shin', 'goalie', 'goalkeeper'],
  },
};

export const racquetGrip: SizeChartDefinition = {
  key: 'racquet-grip',
  title: 'Racquet grip size guide',
  group: 'Balls & equipment',
  description: 'Tennis, squash, badminton and pickleball grip sizes by hand size.',
  columns: [
    col('Grip circumference (in)'),
    col('Grip circumference (mm)', 'mm'),
    col('Hand size (cm)', 'cm'),
  ],
  rows: [
    row('L0', '4', '100', '10.2'),
    row('L1', '4 1/8', '105', '10.5'),
    row('L2', '4 1/4', '108', '10.8'),
    row('L3', '4 3/8', '111', '11.1'),
    row('L4', '4 1/2', '114', '11.4'),
    row('L5', '4 5/8', '117', '11.7'),
  ],
  tips: [
    'Measure the distance from the middle crease of your palm to the tip of your ring finger — this is your hand size.',
    'You should just fit your index finger between your fingertips and the palm when holding the racquet.',
    'You can always build up a grip with an overgrip, but you cannot make it smaller — if unsure, choose the smaller size.',
    'Badminton grips are listed as G1–G5 by brand (G4 is the most common); squash usually comes in one size.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [['racquet', 'racket']],
    none: [...NOISE, 'ball', 'string', 'shuttle', 'shuttlecock', 'overgrip'],
  },
};

export const bicycle: SizeChartDefinition = {
  key: 'bicycle',
  title: 'Bicycle size guide',
  group: 'Balls & equipment',
  description: 'Frame and wheel size by rider height.',
  columns: [col('Rider height (cm)', 'cm'), col('Frame size (cm)', 'cm'), col('Age (approx.)')],
  rows: [
    row('16 in wheel', '100–115', '—', '4–6 yrs'),
    row('20 in wheel', '115–130', '—', '6–9 yrs'),
    row('24 in wheel', '130–145', '—', '9–12 yrs'),
    row('XS', '147–158', '43–46', 'Adult'),
    row('S', '158–168', '47–50', 'Adult'),
    row('M', '168–178', '51–54', 'Adult'),
    row('L', '178–188', '55–58', 'Adult'),
    row('XL', '188–198', '59–62', 'Adult'),
  ],
  tips: [
    'Stand over the frame: there should be 2–5 cm of clearance between you and the top tube.',
    'Kids should be able to touch the ground with their toes while sitting on the saddle.',
    'Road bikes run smaller than mountain bikes at the same frame size — check the brand’s geometry.',
  ],
  note: GENERIC_NOTE,
  priority: 1,
  match: {
    all: [['bicycle', 'bike', 'cycle', 'mountain bike', 'mtb']],
    none: [
      'helmet',
      'glove',
      'jersey',
      'short',
      'sock',
      'shoe',
      'lock',
      'pump',
      'light',
      'bottle',
      'bag',
      'tyre',
      'tire',
      'tube',
      'saddle',
      'pedal',
      'chain',
      'brake',
      'stand',
      'carrier',
      'cover',
    ],
  },
};

export const bags: SizeChartDefinition = {
  key: 'bags',
  title: 'Bag size guide',
  group: 'Balls & equipment',
  description: 'Backpacks, duffels and kit bags by capacity and typical dimensions.',
  columns: [col('Capacity (litres)'), col('Typical size (H × W × D, cm)'), col('Best for')],
  rows: [
    row('Small', '15–25 L', '40 × 25 × 18', 'Gym essentials, day trips'),
    row('Medium', '25–45 L', '55 × 30 × 25', 'Training kit, weekend use'),
    row('Large', '45–65 L', '65 × 32 × 30', 'Team kit, tournaments'),
    row('Extra Large', '65+ L', '75 × 35 × 35', 'Full kit, travel'),
  ],
  tips: [
    'Capacity is a guide — check the product dimensions for exact measurements.',
    'Choose a larger bag if you carry shoes or a wet-clothes compartment separately.',
  ],
  note: GENERIC_NOTE,
  priority: 1,
  match: {
    all: [
      ['bag', 'duffel', 'duffle', 'backpack', 'rucksack', 'holdall', 'kit bag', 'tote', 'satchel'],
    ],
    none: ['punching', 'sleeping', 'tea', 'sand bag', 'sandbag'],
  },
};
