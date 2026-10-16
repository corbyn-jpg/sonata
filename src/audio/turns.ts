// One song at a time: before a player starts, whichever other player had the last turn is paused. (The audio mode mixes with other apps, so without this two of Sonata's own players could overlap.)

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
