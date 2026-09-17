import { z } from 'zod';
import type { ReservationRequest } from '../../domain/reservation';
import { partialPipelineConfigSchema } from './pipelineConfig.schema';

const iataCode = z
  .string()
  .regex(/^[A-Za-z]{3}$/, 'must be a 3-letter IATA code');

export const reservationRequestSchema = z.object({
  id: z.string().min(1),
  passengerId: z.string().min(1),
  flightCode: z.string().min(1),
  origin: iataCode,
  destination: iataCode,
  seatClass: z.enum(['economy', 'business', 'first']),
});

export const processRequestBodySchema = z.object({
  reservations: z.array(z.unknown()).min(1),
  config: partialPipelineConfigSchema.optional(),
});

export type ParseReservationItemResult =
  | { readonly ok: true; readonly value: ReservationRequest }
  | { readonly ok: false; readonly issues: readonly string[] };

export function parseReservationItem(raw: unknown): ParseReservationItemResult {
  const result = reservationRequestSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const issues = result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  return { ok: false, issues };
}
