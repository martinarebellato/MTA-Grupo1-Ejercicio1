import type { Passenger } from '../domain/passenger';
import type { Flight } from '../domain/flight';
import type { ReservationRequest } from '../domain/reservation';
import type { PricingBreakdown, ExchangeMetadata } from '../domain/pricing';
import type { Issue } from '../domain/issue';
import type { FilterName } from './Filter';

export type TraceStepStatus = 'ok' | 'disabled' | 'skipped' | 'failed';

export interface TraceStep {
  readonly filter: FilterName;
  readonly status: TraceStepStatus;
  readonly durationMs: number;
}

export interface ReservationContextMetadata {
  readonly exchange?: ExchangeMetadata;
}

export interface ReservationContext {
  readonly reservation: ReservationRequest;
  readonly passenger: Passenger | null;
  readonly flight: Flight | null;
  readonly pricing: PricingBreakdown;
  readonly metadata: ReservationContextMetadata;
  readonly issues: readonly Issue[];
  readonly trace: readonly TraceStep[];
  readonly halted: boolean;
}

export function createContext(
  reservation: ReservationRequest,
  passenger: Passenger | null,
  flight: Flight | null,
): ReservationContext {
  return {
    reservation,
    passenger,
    flight,
    pricing: {},
    metadata: {},
    issues: [],
    trace: [],
    halted: false,
  };
}

export function withError(
  ctx: ReservationContext,
  filter: FilterName,
  code: string,
  message: string,
): ReservationContext {
  return {
    ...ctx,
    issues: [...ctx.issues, { severity: 'error', code, message, filter }],
    halted: true,
  };
}

export function withWarning(
  ctx: ReservationContext,
  filter: FilterName,
  code: string,
  message: string,
): ReservationContext {
  return {
    ...ctx,
    issues: [...ctx.issues, { severity: 'warning', code, message, filter }],
  };
}

export function withPricing(ctx: ReservationContext, partial: Partial<PricingBreakdown>): ReservationContext {
  return {
    ...ctx,
    pricing: { ...ctx.pricing, ...partial },
  };
}

export function withExchangeMetadata(ctx: ReservationContext, exchange: ExchangeMetadata): ReservationContext {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, exchange },
  };
}

export function withTraceStep(ctx: ReservationContext, step: TraceStep): ReservationContext {
  return {
    ...ctx,
    trace: [...ctx.trace, step],
  };
}
