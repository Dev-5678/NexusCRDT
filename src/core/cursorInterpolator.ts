/**
 * NexusCRDT - Catmull-Rom Collaborative Cursor Interpolator
 * 
 * Provides dead-reckoning and cubic Catmull-Rom spline interpolation
 * to render silky-smooth, 60fps remote collaborator cursors across
 * variable-latency WebRTC and WebSocket networks.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface CursorSample {
  x: number;
  y: number;
  timestamp: number;
}

export interface InterpolatedCursor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

export class CursorInterpolator {
  private samples: CursorSample[];
  private maxSamples: number;

  constructor(maxSamples: number = 8) {
    this.samples = [];
    this.maxSamples = Math.max(4, maxSamples);
  }

  /**
   * Pushes a new raw position packet received from a remote peer
   */
  public pushSample(x: number, y: number, timestamp: number = performance.now()): void {
    // Avoid duplicate zero-time samples
    if (this.samples.length > 0 && this.samples[this.samples.length - 1].timestamp >= timestamp) {
      timestamp = this.samples[this.samples.length - 1].timestamp + 1;
    }

    this.samples.push({ x, y, timestamp });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Evaluates Catmull-Rom cubic spline position at normalized parameter t in [0, 1]
   * between points p1 and p2, influenced by control points p0 and p3.
   */
  public static catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const t2 = t * t;
    const t3 = t2 * t;

    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  /**
   * Computes dead-reckoning linear extrapolation when recent samples are limited
   * or during temporary network packet bursts.
   */
  public extrapolate(targetTime: number): InterpolatedCursor {
    if (this.samples.length === 0) {
      return { x: 0, y: 0, vx: 0, vy: 0, speed: 0 };
    }

    if (this.samples.length === 1) {
      const s = this.samples[0];
      return { x: s.x, y: s.y, vx: 0, vy: 0, speed: 0 };
    }

    const last = this.samples[this.samples.length - 1];
    const prev = this.samples[this.samples.length - 2];
    const dt = Math.max(1, last.timestamp - prev.timestamp);

    const vx = (last.x - prev.x) / dt;
    const vy = (last.y - prev.y) / dt;
    const speed = Math.hypot(vx, vy);

    const leadTime = Math.max(0, targetTime - last.timestamp);
    // Apply friction damping to prevent cursor runaway during packet stall
    const damping = Math.exp(-leadTime / 150);

    return {
      x: last.x + vx * leadTime * damping,
      y: last.y + vy * leadTime * damping,
      vx,
      vy,
      speed,
    };
  }

  /**
   * Samples smooth cursor coordinate at a specific render timestamp
   */
  public sampleAt(renderTime: number): InterpolatedCursor {
    if (this.samples.length < 4) {
      return this.extrapolate(renderTime);
    }

    const n = this.samples.length;
    const p0 = this.samples[n - 4];
    const p1 = this.samples[n - 3];
    const p2 = this.samples[n - 2];
    const p3 = this.samples[n - 1];

    const segmentDuration = Math.max(1, p2.timestamp - p1.timestamp);
    const rawT = (renderTime - p1.timestamp) / segmentDuration;
    const t = Math.max(0, Math.min(1, rawT));

    const x = CursorInterpolator.catmullRom1D(p0.x, p1.x, p2.x, p3.x, t);
    const y = CursorInterpolator.catmullRom1D(p0.y, p1.y, p2.y, p3.y, t);

    const vx = (p2.x - p1.x) / segmentDuration;
    const vy = (p2.y - p1.y) / segmentDuration;

    return {
      x,
      y,
      vx,
      vy,
      speed: Math.hypot(vx, vy),
    };
  }

  public clear(): void {
    this.samples = [];
  }
}
