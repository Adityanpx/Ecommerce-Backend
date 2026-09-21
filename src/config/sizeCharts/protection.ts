import { col, row, GENERIC_NOTE, SizeChartDefinition } from './types';
import { NOISE } from './terms';

export const helmets: SizeChartDefinition = {
  key: 'helmets',
  title: 'Helmet size guide',
  group: 'Protection & headwear',
  description: 'Cricket, cycling, ski and skate helmets sized by head circumference.',
  columns: [col('Head circumference (cm)', 'cm'), col('Hat size (US)')],
  rows: [
    row('XS', '51–53', '6 1/4 – 6 1/2'),
    row('S', '54–55', '6 5/8 – 6 3/4'),
    row('M', '56–57', '6 7/8 – 7'),
    row('L', '58–60', '7 1/8 – 7 3/8'),
    row('XL', '61–63', '7 1/2 – 7 5/8'),
  ],
  tips: [
    'Wrap a soft tape around your head, about 2 cm above your eyebrows and ears, where a helmet sits.',
    'Take the largest reading of three measurements.',
    'A helmet should be snug and not move when you shake your head — it must not slide over your eyes.',
    'If you are between sizes, choose the smaller size and use the adjustment dial or padding.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [['helmet', 'headgear', 'head guard']],
    none: [...NOISE],
  },
};

export const caps: SizeChartDefinition = {
  key: 'caps',
  title: 'Cap & hat size guide',
  group: 'Protection & headwear',
  description: 'Caps, hats and beanies sized by head circumference.',
  columns: [col('Head circumference (cm)', 'cm')],
  rows: [
    row('S', '54–55'),
    row('M', '56–57'),
    row('L', '58–59'),
    row('XL', '60–62'),
    row('S/M', '54–57'),
    row('L/XL', '58–62'),
    row('One Size', '54–62 (adjustable)'),
  ],
  tips: [
    'Wrap a soft tape around your head just above your eyebrows and ears.',
    'Adjustable "One Size" caps fit most adults using the strap or snap at the back.',
  ],
  note: GENERIC_NOTE,
  priority: 1,
  match: {
    all: [['cap', 'hat', 'beanie', 'bucket hat', 'sun hat', 'visor']],
    none: ['helmet', 'goggle', 'swim', 'bottle', 'pen', 'lens', 'protector', 'guard', ...NOISE],
  },
};

export const glovesGeneral: SizeChartDefinition = {
  key: 'gloves-general',
  title: 'Gloves size guide',
  group: 'Protection & headwear',
  description: 'Goalkeeper, gym, training, cycling and winter gloves sized by hand.',
  columns: [
    col('Glove number'),
    col('Hand length (cm)', 'cm'),
    col('Hand circumference (cm)', 'cm'),
  ],
  rows: [
    row('XS', '6', '16–17', '16.5–18'),
    row('S', '7', '17–18', '18–19.5'),
    row('M', '8', '18–19', '19.5–21'),
    row('L', '9', '19–20', '21–22.5'),
    row('XL', '10', '20–21', '22.5–24'),
    row('XXL', '11', '21–22', '24–25.5'),
  ],
  tips: [
    'Hand length: measure from the crease of your wrist to the tip of your middle finger.',
    'Hand circumference: wrap the tape around your palm just below the knuckles, excluding the thumb.',
    'Goalkeeper gloves are traditionally sized by number — use the "Glove number" column.',
    'If your two measurements fall in different sizes, choose the larger.',
  ],
  note: GENERIC_NOTE,
  priority: 1,
  match: {
    all: [['glove', 'mitten', 'mitt']],
    none: ['cricket', 'batting', 'wicket', 'boxing', 'wicketkeeping'],
  },
};

export const shinGuards: SizeChartDefinition = {
  key: 'shin-guards',
  title: 'Shin guard size guide',
  group: 'Protection & headwear',
  description: 'Football and hockey shin guards sized by the player’s height.',
  columns: [col('Player height (cm)', 'cm'), col('Guard length (cm)', 'cm'), col('Age (approx.)')],
  rows: [
    row('XS', '125–140', '20', '7–9 yrs'),
    row('S', '140–155', '23', '10–12 yrs'),
    row('M', '155–165', '26', '13–15 yrs'),
    row('L', '165–180', '29', 'Adult'),
    row('XL', '180+', '32', 'Adult (tall)'),
  ],
  tips: [
    'Measure from the middle of your kneecap down to the top of your ankle bone — the guard should cover this length.',
    'The guard should sit between the knee and the ankle without touching either joint.',
    'Choose by height; age is only a guide.',
  ],
  note: GENERIC_NOTE,
  priority: 3,
  match: {
    all: [['shin guard', 'shinguard', 'shin pad', 'shin protector']],
  },
};

export const socks: SizeChartDefinition = {
  key: 'socks',
  title: 'Socks size guide',
  group: 'Protection & headwear',
  description: 'Sports socks sized by shoe size.',
  columns: [col('UK'), col('US (Men)'), col('US (Women)'), col('EU')],
  rows: [
    row('S', '3–5.5', '4–6.5', '5.5–8', '35–38'),
    row('M', '6–8.5', '7–9.5', '8.5–11', '39–42'),
    row('L', '9–11.5', '10–12.5', '11.5–14', '43–46'),
    row('XL', '12–14', '13–15', '—', '47–49'),
  ],
  tips: [
    'Choose the size that covers your usual shoe size in your preferred column.',
    'If you are on the boundary between two sizes, choose the larger size for comfort.',
  ],
  note: GENERIC_NOTE,
  priority: 1,
  match: {
    all: [['sock', 'stocking']],
  },
};
