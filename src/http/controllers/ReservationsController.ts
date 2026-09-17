import type { Request, Response, NextFunction } from 'express';
import { processRequestBodySchema } from '../schemas/reservationRequest.schema';
import { ValidationError, NotFoundError } from '../../shared/errors';
import type { ReservationProcessingService } from '../../services/ReservationProcessingService';
import type { ReservationStatusStore } from '../../services/ReservationStatusStore';
import type { PartialPipelineConfig } from '../../config/pipelineConfig';

export class ReservationsController {
  private readonly processingService: ReservationProcessingService;
  private readonly statusStore: ReservationStatusStore;

  constructor(processingService: ReservationProcessingService, statusStore: ReservationStatusStore) {
    this.processingService = processingService;
    this.statusStore = statusStore;
  }

  process = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = processRequestBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid request body: "reservations" must be a non-empty array',
          parsed.error.issues,
        );
      }
      const output = await this.processingService.process(
        parsed.data.config === undefined
          ? { reservations: parsed.data.reservations }
          : { reservations: parsed.data.reservations, config: parsed.data.config as PartialPipelineConfig },
      );
      res.status(200).json(output);
    } catch (error) {
      next(error);
    }
  };

  getStatus = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = req.params['id'];
      if (id === undefined) {
        throw new NotFoundError('Missing reservation id');
      }
      const stored = this.statusStore.get(id);
      if (stored === null) {
        throw new NotFoundError(`No reservation found with id ${id}`);
      }
      res.status(200).json(stored);
    } catch (error) {
      next(error);
    }
  };
}
