import type { Clock } from '../shared/clock';
import type { Logger } from '../shared/logger';
import type { Filter } from './Filter';
import { CorruptContextError } from './errors';
import { type ReservationContext, withError, withTraceStep } from './ReservationContext';

export interface PipelineStage {
  readonly filter: Filter;
  readonly enabled: boolean;
}

export class Pipeline {
  private readonly stages: readonly PipelineStage[];
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(stages: readonly PipelineStage[], clock: Clock, logger: Logger) {
    this.stages = stages;
    this.clock = clock;
    this.logger = logger;
  }

  async run(initial: ReservationContext): Promise<ReservationContext> {
    let ctx = initial;

    for (const stage of this.stages) {
      if (!stage.enabled) {
        ctx = withTraceStep(ctx, { filter: stage.filter.name, status: 'disabled', durationMs: 0 });
        continue;
      }

      if (ctx.halted) {
        ctx = withTraceStep(ctx, { filter: stage.filter.name, status: 'skipped', durationMs: 0 });
        continue;
      }

      const startedAt = this.clock.now().getTime();
      try {
        const result = await stage.filter.process(ctx);
        const durationMs = this.clock.now().getTime() - startedAt;
        ctx = withTraceStep(result, { filter: stage.filter.name, status: 'ok', durationMs });
      } catch (error) {
        const durationMs = this.clock.now().getTime() - startedAt;
        if (error instanceof CorruptContextError) {
          ctx = withError(ctx, stage.filter.name, 'CORRUPT_CONTEXT', error.message);
          this.logger.error(`Filter ${stage.filter.name} received a corrupt context`, {
            code: 'CORRUPT_CONTEXT',
            message: error.message,
          });
        } else {
          const message = error instanceof Error ? error.message : String(error);
          ctx = withError(ctx, stage.filter.name, 'FILTER_EXCEPTION', message);
          this.logger.error(`Filter ${stage.filter.name} threw an unexpected exception`, {
            code: 'FILTER_EXCEPTION',
            message,
          });
        }
        ctx = withTraceStep(ctx, { filter: stage.filter.name, status: 'failed', durationMs });
      }
    }

    return ctx;
  }
}
