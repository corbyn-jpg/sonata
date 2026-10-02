// Hand-written chord odds from music theory: what the engine used before training, and the baseline the learned model is measured against. No imports: the training script reads this file. Common-practice tendencies: V → I, II → V, IV → I or V, VI → II or IV, VII → I.

//                                  I     ii    iii   IV    V     vi    vii
export const RULE_TRANSITIONS: readonly (readonly number[])[] = [
  /* I   */ [0.05, 0.15, 0.05, 0.3, 0.25, 0.15, 0.05],
  /* II  */ [0.05, 0.05, 0.05, 0.1, 0.55, 0.05, 0.15],
  /* III */ [0.05, 0.05, 0.05, 0.3, 0.1, 0.4, 0.05],
  /* IV  */ [0.3, 0.15, 0.05, 0.05, 0.35, 0.05, 0.05],
  /* V   */ [0.55, 0.05, 0.05, 0.05, 0.05, 0.2, 0.05],
  /* VI  */ [0.05, 0.3, 0.05, 0.3, 0.2, 0.05, 0.05],
  /* VII */ [0.7, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
];

/** The first chord leans towards home (I). */
export const RULE_OPENING: readonly number[] = [0.5, 0.05, 0.05, 0.15, 0.1, 0.15, 0];