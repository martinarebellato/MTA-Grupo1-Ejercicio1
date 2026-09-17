import type { Request, Response, NextFunction } from 'express';
import type { PipelineConfigService } from '../../services/PipelineConfigService';

export class PipelineController {
  private readonly configService: PipelineConfigService;

  constructor(configService: PipelineConfigService) {
    this.configService = configService;
  }

  getConfig = (_req: Request, res: Response): void => {
    res.status(200).json(this.configService.getConfig());
  };

  updateConfig = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const updated = this.configService.updateConfig(req.body);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  };
}
