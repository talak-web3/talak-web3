/** @internal Security metrics collector — not part of the public API. */
export class SecurityMetrics {
  private static counters = new Map<string, number>();
  private static histograms = new Map<string, number[]>();

  static increment(name: string, labels: Record<string, string> = {}): void {
    const key = this.serialize(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  private static readonly MAX_HISTOGRAM_SAMPLES = 1000;

  static observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.serialize(name, labels);
    let arr = this.histograms.get(key);
    if (!arr) {
      arr = [];
      this.histograms.set(key, arr);
    }
    if (arr.length >= this.MAX_HISTOGRAM_SAMPLES) {
      const sum = arr.reduce((a, b) => a + b, 0);
      const avg = sum / arr.length;
      this.histograms.set(key, [avg]);
    }
    arr.push(value);
  }

  static expose(): string {
    let output = "";

    for (const [key, val] of this.counters.entries()) {
      output += `${key} ${val}\n`;
    }

    for (const [key, values] of this.histograms.entries()) {
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      output += `${key}_sum ${sum}\n`;
      output += `${key}_count ${count}\n`;
      output += `${key}_avg ${count > 0 ? sum / count : 0}\n`;
    }

    return output;
  }

  private static serialize(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  static trackAuthFailure(reason: string): void {
    this.increment("talak_auth_failures_total", { reason });
  }

  static trackRateLimitHit(route: string): void {
    this.increment("talak_rate_limit_hits_total", { route });
  }

  static trackRpcError(method: string, code: string): void {
    this.increment("talak_rpc_errors_total", { method, code });
  }

  static trackRpcLatency(method: string, ms: number): void {
    this.observe("talak_rpc_latency_ms", ms, { method });
  }
}
