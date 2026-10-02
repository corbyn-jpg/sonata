// Trains Sonata's composer on J.S. Bach's chorales and writes src/engine/model.generated.json.
// Run with `npm run train:model`, then commit the JSON. Takes about a minute; results are identical every run (seeded).

// 1. Chords: a Markov chain — counts how often each chord follows each other chord (major and minor keys separately).
// 2. Melody: a GRU neural network trained with backpropagation to predict each next interval of Bach's soprano lines from the notes so far and the harmony underneath.
// Both are tested on chorales they never saw during training, against simpler baselines.

// Data: JSB Chorales (Boulanger-Lewandowski et al., 2012), via github.com/czhuang/JSB-Chorales-dataset. The file isn't in the project; by default it's read from ../datasets/ beside it.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { INPUT_SIZE, INTERVAL_COUNT } from '../src/engine/features.ts';
import { gruStep, predict } from '../src/engine/gru.ts';
import { RULE_OPENING, RULE_TRANSITIONS } from '../src/engine/priors.ts';
import { seededRandom } from '../src/engine/random.ts';
import { Adam, clipGradients, copyParams, initParams, lossAndGradients, PARAMETERS, sequenceLoss, type Params } from './train/backprop.ts';
import { chordProgression, loadChorales, melodyExamples, type Chorale } from './train/chorales.ts';

const DATASET = process.env.SONATA_DATASET ?? fileURLToPath(new URL('../../datasets/Jsb16thSeparated.json', import.meta.url));
const OUTPUT = new URL('../src/engine/model.generated.json', import.meta.url);

const HIDDEN = 48; // size of the network's memory
const MAX_EPOCHS = 40;
const PATIENCE = 6; // stop when the validation loss hasn't improved for this many passes
const LEARNING_RATE = 0.005;

const data = loadChorales(DATASET);
const round = (v: number) => Number(v.toPrecision(5));
const log = (line = '') => console.log(line);

// --- 1. Chords: Markov chain -----------------------------------------------------------------

function learnChords(chorales: Chorale[]) {
  const counts = Array.from({ length: 7 }, () => new Array(7).fill(1)); // add-one smoothing
  const opening = new Array(7).fill(1);
  for (const chorale of chorales) {
    const progression = chordProgression(chorale);
    if (progression.length === 0) continue;
    opening[progression[0]]++;
    for (let i = 1; i < progression.length; i++) counts[progression[i - 1]][progression[i]]++;
  }
  const normalise = (row: number[]) => {
    const total = row.reduce((a, b) => a + b, 0);
    return row.map((c) => round(c / total));
  };
  return { opening: normalise(opening), transitions: counts.map(normalise) };
}

/** Average surprise (nats) of a chord model on the chord changes in `chorales`: lower is better. */
function chordLoss(transitions: readonly (readonly number[])[], chorales: Chorale[]) {
  let total = 0;
  let count = 0;
  for (const chorale of chorales) {
    const progression = chordProgression(chorale);
    for (let i = 1; i < progression.length; i++) {
      total -= Math.log(transitions[progression[i - 1]][progression[i]]);
      count++;
    }
  }
  return total / count;
}

const chordModels = {
  major: learnChords(data.train.filter((c) => !c.minor)),
  minor: learnChords(data.train.filter((c) => c.minor)),
};
const testOf = (minor: boolean) => data.test.filter((c) => c.minor === minor);
const uniformChords = Array.from({ length: 7 }, () => new Array(7).fill(1 / 7));
const chordReport = {
  uniform: chordLoss(uniformChords, data.test),
  rules: chordLoss(RULE_TRANSITIONS, data.test),
  learned:
    (chordLoss(chordModels.major.transitions, testOf(false)) * testOf(false).length +
      chordLoss(chordModels.minor.transitions, testOf(true)) * testOf(true).length) /
    data.test.length,
};

// --- 2. Melody: GRU neural network ------------------------------------------------------------

const examples = {
  train: data.train.map(melodyExamples),
  valid: data.valid.map(melodyExamples),
  test: data.test.map(melodyExamples),
};
type Example = (typeof examples.train)[number];
const notesIn = (set: Example[]) => set.reduce((n, e) => n + e.targets.length, 0);
const averageLoss = (p: Params, set: Example[]) =>
  set.reduce((sum, e) => sum + sequenceLoss(p, e.xs, e.targets), 0) / notesIn(set);

const random = seededRandom(2026);
let params = initParams(INPUT_SIZE, HIDDEN, INTERVAL_COUNT, random);
const adam = new Adam(params, LEARNING_RATE);
let best = { loss: averageLoss(params, examples.valid), params: copyParams(params), epoch: 0 };

log(`Training on ${examples.train.length} chorales (${notesIn(examples.train)} notes)…`);
for (let epoch = 1; epoch <= MAX_EPOCHS && epoch - best.epoch <= PATIENCE; epoch++) {
  // A new random order each pass
  const order = examples.train.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let trainLoss = 0;
  for (const i of order) {
    const { loss, gradients } = lossAndGradients(params, examples.train[i].xs, examples.train[i].targets);
    clipGradients(gradients, 5);
    adam.step(params, gradients);
    trainLoss += loss;
  }
  const validLoss = averageLoss(params, examples.valid);
  const improved = validLoss < best.loss;
  if (improved) best = { loss: validLoss, params: copyParams(params), epoch };
  log(`  pass ${String(epoch).padStart(2)}  train ${(trainLoss / notesIn(examples.train)).toFixed(3)}  validation ${validLoss.toFixed(3)}${improved ? '  ✓ best' : ''}`);
}
params = best.params;

// What the app ships: weights rounded to 5 significant figures
const melody = {
  inputs: INPUT_SIZE,
  hidden: HIDDEN,
  outputs: INTERVAL_COUNT,
  ...Object.fromEntries(PARAMETERS.map((name) => [name, Array.from(params[name], round)])),
} as Params & Record<string, number[]>;

// Baselines: always-equal odds, how common each interval is, and the interval given the last one
function countBaseline(previousAware: boolean) {
  const table = Array.from({ length: previousAware ? INTERVAL_COUNT + 1 : 1 }, () => new Array(INTERVAL_COUNT).fill(1));
  const context = (x: Float64Array) => {
    if (!previousAware) return 0;
    const i = x.subarray(12, 12 + INTERVAL_COUNT).indexOf(1);
    return i < 0 ? INTERVAL_COUNT : i;
  };
  for (const e of examples.train) e.targets.forEach((t, i) => table[context(e.xs[i])][t]++);
  let total = 0;
  for (const e of examples.test)
    e.targets.forEach((t, i) => {
      const row = table[context(e.xs[i])];
      total -= Math.log(row[t] / row.reduce((a, b) => a + b, 0));
    });
  return total / notesIn(examples.test);
}

function accuracy(p: Params | typeof melody, set: Example[]) {
  let right = 0;
  for (const e of set) {
    let h: Float64Array = new Float64Array(HIDDEN);
    e.xs.forEach((x, i) => {
      h = gruStep(p, x, h);
      const y = predict(p, h);
      if (y.indexOf(Math.max(...y)) === e.targets[i]) right++;
    });
  }
  return right / notesIn(set);
}

const melodyReport = {
  uniform: Math.log(INTERVAL_COUNT),
  frequency: countBaseline(false),
  markov: countBaseline(true),
  network: averageLoss(melody, examples.test),
  accuracy: accuracy(melody, examples.test),
};

// A fixed example so a test can confirm the app reproduces the trained network exactly
const sample = examples.test[0];
let h: Float64Array = new Float64Array(HIDDEN);
for (const x of sample.xs.slice(0, 8)) h = gruStep(melody, x, h);
const check = {
  inputs: sample.xs.slice(0, 8).map((x) => [...x.keys()].filter((i) => x[i] === 1)),
  probabilities: Array.from(predict(melody, h)),
};

const perplexity = (nats: number) => Math.exp(nats).toFixed(2);
const evaluation = {
  testChorales: data.test.length,
  chords: Object.fromEntries(Object.entries(chordReport).map(([k, v]) => [k, Number(perplexity(v))])),
  melody: {
    ...Object.fromEntries(
      Object.entries(melodyReport)
        .filter(([k]) => k !== 'accuracy')
        .map(([k, v]) => [k, Number(perplexity(v))]),
    ),
    accuracy: round(melodyReport.accuracy),
  },
};

writeFileSync(
  OUTPUT,
  JSON.stringify({
    source: 'JSB Chorales (J.S. Bach), trained by scripts/train-model.ts',
    chords: chordModels,
    melody,
    evaluation,
    check,
  }),
);

log();
log(`Tested on ${data.test.length} chorales the models never saw. Perplexity = how many options the`);
log('model is effectively choosing between at each step (lower is better).');
log();
log('Chords (Markov chain)          perplexity');
log(`  random guess                 ${perplexity(chordReport.uniform)}`);
log(`  hand-written rules           ${perplexity(chordReport.rules)}`);
log(`  learned from Bach            ${perplexity(chordReport.learned)}`);
log();
log('Melody (next interval)         perplexity');
log(`  random guess                 ${perplexity(melodyReport.uniform)}`);
log(`  how common each interval is  ${perplexity(melodyReport.frequency)}`);
log(`  Markov (last interval)       ${perplexity(melodyReport.markov)}`);
log(`  GRU neural network           ${perplexity(melodyReport.network)}   (top guess right ${(100 * melodyReport.accuracy).toFixed(1)}% of the time)`);
log();
log(`✓ ${fileURLToPath(OUTPUT)}`);