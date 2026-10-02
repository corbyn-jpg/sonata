// Training for the GRU in src/engine/gru.ts: backpropagation through time, gradient clipping and the Adam optimiser, written out by hand (no ML library).
import { gruStep, predict, sigmoid, type GruWeights } from '../../src/engine/gru.ts';

export const PARAMETERS = ['Wz', 'bz', 'Wr', 'br', 'Wn', 'Un', 'bn', 'Wy', 'by'] as const;
type Name = (typeof PARAMETERS)[number];

/** Weights the trainer can change (and gradients, which have the same shape). */
export type Params = { inputs: number; hidden: number; outputs: number } & Record<Name, Float64Array>;

function sizes(inputs: number, hidden: number, outputs: number): Record<Name, number> {
  return {
    Wz: hidden * (inputs + hidden),
    bz: hidden,
    Wr: hidden * (inputs + hidden),
    br: hidden,
    Wn: hidden * inputs,
    Un: hidden * hidden,
    bn: hidden,
    Wy: outputs * hidden,
    by: outputs,
  };
}

export function zeroParams(inputs: number, hidden: number, outputs: number): Params {
  const s = sizes(inputs, hidden, outputs);
  const p = { inputs, hidden, outputs } as Params;
  for (const name of PARAMETERS) p[name] = new Float64Array(s[name]);
  return p;
}

/** Small random starting weights (±1/√hidden), biases at 0. */
export function initParams(inputs: number, hidden: number, outputs: number, random: () => number): Params {
  const p = zeroParams(inputs, hidden, outputs);
  const scale = 1 / Math.sqrt(hidden);
  for (const name of ['Wz', 'Wr', 'Wn', 'Un', 'Wy'] as const)
    for (let i = 0; i < p[name].length; i++) p[name][i] = (random() * 2 - 1) * scale;
  return p;
}

export function copyParams(p: Params): Params {
  const copy = zeroParams(p.inputs, p.hidden, p.outputs);
  for (const name of PARAMETERS) copy[name].set(p[name]);
  return copy;
}

/** Total cross-entropy (nats) of predicting `targets`, using the app's own forward pass. */
export function sequenceLoss(w: GruWeights, xs: readonly Float64Array[], targets: readonly number[]): number {
  let h: Float64Array = new Float64Array(w.hidden);
  let loss = 0;
  xs.forEach((x, t) => {
    h = gruStep(w, x, h);
    loss -= Math.log(predict(w, h)[targets[t]]);
  });
  return loss;
}

/**
 Loss and gradients for one sequence. Runs the network forwards remembering every step, then walks backwards applying the chain rule to each equation in gruStep (backpropagation through time).
 */
export function lossAndGradients(p: Params, xs: readonly Float64Array[], targets: readonly number[]) {
  const { inputs: I, hidden: H, outputs: O } = p;
  const steps: { x: Float64Array; prev: Float64Array; z: Float64Array; r: Float64Array; uh: Float64Array; n: Float64Array; h: Float64Array; y: Float64Array }[] = [];

  let h = new Float64Array(H);
  let loss = 0;
  for (let t = 0; t < xs.length; t++) {
    const x = xs[t];
    const prev = h;
    const z = new Float64Array(H);
    const r = new Float64Array(H);
    const uh = new Float64Array(H);
    const n = new Float64Array(H);
    h = new Float64Array(H);
    for (let i = 0; i < H; i++) {
      let az = p.bz[i];
      let ar = p.br[i];
      let an = p.bn[i];
      const gate = i * (I + H);
      for (let j = 0; j < I; j++) {
        az += p.Wz[gate + j] * x[j];
        ar += p.Wr[gate + j] * x[j];
        an += p.Wn[i * I + j] * x[j];
      }
      for (let j = 0; j < H; j++) {
        az += p.Wz[gate + I + j] * prev[j];
        ar += p.Wr[gate + I + j] * prev[j];
        uh[i] += p.Un[i * H + j] * prev[j];
      }
      z[i] = sigmoid(az);
      r[i] = sigmoid(ar);
      n[i] = Math.tanh(an + r[i] * uh[i]);
      h[i] = (1 - z[i]) * n[i] + z[i] * prev[i];
    }
    const y = predict(p, h);
    loss -= Math.log(y[targets[t]]);
    steps.push({ x, prev, z, r, uh, n, h, y });
  }

  const g = zeroParams(I, H, O);
  let dhNext = new Float64Array(H);
  for (let t = steps.length - 1; t >= 0; t--) {
    const { x, prev, z, r, uh, n, h, y } = steps[t];

    // Softmax + cross-entropy: d(loss)/d(logits) = probabilities − 1 at the target
    const dh = new Float64Array(dhNext);
    for (let k = 0; k < O; k++) {
      const dy = y[k] - (k === targets[t] ? 1 : 0);
      g.by[k] += dy;
      for (let j = 0; j < H; j++) {
        g.Wy[k * H + j] += dy * h[j];
        dh[j] += dy * p.Wy[k * H + j];
      }
    }

    const dPrev = new Float64Array(H);
    for (let i = 0; i < H; i++) {
      // h = (1 − z)·n + z·prev
      const dn = dh[i] * (1 - z[i]);
      const dz = dh[i] * (prev[i] - n[i]);
      dPrev[i] += dh[i] * z[i];
      // n = tanh(an + r·uh)
      const dan = dn * (1 - n[i] * n[i]);
      const dr = dan * uh[i];
      const duh = dan * r[i];
      // z = σ(az), r = σ(ar)
      const daz = dz * z[i] * (1 - z[i]);
      const dar = dr * r[i] * (1 - r[i]);

      g.bz[i] += daz;
      g.br[i] += dar;
      g.bn[i] += dan;
      const gate = i * (I + H);
      for (let j = 0; j < I; j++) {
        if (x[j] === 0) continue;
        g.Wz[gate + j] += daz * x[j];
        g.Wr[gate + j] += dar * x[j];
        g.Wn[i * I + j] += dan * x[j];
      }
      for (let j = 0; j < H; j++) {
        g.Wz[gate + I + j] += daz * prev[j];
        g.Wr[gate + I + j] += dar * prev[j];
        g.Un[i * H + j] += duh * prev[j];
        dPrev[j] += daz * p.Wz[gate + I + j] + dar * p.Wr[gate + I + j] + duh * p.Un[i * H + j];
      }
    }
    dhNext = dPrev;
  }
  return { loss, gradients: g };
}

/** Scale the gradients down if they're too large overall, so one bad step can't wreck training. */
export function clipGradients(g: Params, maxNorm: number) {
  let sum = 0;
  for (const name of PARAMETERS) for (const v of g[name]) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm <= maxNorm) return;
  for (const name of PARAMETERS) for (let i = 0; i < g[name].length; i++) g[name][i] *= maxNorm / norm;
}

/** The Adam optimiser: gradient descent with momentum and a per-weight step size. */
// (Plain fields rather than `private` constructor parameters, which Node can't run directly.)
export class Adam {
  private m: Params;
  private v: Params;
  private t = 0;
  private rate: number;
  private beta1 = 0.9;
  private beta2 = 0.999;

  constructor(p: Params, rate = 0.005) {
    this.rate = rate;
    this.m = zeroParams(p.inputs, p.hidden, p.outputs);
    this.v = zeroParams(p.inputs, p.hidden, p.outputs);
  }

  step(p: Params, g: Params) {
    this.t++;
    const correct1 = 1 - this.beta1 ** this.t;
    const correct2 = 1 - this.beta2 ** this.t;
    for (const name of PARAMETERS) {
      const [w, grad, m, v] = [p[name], g[name], this.m[name], this.v[name]];
      for (let i = 0; i < w.length; i++) {
        m[i] = this.beta1 * m[i] + (1 - this.beta1) * grad[i];
        v[i] = this.beta2 * v[i] + (1 - this.beta2) * grad[i] * grad[i];
        w[i] -= (this.rate * (m[i] / correct1)) / (Math.sqrt(v[i] / correct2) + 1e-8);
      }
    }
  }
}