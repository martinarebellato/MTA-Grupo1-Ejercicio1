import type { PassengerRepository } from '../repositories/PassengerRepository';
import type { FlightRepository } from '../repositories/FlightRepository';
import type { ReservationRequest } from '../domain/reservation';
import { createContext, type ReservationContext } from './ReservationContext';

/** Source of the pipeline (D8): resolves passenger/flight before F1/F2, without validating them. */
export class ReservationContextLoader {
  private readonly passengerRepository: PassengerRepository;
  private readonly flightRepository: FlightRepository;

  constructor(passengerRepository: PassengerRepository, flightRepository: FlightRepository) {
    this.passengerRepository = passengerRepository;
    this.flightRepository = flightRepository;
  }

  async load(reservation: ReservationRequest): Promise<ReservationContext> {
    const [passenger, flight] = await Promise.all([
      this.passengerRepository.findById(reservation.passengerId),
      this.flightRepository.findByCode(reservation.flightCode),
    ]);
    return createContext(reservation, passenger, flight);
  }
}
