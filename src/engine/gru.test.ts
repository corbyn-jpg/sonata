import {
  Adam,
  initParams,
  lossAndGradients,
  PARAMETERS,
  sequenceLoss,
} from "../../scripts/train/backprop.ts";
import { encodeStep, INPUT_SIZE, intervalIndex } from "./features";
import { gruStep, predict } from "./gru";
import { CHECK, EVALUATION, MELODY_NETWORK } from "./model";
import { seededRandom } from "./random";

// A tiny network and a short made-up sequence, so every weight can be checked
function tinyProblem() {
  const random = seededRandom(9);
  const p = initParams(5, 4, 3, random);
  const xs = Array.from({ length: 6 }, () =>
    Float64Array.from({ length: 5 }, () => (random() < 0.5 ? 1 : 0)),
  );
  const targets = [0, 2, 1, 1, 0, 2];
  return { p, xs, targets };
}

describe("GRU training", () => {
  it("computes exact gradients (checked against finite differences for every weight)", () => {
    const { p, xs, targets } = tinyProblem();
    const { gradients } = lossAndGradients(p, xs, targets);
    const eps = 1e-5;
    for (const name of PARAMETERS) {
      for (let i = 0; i < p[name].length; i++) {
        const original = p[name][i];
        p[name][i] = original + eps;
        const up = sequenceLoss(p, xs, targets);
        p[name][i] = original - eps;
        const down = sequenceLoss(p, xs, targets);
        p[name][i] = original;
        const numeric = (up - down) / (2 * eps);
        expect(Math.abs(numeric - gradients[name][i])).toBeLessThan(
          1e-7 + 1e-5 * Math.abs(numeric),
        );
      }
    }
  });

  it("runs the same forward pass as the app", () => {
    const { p, xs, targets } = tinyProblem();
    expect(lossAndGradients(p, xs, targets).loss).toBeCloseTo(
      sequenceLoss(p, xs, targets),
      10,
    );
  });

  it("learns: the loss falls as Adam trains on a sequence", () => {
    const { p, xs, targets } = tinyProblem();
    const adam = new Adam(p, 0.05);
    const before = sequenceLoss(p, xs, targets);
    for (let i = 0; i < 100; i++)
      adam.step(p, lossAndGradients(p, xs, targets).gradients);
    expect(sequenceLoss(p, xs, targets)).toBeLessThan(before * 0.2);
  });

  it("gives probabilities that sum to 1", () => {
    const { p, xs } = tinyProblem();
    const y = predict(p, gruStep(p, xs[0], new Float64Array(4)));
    expect(y.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});

describe("trained model", () => {
  it("reproduces the trained network exactly on the stored example", () => {
    let h: Float64Array = new Float64Array(MELODY_NETWORK.hidden);
    for (const active of CHECK.inputs) {
      const x = new Float64Array(INPUT_SIZE);
      for (const i of active) x[i] = 1;
      h = gruStep(MELODY_NETWORK, x, h);
    }
    const y = predict(MELODY_NETWORK, h);
    CHECK.probabilities.forEach((p, k) => expect(y[k]).toBeCloseTo(p, 12));
  });

  it("beats the simpler models on chorales it never saw", () => {
    expect(EVALUATION.chords.learned).toBeLessThan(EVALUATION.chords.rules);
    expect(EVALUATION.melody.network).toBeLessThan(EVALUATION.melody.markov);
  });

  it("expects small steps after a note, like Bach", () => {
    // C in a C major chord, moving to a G chord on the beat
    const h = gruStep(
      MELODY_NETWORK,
      encodeStep(0, null, [7, 11, 2], false, true),
      new Float64Array(MELODY_NETWORK.hidden),
    );
    const y = predict(MELODY_NETWORK, h);
    const steps = [-2, -1, 1, 2].reduce(
      (sum, i) => sum + y[intervalIndex(i)],
      0,
    );
    expect(steps).toBeGreaterThan(0.5);
  });
});

describe("features", () => {
  it("encodes a note as one-hot groups", () => {
    const x = encodeStep(4, -2, [0, 4, 7], true, false);
    expect(x).toHaveLength(INPUT_SIZE);
    expect(x.reduce((a, b) => a + b, 0)).toBe(1 + 1 + 3 + 1); // pitch, interval, 3 chord notes, minor
  });

  it("clamps intervals beyond an octave", () => {
    expect(intervalIndex(-20)).toBe(0);
    expect(intervalIndex(0)).toBe(12);
    expect(intervalIndex(19)).toBe(24);
  });
});
