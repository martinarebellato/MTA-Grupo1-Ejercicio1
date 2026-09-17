export type IssueSeverity = 'error' | 'warning';

export interface Issue {
  readonly severity: IssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly filter?: string;
}
