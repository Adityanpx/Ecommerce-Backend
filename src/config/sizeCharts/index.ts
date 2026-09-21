import type { SizeChartDefinition, SizeChartDTO } from './types';
import { toDTO } from './types';
import { footwearAdult, footwearKids, snowboardBoots } from './footwear';
import { apparelTops, apparelWomen, apparelBottoms, apparelKids, swimwear } from './apparel';
import { cricketBat, cricketGloves, cricketPads, cricketBall } from './cricket';
import { helmets, caps, glovesGeneral, shinGuards, socks } from './protection';
import { snowboard, skis } from './snow';
import { football, basketball, hockeyStick, racquetGrip, bicycle, bags } from './gear';

/** Display order in the library: grouped by `group`, in this order within each group. */
export const SIZE_CHARTS: SizeChartDefinition[] = [
  // Footwear
  footwearAdult,
  footwearKids,
  snowboardBoots,
  // Apparel
  apparelTops,
  apparelWomen,
  apparelBottoms,
  apparelKids,
  swimwear,
  // Cricket
  cricketBat,
  cricketGloves,
  cricketPads,
  cricketBall,
  // Protection & headwear
  helmets,
  caps,
  glovesGeneral,
  shinGuards,
  socks,
  // Snow
  snowboard,
  skis,
  // Balls & equipment
  football,
  basketball,
  hockeyStick,
  racquetGrip,
  bicycle,
  bags,
];

const BY_KEY = new Map(SIZE_CHARTS.map((chart) => [chart.key, chart]));

/** Sentinel stored in Product.sizeChartKey to switch the size guide off for that product. */
export const NO_SIZE_CHART = 'none';

export function getChartDefinition(key: string): SizeChartDefinition | undefined {
  return BY_KEY.get(key);
}

export function isValidChartKey(key: string): boolean {
  return key === NO_SIZE_CHART || BY_KEY.has(key);
}

export function listChartDTOs(): SizeChartDTO[] {
  return SIZE_CHARTS.map(toDTO);
}

export type { SizeChartDefinition, SizeChartDTO } from './types';
