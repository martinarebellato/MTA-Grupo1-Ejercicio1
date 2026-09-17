import { Router } from 'express';
import { ReservationsController } from '../controllers/ReservationsController';
import type { ReservationProcessingService } from '../../services/ReservationProcessingService';
import type { ReservationStatusStore } from '../../services/ReservationStatusStore';

export interface ReservationsRouterDeps {
  readonly reservationProcessingService: ReservationProcessingService;
  readonly reservationStatusStore: ReservationStatusStore;
}

export function createReservationsRouter(deps: ReservationsRouterDeps): Router {
  const controller = new ReservationsController(deps.reservationProcessingService, deps.reservationStatusStore);
  const router = Router();
  router.post('/process', controller.process);
  router.get('/:id/status', controller.getStatus);
  return router;
}
