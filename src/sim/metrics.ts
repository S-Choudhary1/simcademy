/**
 * Universal metrics. Every request completion (success or error) is recorded
 * with its end-to-end latency; a rolling time window then yields the standard
 * service-level numbers — throughput, latency percentiles, and error rate —
 * for ANY architecture, not just a hand-authored one.
 */

export interface GlobalMetrics {
  /** Offered load (requests emitted per second). */
  offeredRps: number;
  /** Successful completions per second over the window. */
  throughput: number;
  p50: number;
  p95: number;
  p99: number;
  /** Fraction of requests in the window that errored (0–1). */
  errorRate: number;
}

interface Sample {
  t: number;
  latency: number;
  error: boolean;
}

export class LatencyWindow {
  private samples: Sample[] = [];

  constructor(private readonly windowMs = 3000) {}

  record(t: number, latency: number, error: boolean): void {
    this.samples.push({ t, latency, error });
  }

  reset(): void {
    this.samples = [];
  }

  compute(now: number, offeredRps: number): GlobalMetrics {
    const cutoff = now - this.windowMs;
    while (this.samples.length > 0 && this.samples[0].t < cutoff) this.samples.shift();

    const total = this.samples.length;
    let errors = 0;
    const latencies: number[] = [];
    for (const s of this.samples) {
      if (s.error) errors++;
      else latencies.push(s.latency);
    }
    latencies.sort((a, b) => a - b);

    const secs = this.windowMs / 1000;
    return {
      offeredRps,
      throughput: Math.round((latencies.length / secs) * 10) / 10,
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      errorRate: total > 0 ? errors / total : 0,
    };
  }
}

export function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return Math.round(sorted[idx] * 10) / 10;
}
