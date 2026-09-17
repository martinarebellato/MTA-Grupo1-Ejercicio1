import { round2 } from '../shared/money';
import type { Issue } from '../domain/issue';
import type { ExchangeMetadata } from '../domain/pricing';
import type { PricingBreakdown } from '../domain/pricing';
import type { ReservationStatus } from '../domain/reservation';
import type { ReservationContext, TraceStep } from './ReservationContext';

export interface ReservationResult {
  readonly reservationId: string;
  readonly status: ReservationStatus;
  readonly errors: readonly Issue[];
  readonly warnings: readonly Issue[];
  readonly pricing: PricingBreakdown;
  readonly exchange?: ExchangeMetadata;
  readonly totalLocal?: { readonly currency: string; readonly amount: number };
  readonly trace: readonly TraceStep[];
}

function deriveStatus(errors: readonly Issue[], warnings: readonly Issue[]): ReservationStatus {
  const isFailure = errors.some((issue) => issue.code === 'CORRUPT_CONTEXT' || issue.code === 'FILTER_EXCEPTION');
  if (isFailure) {
    return 'FAILED';
  }
  if (errors.length > 0) {
    return 'REJECTED';
  }
  if (warnings.length > 0) {
    return 'COMPLETED_WITH_WARNINGS';
  }
  return 'COMPLETED';
}

function roundPricing(pricing: PricingBreakdown): PricingBreakdown {
  const rounded: Record<string, number> = {};
  for (const [key, value] of Object.entries(pricing)) {
    if (value !== undefined) {
      rounded[key] = round2(value);
    }
  }
  return rounded as PricingBreakdown;
}

function computeTotalLocal(ctx: ReservationContext): { currency: string; amount: number } | undefined {
  const exchange = ctx.metadata.exchange;
  const totalUSD = ctx.pricing.totalUSD;
  if (exchange === undefined || totalUSD === undefined) {
    return undefined;
  }
  return { currency: exchange.targetCurrency, amount: round2(totalUSD * exchange.rate) };
}

function roundExchangeMetadata(exchange: ExchangeMetadata): ExchangeMetadata {
  return {
    ...exchange,
    rate: round2(exchange.rate),
    originalPrice: round2(exchange.originalPrice),
    convertedPrice: round2(exchange.convertedPrice),
  };
}

export function toReservationResult(ctx: ReservationContext): ReservationResult {
  const errors = ctx.issues.filter((issue) => issue.severity === 'error');
  const warnings = ctx.issues.filter((issue) => issue.severity === 'warning');
  const totalLocal = computeTotalLocal(ctx);
  const exchange = ctx.metadata.exchange;

  const base: ReservationResult = {
    reservationId: ctx.reservation.id,
    status: deriveStatus(errors, warnings),
    errors,
    warnings,
    pricing: roundPricing(ctx.pricing),
    trace: ctx.trace,
  };

  const withExchange = exchange === undefined ? base : { ...base, exchange: roundExchangeMetadata(exchange) };
  return totalLocal === undefined ? withExchange : { ...withExchange, totalLocal };
}

export function toRejectedMalformedResult(rawId: string, issues: readonly string[]): ReservationResult {
  return {
    reservationId: rawId,
    status: 'REJECTED',
    errors: issues.map((message) => ({ severity: 'error' as const, code: 'MALFORMED_RESERVATION', message })),
    warnings: [],
    pricing: {},
    trace: [],
  };
}
