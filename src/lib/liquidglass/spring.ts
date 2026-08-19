/**
 * Explicit spring integrator (position + velocity state).
 * Continuous form: a = k * (target - x) - c * v
 * Integrated with fixed sub-steps so behaviour is identical at 60 Hz and 120 Hz.
 */
export class Spring {
  x: number;
  v = 0;
  target: number;
  k: number;
  c: number;

  constructor(x: number, k = 260, c = 26) {
    this.x = x;
    this.target = x;
    this.k = k;
    this.c = c;
  }

  /** Hard-set position, killing velocity. */
  set(x: number) {
    this.x = x;
    this.target = x;
    this.v = 0;
  }

  /** Direct position control (drag): keeps a real velocity estimate for release. */
  drive(x: number, dt: number) {
    if (dt > 0) this.v = (x - this.x) / dt;
    this.x = x;
    this.target = x;
  }

  tune(k: number, c: number) {
    this.k = k;
    this.c = c;
  }

  step(dt: number) {
    // clamp catastrophic frame gaps (tab switch, GC pause)
    let remaining = Math.min(dt, 0.05);
    const h = 1 / 480;
    while (remaining > 0) {
      const s = remaining > h ? h : remaining;
      remaining -= s;
      const a = this.k * (this.target - this.x) - this.c * this.v;
      this.v += a * s;
      this.x += this.v * s;
    }
  }

  get settled() {
    return Math.abs(this.target - this.x) < 0.03 && Math.abs(this.v) < 0.05;
  }
}

/**
 * Distance-aware stiffness: short hops feel snappy (~260ms),
 * long hops keep a slightly softer, longer arc (~420ms).
 */
export function stiffnessForDistance(distancePx: number) {
  const k = 300 - distancePx * 0.32;
  return Math.max(150, Math.min(300, k));
}

export function dampingForStiffness(k: number, zeta = 0.86) {
  return 2 * zeta * Math.sqrt(k);
}
