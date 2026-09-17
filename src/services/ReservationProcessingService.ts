import type { Clock } from '../shared/clock';
import { ReservationContextLoader } from '../pipeline/ReservationContextLoader';
import { PipelineFactory } from '../pipeline/PipelineFactory';
import { PipelineConfigService } from './PipelineConfigService';
import type { ReservationStatusStore } from './ReservationStatusStore';
import { parseReservationItem } from '../http/schemas/reservationRequest.schema';
import { toReservationResult, toRejectedMalformedResult, type ReservationResult } from '../pipeline/ReservationResultMapper';
import type { PartialPipelineConfig } from '../config/pipelineConfig';

export interface ProcessBatchInput {
  readonly reservations: readonly unknown[];
  readonly config?: PartialPipelineConfig;
}

export interface ProcessBatchSummary {
  readonly total: number;
  readonly completed: number;
  readonly completedWithWarnings: number;
  readonly rejected: number;
  readonly failed: number;
}

export interface ProcessBatchOutput {
  readonly results: readonly ReservationResult[];
  readonly summary: ProcessBatchSummary;
  readonly totalProcessingTimeMs: number;
}

function extractRawId(raw: unknown, index: number): string {
  if (typeof raw === 'object' && raw !== null && 'id' in raw) {
    const id = (raw as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return `(index ${index})`;
}

/** Use case "process a batch of reservations" (IO1-IO5): validates, loads, runs the pipeline, saves. */
export class ReservationProcessingService {
  private readonly clock: Clock;
  private readonly loader: ReservationContextLoader;
  private readonly pipelineFactory: PipelineFactory;
  private readonly configService: PipelineConfigService;
  private readonly store: ReservationStatusStore;

  constructor(
    clock: Clock,
    loader: ReservationContextLoader,
    pipelineFactory: PipelineFactory,
    configService: PipelineConfigService,
    store: ReservationStatusStore,
  ) {
    this.clock = clock;
    this.loader = loader;
    this.pipelineFactory = pipelineFactory;
    this.configService = configService;
    this.store = store;
  }

  async process(input: ProcessBatchInput): Promise<ProcessBatchOutput> {
    const startedAt = this.clock.now().getTime();
    const effectiveConfig = this.configService.resolveEffectiveConfig(input.config);
    const pipeline = this.pipelineFactory.create(effectiveConfig);

    const results = await Promise.all(
      input.reservations.map(async (raw, index) => {
        const parsed = parseReservationItem(raw);
        if (!parsed.ok) {
          return toRejectedMalformedResult(extractRawId(raw, index), parsed.issues);
        }

        this.store.markProcessing(parsed.value.id);
        const initialContext = await this.loader.load(parsed.value);
        const finalContext = await pipeline.run(initialContext);
        const result = toReservationResult(finalContext);
        this.store.save(result);
        return result;
      }),
    );

    const counts = { total: 0, completed: 0, completedWithWarnings: 0, rejected: 0, failed: 0 };
    for (const result of results) {
      counts.total += 1;
      switch (result.status) {
        case 'COMPLETED':
          counts.completed += 1;
          break;
        case 'COMPLETED_WITH_WARNINGS':
          counts.completedWithWarnings += 1;
          break;
        case 'REJECTED':
          counts.rejected += 1;
          break;
        case 'FAILED':
          counts.failed += 1;
          break;
        case 'PROCESSING':
          break;
      }
    }
    const summary: ProcessBatchSummary = counts;

    const totalProcessingTimeMs = this.clock.now().getTime() - startedAt;

    return { results, summary, totalProcessingTimeMs };
  }
}
