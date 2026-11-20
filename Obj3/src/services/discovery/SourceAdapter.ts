import {
  IntegrationStatus,
  NormalizedDiscoveredEvent,
  PlatformType,
} from '../../models/types.js';

export interface SourceFetchResult {
  sourceId: string;
  platform: PlatformType;
  status: 'success' | 'partial' | 'failed';
  events: NormalizedDiscoveredEvent[];
  error?: string;
  durationMs: number;
}

export abstract class SourceAdapter {
  abstract readonly sourceId: string;
  abstract readonly platform: PlatformType;
  abstract readonly sourceType: 'hackathon' | 'contest';
  abstract readonly fetchingMethod: string;

  abstract getCapabilityStatus(): Promise<IntegrationStatus>;
  abstract fetchEvents(): Promise<SourceFetchResult>;

  protected normalizeDate(dateInput: string | number | Date | undefined): string | null {
    if (!dateInput) return null;
    try {
      const d = typeof dateInput === 'number' ? new Date(dateInput * 1000) : new Date(dateInput);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  }

  protected createTimeoutSignal(timeoutMs: number = 10000): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }
}
