import { partialPipelineConfigSchema } from '../http/schemas/pipelineConfig.schema';
import { mergePipelineConfig, type PipelineConfig, type PartialPipelineConfig } from '../config/pipelineConfig';
import { defaultPipelineConfig } from '../config/defaultPipelineConfig';
import { ValidationError } from '../shared/errors';

/** Owns the in-memory global pipeline configuration and per-request effective overrides. */
export class PipelineConfigService {
  private config: PipelineConfig;

  constructor(initialConfig: PipelineConfig = defaultPipelineConfig) {
    this.config = initialConfig;
  }

  getConfig(): PipelineConfig {
    return this.config;
  }

  updateConfig(partial: unknown): PipelineConfig {
    const merged = this.mergeValidated(this.config, partial, 'Invalid pipeline configuration');
    this.config = merged;
    return this.config;
  }

  /** Merges the global config with a per-request override, without persisting it. */
  resolveEffectiveConfig(override?: unknown): PipelineConfig {
    if (override === undefined) {
      return this.config;
    }
    return this.mergeValidated(this.config, override, 'Invalid pipeline configuration override');
  }

  private mergeValidated(base: PipelineConfig, partial: unknown, errorMessage: string): PipelineConfig {
    const result = partialPipelineConfigSchema.safeParse(partial);
    if (!result.success) {
      throw new ValidationError(errorMessage, result.error.issues);
    }
    return mergePipelineConfig(base, result.data as PartialPipelineConfig);
  }
}
