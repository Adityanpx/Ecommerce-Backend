import { col, row, GENERIC_NOTE, SizeChartDefinition } from './types';
import { NOISE } from './terms';

export const cricketBat: SizeChartDefinition = {
  key: 'cricket-bat',
  title: 'Cricket bat size guide',
  group: 'Cricket',
  description:
    'Choose a bat by the batter’s height. Sizes 0–6 are junior; Harrow, SH and LH are adult.',
  columns: [col('Player height (cm)', 'cm'), col('Age (approx.)'), col('Bat length (cm)', 'cm')],
  rows: [
    row('Size 0', 'Under 122', '4–5 yrs', '68.6'),
    row('Size 1', '122–130', '6 yrs', '71.1'),
    row('Size 2', '130–137', '7 yrs', '73.7'),
    row('Size 3', '137–145', '8–9 yrs', '76.2'),
    row('Size 4', '145–152', '10–11 yrs', '78.7'),
    row('Size 5', '152–160', '12 yrs', '80.0'),
    row('Size 6', '160–168', '13–14 yrs', '81.3'),
    row('Harrow', '168–175', '14–15 yrs', '83.8'),
    row('SH', '175–185', 'Adult', '85.1'),
    row('LH', '185+', 'Adult (tall)', '87.6'),
  ],
  tips: [
    'Stand upright with the bat beside you, toe on the floor: the top of the handle should reach about your hip bone.',
    'Height is the best guide. Age is only approximate — choose by height.',
    'SH = Short Handle (standard adult bat), LH = Long Handle (for taller batters).',
    'A bat that is too heavy or long slows your stroke — when in doubt, go one size down.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [['bat', 'willow']],
    none: [
      ...NOISE,
      'baseball',
      'softball',
      'rounders',
      'badminton',
      'tennis',
      'glove',
      'pad',
      'helmet',
      'guard',
      'ball',
    ],
  },
};

const HAND_SIZES = ['Small Boys', 'Boys', 'Youth', 'Men Small', 'Men', 'Men Large'];

export const cricketGloves: SizeChartDefinition = {
  key: 'cricket-gloves',
  title: 'Cricket gloves size guide',
  group: 'Cricket',
  description: 'Batting and wicket-keeping gloves sized by hand length and circumference.',
  columns: [
    col('Age (approx.)'),
    col('Hand length (cm)', 'cm'),
    col('Hand circumference (cm)', 'cm'),
  ],
  rows: [
    row(HAND_SIZES[0], '6–8 yrs', '13–14.5', '15–16.5'),
    row(HAND_SIZES[1], '8–10 yrs', '14.5–16', '16.5–18'),
    row(HAND_SIZES[2], '10–13 yrs', '16–17.5', '18–19.5'),
    row(HAND_SIZES[3], '13+ yrs', '17.5–18.5', '19.5–21'),
    row(HAND_SIZES[4], 'Adult', '18.5–19.5', '21–22.5'),
    row(HAND_SIZES[5], 'Adult (large hand)', '19.5–21', '22.5–24'),
  ],
  tips: [
    'Hand length: measure from the crease of your wrist to the tip of your middle finger.',
    'Hand circumference: wrap the tape around your palm just below the knuckles, excluding the thumb.',
    'RH gloves are worn by right-handed batters (glove on the right hand is the top hand); LH by left-handers.',
    'Gloves should be snug with the fingers reaching the end of the finger rolls without being crushed.',
  ],
  note: GENERIC_NOTE,
  priority: 3,
  match: {
    all: [
      ['glove', 'gloves', 'mitt'],
      ['cricket', 'batting', 'wicket', 'wicketkeeping', 'wicket keeping'],
    ],
    none: ['goalkeeper', 'boxing', 'snowboard', 'ski'],
  },
};

export const cricketPads: SizeChartDefinition = {
  key: 'cricket-pads',
  title: 'Cricket leg guard (pads) size guide',
  group: 'Cricket',
  description: 'Batting and wicket-keeping pads sized by the player’s height.',
  columns: [col('Player height (cm)', 'cm'), col('Pad length (cm)', 'cm')],
  rows: [
    row(HAND_SIZES[0], '110–125', '36'),
    row(HAND_SIZES[1], '125–140', '41'),
    row(HAND_SIZES[2], '140–155', '46'),
    row(HAND_SIZES[3], '155–165', '50'),
    row(HAND_SIZES[4], '165–175', '54'),
    row(HAND_SIZES[5], '175–190', '58'),
  ],
  tips: [
    'Sit with your leg bent at 90°. The pad should cover from the middle of the kneecap to the top of the ankle bone.',
    'The top of the pad should sit just above the knee cap, with the knee roll aligned with your kneecap.',
    'Pads that are too long restrict running between the wickets — choose the length by height.',
  ],
  note: GENERIC_NOTE,
  priority: 3,
  match: {
    all: [
      ['pad', 'leg guard', 'legguard', 'batting pad'],
      ['cricket', 'batting', 'wicket', 'leg guard', 'legguard'],
    ],
    none: [
      'shin',
      'yoga',
      'mouse',
      'football',
      'hockey',
      'skate',
      'knee',
      'elbow',
      'wrist',
      'shoulder',
      'thigh',
    ],
  },
};

export const cricketBall: SizeChartDefinition = {
  key: 'cricket-ball',
  title: 'Cricket ball size guide',
  group: 'Cricket',
  description: 'Ball weight and circumference by level of play.',
  columns: [col('Weight (g)', 'g'), col('Circumference (cm)', 'cm')],
  rows: [
    row('Senior (Men)', '155.9–163', '22.4–22.9'),
    row('Women', '140–151', '21–22.5'),
    row('Junior (U15)', '133–144', '20.5–22'),
    row('Youth (U13)', '113–127', '19.5–20.5'),
  ],
  tips: [
    'Choose the ball for the age group or format you play — match balls are regulated by weight.',
    'Leather balls are for match play; tennis/composite balls are for practice and softer-ball formats.',
  ],
  note: GENERIC_NOTE,
  priority: 2,
  match: {
    all: [['cricket'], ['ball']],
    none: ['bat', 'glove', 'pad', 'helmet', 'guard', 'machine', 'pump', 'shoe', ...NOISE],
  },
};
