import { Prisma } from '@prisma/client';

type Money = Prisma.Decimal | number | string;

function toPaise(value: Money): number {
  return Math.round(Number(value) * 100);
}

function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export function add(...values: Money[]): number {
  return fromPaise(values.reduce<number>((sum, v) => sum + toPaise(v), 0));
}

export function subtract(a: Money, b: Money): number {
  return fromPaise(toPaise(a) - toPaise(b));
}

export function multiply(value: Money, factor: number): number {
  return fromPaise(Math.round(toPaise(value) * factor));
}

/** percentageOf(1000, 18) -> 180 */
export function percentageOf(value: Money, percentage: Money): number {
  return fromPaise(Math.round((toPaise(value) * Number(percentage)) / 100));
}

export function toDecimal(value: Money): Prisma.Decimal {
  return new Prisma.Decimal(Number(value).toFixed(2));
}

export function toNumber(value: Money): number {
  return fromPaise(toPaise(value));
}
