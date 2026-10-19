// One song at a time: a player that starts pauses whichever player had the last turn. The audio mode mixes with other apps, so Sonata's own players could otherwise overlap.

let owner: object | null = null;
let pauseOwner: (() => void) | null = null;

/** Call just before `who` starts playing; `pause` is how to stop it when someone else takes a turn. */
export function takeTurn(who: object, pause: () => void) {
  if (owner !== null && owner !== who) {
    // The last owner may belong to a screen that has since closed and freed its player; it's silent already
    try {
      pauseOwner?.();
    } catch {}
  }
  owner = who;
  pauseOwner = pause;
}
