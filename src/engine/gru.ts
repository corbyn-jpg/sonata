// A small recurrent neural network (a GRU, gated recurrent unit). It reads a melody one note at a time, keeps a memory of what it has heard (the hidden state), and predicts the next interval. This is inference only; training (backpropagation) is in scripts/train/. No imports: Node runs this exact file when training, so the app and the trainer can't disagree.

type Vector = ArrayLike<number>;

export type GruWeights = {
  inputs: number;
  hidden: number;
  outputs: number;
  /** Update gate: how much of the old memory to keep. hidden × (inputs + hidden) */
  Wz: Vector;
  bz: Vector;
  /** Reset gate: how much of the old memory to use when forming the new candidate. hidden × (inputs + hidden) */
  Wr: Vector;
  br: Vector;
  /** Candidate memory: hidden × inputs (from the input) and hidden × hidden (from the old memory). */
  Wn: Vector;
  Un: Vector;
  bn: Vector;
  /** Output layer: outputs × hidden */
  Wy: Vector;
  by: Vector;
};

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * One step. With x the input and h the old memory:
 *   z = σ(Wz·[x, h] + bz)          update gate
 *   r = σ(Wr·[x, h] + br)          reset gate
 *   n = tanh(Wn·x + r ⊙ (Un·h) + bn)   candidate memory
 *   h' = (1 − z) ⊙ n + z ⊙ h       new memory
 */
export function gruStep(w: GruWeights, x: Vector, h: Vector): Float64Array {
  const { inputs: I, hidden: H } = w;
  const next = new Float64Array(H);
  for (let i = 0; i < H; i++) {
    let z = w.bz[i];
    let r = w.br[i];
    let n = w.bn[i];
    let uh = 0;
    const gate = i * (I + H);
    for (let j = 0; j < I; j++) {
      if (x[j] === 0) continue; // inputs are mostly 0 (one-hot)
      z += w.Wz[gate + j] * x[j];
      r += w.Wr[gate + j] * x[j];
      n += w.Wn[i * I + j] * x[j];
    }
    for (let j = 0; j < H; j++) {
      z += w.Wz[gate + I + j] * h[j];
      r += w.Wr[gate + I + j] * h[j];
      uh += w.Un[i * H + j] * h[j];
    }
    z = sigmoid(z);
    r = sigmoid(r);
    n = Math.tanh(n + r * uh);
    next[i] = (1 - z) * n + z * h[i];
  }
  return next;
}

/** Probability of each output (softmax of Wy·h + by). */
export function predict(w: GruWeights, h: Vector): Float64Array {
  const { hidden: H, outputs: O } = w;
  const logits = new Float64Array(O);
  let max = -Infinity;
  for (let k = 0; k < O; k++) {
    let sum = w.by[k];
    for (let j = 0; j < H; j++) sum += w.Wy[k * H + j] * h[j];
    logits[k] = sum;
    max = Math.max(max, sum);
  }
  let total = 0;
  for (let k = 0; k < O; k++) {
    logits[k] = Math.exp(logits[k] - max); // subtract the max so exp can't overflow
    total += logits[k];
  }
  for (let k = 0; k < O; k++) logits[k] /= total;
  return logits;
}