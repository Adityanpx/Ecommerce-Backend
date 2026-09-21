/**
 * Built-in size chart library.
 *
 * Charts live in code, not the database: they are reference data that changes
 * with a deploy, needs no admin editing, and can be unit-tested. A product picks
 * one automatically (see resolver.ts) or pins one via Product.sizeChartKey.
 */

/**
 * `cm` columns can be shown in inches by the UI (every number is converted).
 * Everything else is displayed exactly as written.
 */
export type ColumnUnit = 'cm' | 'kg' | 'mm' | 'g' | 'text';

export interface ChartColumn {
  label: string;
  unit: ColumnUnit;
}

export interface ChartRow {
  /**
   * The size an admin selects when adding a variant, e.g. "UK 8", "M", "Size 6".
   * Storefront matches a variant's size against this label to highlight the row.
   */
  label: string;
  /** One value per column, same order as `columns`. */
  values: string[];
}

export type ChartGroup =
  | 'Footwear'
  | 'Apparel'
  | 'Cricket'
  | 'Protection & headwear'
  | 'Snow & water'
  | 'Balls & equipment';

/**
 * Detection rules.
 * - `all`: every inner list must contribute at least one matching term (AND of ORs).
 * - `none`: any match in the product NAME or SUB-CATEGORY disqualifies the chart.
 *   The sport is never checked here — "Swimming" as a sport must not veto a T-shirt.
 */
export interface MatchRules {
  all: string[][];
  none?: string[];
}

export interface SizeChartDefinition {
  key: string;
  title: string;
  group: ChartGroup;
  description: string;
  columns: ChartColumn[];
  rows: ChartRow[];
  /** "How to measure" tips shown under the table. */
  tips: string[];
  /** Optional caveat, e.g. that brands vary. */
  note?: string;
  match: MatchRules;
  /** Breaks ties between charts with equal scores. Higher wins. */
  priority?: number;
}

/** What clients receive — the detection rules stay server-side. */
export type SizeChartDTO = Omit<SizeChartDefinition, 'match' | 'priority'>;

export const col = (label: string, unit: ColumnUnit = 'text'): ChartColumn => ({ label, unit });

export const row = (label: string, ...values: string[]): ChartRow => ({ label, values });

export const GENERIC_NOTE =
  'General guide only. Sizing can vary slightly between brands — check the product description for brand-specific advice.';

export function toDTO(chart: SizeChartDefinition): SizeChartDTO {
  const { match: _match, priority: _priority, ...dto } = chart;
  return dto;
}
