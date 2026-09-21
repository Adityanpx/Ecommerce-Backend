import type { SizeChartDefinition } from './types';
import { SIZE_CHARTS, getChartDefinition, NO_SIZE_CHART } from './index';

/**
 * Picks the size chart for a product from its name, sub-category and sport.
 *
 * Sub-category names are admin-created and arbitrary ("General > Footwear",
 * "squash > Racquet"), so charts cannot be keyed by sub-category id. Instead each
 * chart declares keyword rules and the best-scoring chart wins.
 *
 * Field weights: a hit in the product name is worth 3x, in the sub-category 2x and in
 * the sport 1x. Longer phrases score higher ("running shoe" beats "shoe"). A chart only
 * qualifies if at least one hit comes from the name or sub-category — sport alone is
 * too vague ("Football" as a sport must not put a size chart on a corner flag).
 */

type FieldName = 'name' | 'subCategory' | 'sport';

const FIELD_WEIGHT: Record<FieldName, number> = { name: 3, subCategory: 2, sport: 1 };
const FIELD_LABEL: Record<FieldName, string> = {
  name: 'product name',
  subCategory: 'category',
  sport: 'sport',
};
const MIN_SCORE = 2;

export interface ResolveInput {
  name: string;
  subCategoryName?: string | null;
  sportName?: string | null;
}

export interface ChartMatch {
  chart: SizeChartDefinition;
  score: number;
  /** Human-readable explanation, e.g. 'Matched "running shoe" in product name'. */
  reason: string;
}

/** Lowercases, strips punctuation, and collapses phrases that would cause false hits. */
export function normalizeText(value: string | null | undefined): string {
  return (
    (value ?? '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      // "short sleeve", "cap sleeve" describe a shirt — they are not shorts or a cap.
      .replace(
        /\b(?:short|long|half|full|cap|quarter|three quarter|sleeveless)[\s-]+sleeves?\b/g,
        ' sleeve ',
      )
      // "Short Handle" / "Long Handle" are cricket bat sizes, not shorts.
      .replace(/\b(?:short|long)[\s-]+handle\b/g, ' handle ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const patternCache = new Map<string, RegExp>();

function patternFor(term: string): RegExp {
  let pattern = patternCache.get(term);
  if (!pattern) {
    const body = normalizeText(term)
      .split(' ')
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');
    // Whole word(s), optional plural: "shoe" -> shoes, "box" -> boxes.
    pattern = new RegExp(`\\b${body}(?:s|es)?\\b`);
    patternCache.set(term, pattern);
  }
  return pattern;
}

const wordCount = (term: string) => normalizeText(term).split(' ').length;

interface Hit {
  score: number;
  term: string;
  field: FieldName;
}

function bestHit(terms: string[], fields: Record<FieldName, string>): Hit | null {
  let best: Hit | null = null;
  for (const term of terms) {
    const pattern = patternFor(term);
    for (const field of Object.keys(fields) as FieldName[]) {
      if (!fields[field] || !pattern.test(fields[field])) continue;
      const score = FIELD_WEIGHT[field] * wordCount(term);
      if (!best || score > best.score) best = { score, term, field };
    }
  }
  return best;
}

function scoreChart(
  chart: SizeChartDefinition,
  fields: Record<FieldName, string>,
): ChartMatch | null {
  // Exclusions and the "must be evidenced by the product itself" rule look at the name and
  // sub-category only, never the sport.
  const nameAndCategory = { ...fields, sport: '' };
  if (chart.match.none && bestHit(chart.match.none, nameAndCategory)) return null;

  let total = 0;
  let strongest: Hit | null = null;

  for (const group of chart.match.all) {
    const hit = bestHit(group, fields);
    if (!hit) return null; // every group must match
    total += hit.score;
    if (!strongest || hit.score > strongest.score) strongest = hit;
  }

  const evidencedByProduct = chart.match.all.some((group) => bestHit(group, nameAndCategory));
  if (!strongest || !evidencedByProduct || total < MIN_SCORE) return null;

  return {
    chart,
    score: total,
    reason: `Matched "${strongest.term}" in ${FIELD_LABEL[strongest.field]}`,
  };
}

/** Returns the best automatic match, or null when nothing fits well enough. */
export function resolveSizeChart(input: ResolveInput): ChartMatch | null {
  const fields: Record<FieldName, string> = {
    name: normalizeText(input.name),
    subCategory: normalizeText(input.subCategoryName),
    sport: normalizeText(input.sportName),
  };

  let winner: ChartMatch | null = null;
  for (const chart of SIZE_CHARTS) {
    const match = scoreChart(chart, fields);
    if (!match) continue;
    if (
      !winner ||
      match.score > winner.score ||
      (match.score === winner.score && (chart.priority ?? 0) > (winner.chart.priority ?? 0))
    ) {
      winner = match;
    }
  }
  return winner;
}

export type ResolutionSource = 'override' | 'auto' | 'disabled' | 'none';

export interface ProductResolution {
  chart: SizeChartDefinition | null;
  source: ResolutionSource;
  reason: string;
}

/**
 * The single entry point for "which chart does this product show?".
 * `sizeChartKey`: null/undefined = auto-detect, 'none' = admin switched it off,
 * anything else = admin pinned that chart.
 */
export function resolveForProduct(
  input: ResolveInput & { sizeChartKey?: string | null },
): ProductResolution {
  const key = input.sizeChartKey;

  if (key === NO_SIZE_CHART) {
    return { chart: null, source: 'disabled', reason: 'Size guide turned off for this product' };
  }

  if (key) {
    const pinned = getChartDefinition(key);
    if (pinned)
      return { chart: pinned, source: 'override', reason: 'Chosen manually for this product' };
    // A stale key (chart removed in a later release) falls through to auto-detect.
  }

  const auto = resolveSizeChart(input);
  if (auto) return { chart: auto.chart, source: 'auto', reason: auto.reason };

  return { chart: null, source: 'none', reason: 'No matching size chart for this product' };
}
