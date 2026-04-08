export type AnalyticsEvent = {
  name: string;
  tsMs: number;
  properties?: Record<string, unknown>;
};

export interface AnalyticsSink {
  ingest(events: AnalyticsEvent[]): Promise<void>;
}

