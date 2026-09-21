/**
 * Shared vocabularies for chart detection. Terms are matched as whole words,
 * case-insensitive, with an optional plural "s"/"es" — so "shoe" matches
 * "Shoes" but not "shoehorn", and "bat" matches "Bats" but not "Batting".
 */

export const KIDS = [
  'kid',
  'kids',
  'junior',
  'jr',
  'youth',
  'boy',
  'girl',
  'toddler',
  'infant',
  'children',
  'child',
];

export const WOMEN = ['women', 'womens', 'woman', 'ladies', 'lady', 'female'];

export const FOOTWEAR = [
  'shoe',
  'sneaker',
  'trainer',
  'footwear',
  'cleat',
  'spike',
  'boot',
  'sandal',
  'slipper',
  'flip flop',
  'slide',
];

export const TOPS = [
  't shirt',
  'tshirt',
  'tee',
  'shirt',
  'jersey',
  'polo',
  'hoodie',
  'sweatshirt',
  'sweater',
  'jacket',
  'pullover',
  'track top',
  'tank top',
  'tank',
  'singlet',
  'vest',
  'top',
  'windcheater',
  'windbreaker',
  'gilet',
  'fleece',
  'cardigan',
];

export const BOTTOMS = [
  'short',
  'pant',
  'trouser',
  'jogger',
  'tights',
  'legging',
  'lower',
  'track pant',
  'trackpant',
  'skirt',
  'skort',
  'capri',
  'bermuda',
  'sweatpant',
  'bottom',
];

export const SWIM = [
  'swim',
  'swimming',
  'swimwear',
  'swimsuit',
  'wetsuit',
  'trunks',
  'bikini',
  'rash guard',
  'rashguard',
];

/** Accessory words that mean "this is not the thing itself". */
export const NOISE = [
  'bag',
  'cover',
  'case',
  'sticker',
  'oil',
  'mallet',
  'tape',
  'bottle',
  'stand',
  'stump',
  'lace',
  'insole',
  'polish',
  'brush',
  'cleaner',
  'spray',
  'dryer',
];

/** Equipment that must never be mistaken for clothing. */
export const GEAR = [
  'bat',
  'ball',
  'racquet',
  'racket',
  'glove',
  'helmet',
  'pad',
  'shoe',
  'boot',
  'bag',
  'stick',
  'guard',
  'sock',
  'cap',
  'hat',
  'goggle',
  'mat',
  'bottle',
  'towel',
  'net',
];
