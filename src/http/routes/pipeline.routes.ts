import { Router } from 'express';
import { PipelineController } from '../controllers/PipelineController';
import type { PipelineConfigService } from '../../services/PipelineConfigService';

export interface PipelineRouterDeps {
  readonly pipelineConfigService: PipelineConfigService;
}

export function createPipelineRouter(deps: PipelineRouterDeps): Router {
  const controller = new PipelineController(deps.pipelineConfigService);
  const router = Router();
  router.get('/config', controller.getConfig);
  router.put('/config', controller.updateConfig);
  return router;
}
