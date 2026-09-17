import type { ReservationContext } from './ReservationContext';

export type FilterName =
  | 'PassengerValidation'
  | 'FlightValidation'
  | 'ExchangeRate'
  | 'BasePrice'
  | 'LoyaltyDiscount'
  | 'PassengerTypeAdjustment'
  | 'TaxesAndFees';

export interface Filter {
  readonly name: FilterName;
  process(ctx: ReservationContext): Promise<ReservationContext>;
}
