import { Prisma } from '@prisma/client';
import { settingsRepository } from '../repositories/settings.repository';
import { prisma } from '../config/database';

type Client = Prisma.TransactionClient | typeof prisma;

export interface PlatformSettings {
  gstDefaultRate: number;
  shippingMode: 'FLAT' | 'FREE_ABOVE' | 'PER_PRODUCT';
  shippingFlatRate: number;
  shippingFreeAbove: number;
  shippingOversizedSurcharge: number;
  codEnabled: boolean;
  codMaxOrderValue: number;
  returnWindowDays: number;
  paymentPendingTimeoutMin: number;
  announcementText: string;
  announcementEnabled: boolean;
  invoicePrefix: string;
  invoiceGstin: string;
  orderPrefix: string;
  sellerName: string;
  sellerAddress: string;
  sellerState: string;
}

const CACHE_TTL_MS = 60_000;

let cache: { data: PlatformSettings; expiresAt: number } | null = null;

function readNumber(map: Map<string, unknown>, key: string, fallback: number): number {
  const value = map.get(key);
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readBoolean(map: Map<string, unknown>, key: string, fallback: boolean): boolean {
  const value = map.get(key);
  return typeof value === 'boolean' ? value : fallback;
}

function readString(map: Map<string, unknown>, key: string, fallback: string): string {
  const value = map.get(key);
  return typeof value === 'string' ? value : fallback;
}

export const settingsService = {
  async getAll(force = false): Promise<PlatformSettings> {
    if (!force && cache && cache.expiresAt > Date.now()) {
      return cache.data;
    }

    const rows = await settingsRepository.findAll();
    const map = new Map<string, unknown>(rows.map((r) => [r.key, r.value]));

    const data: PlatformSettings = {
      gstDefaultRate: readNumber(map, 'gst.default_rate', 12),
      shippingMode: readString(
        map,
        'shipping.mode',
        'FREE_ABOVE',
      ) as PlatformSettings['shippingMode'],
      shippingFlatRate: readNumber(map, 'shipping.flat_rate', 99),
      shippingFreeAbove: readNumber(map, 'shipping.free_above', 2000),
      shippingOversizedSurcharge: readNumber(map, 'shipping.oversized_surcharge', 499),
      codEnabled: readBoolean(map, 'cod.enabled', true),
      codMaxOrderValue: readNumber(map, 'cod.max_order_value', 5000),
      returnWindowDays: readNumber(map, 'returns.window_days', 7),
      paymentPendingTimeoutMin: readNumber(map, 'payment.pending_timeout_min', 30),
      announcementText: readString(map, 'announcement.text', ''),
      announcementEnabled: readBoolean(map, 'announcement.enabled', false),
      invoicePrefix: readString(map, 'invoice.prefix', 'INV-'),
      invoiceGstin: readString(map, 'invoice.gstin', ''),
      orderPrefix: readString(map, 'order.prefix', 'ORD-'),
      sellerName: readString(map, 'invoice.seller_name', 'Sports Store'),
      sellerAddress: readString(map, 'invoice.seller_address', ''),
      sellerState: readString(map, 'invoice.seller_state', 'Maharashtra'),
    };

    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  },

  listRaw() {
    return settingsRepository.findAll();
  },

  async updateMany(entries: { key: string; value: Prisma.InputJsonValue }[]) {
    const result = await settingsRepository.upsertMany(entries);
    cache = null; // Invalidate immediately so the next read is fresh.
    return result;
  },

  nextOrderSequence(client?: Client) {
    return settingsRepository.nextSequence('order.next_sequence', client);
  },

  nextInvoiceSequence(client?: Client) {
    return settingsRepository.nextSequence('invoice.next_sequence', client);
  },

  clearCache(): void {
    cache = null;
  },
};
