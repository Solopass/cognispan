export interface NBackStimulus {
  index: number;
  position: number; // 0 to 8 (3x3 grid)
  letter: string;   // C, H, K, L, Q, R, S, T
  isVisualMatch: boolean;
  isAudioMatch: boolean;
  lureType: 'none' | 'n_minus_1' | 'n_plus_1';
}

export const N_BACK_LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];

/**
 * Generates a scientifically balanced N-Back trial sequence with controlled
 * target rates and proactive interference (N-1 / N+1) lures.
 */
export function generateNBackSequence(nLevel: number, totalTrials: number = 20 + nLevel): NBackStimulus[] {
  const sequence: NBackStimulus[] = [];

  for (let i = 0; i < totalTrials; i++) {
    // Generate initial random choices
    let pos = Math.floor(Math.random() * 9);
    let letter = N_BACK_LETTERS[Math.floor(Math.random() * N_BACK_LETTERS.length)];
    let lureType: 'none' | 'n_minus_1' | 'n_plus_1' = 'none';

    if (i >= nLevel) {
      const rand = Math.random();

      if (rand < 0.20) {
        // Force Visual Match
        pos = sequence[i - nLevel].position;
        // Ensure audio does NOT match by accident
        while (letter === sequence[i - nLevel].letter) {
          letter = N_BACK_LETTERS[Math.floor(Math.random() * N_BACK_LETTERS.length)];
        }
      } else if (rand < 0.40) {
        // Force Audio Match
        letter = sequence[i - nLevel].letter;
        // Ensure visual does NOT match by accident
        while (pos === sequence[i - nLevel].position) {
          pos = Math.floor(Math.random() * 9);
        }
      } else if (rand < 0.525) {
        // Force Dual Match
        pos = sequence[i - nLevel].position;
        letter = sequence[i - nLevel].letter;
      } else if (rand < 0.675 && nLevel > 1) {
        // Force Proactive Interference Lure (N-1 match)
        pos = sequence[i - (nLevel - 1)].position;
        lureType = 'n_minus_1';
        // Make sure it doesn't accidentally collide with the true N-back match
        if (pos === sequence[i - nLevel].position) {
          pos = (pos + 1) % 9;
          lureType = 'none';
        }
        // Ensure audio does NOT accidentally match true N-back audio
        while (letter === sequence[i - nLevel].letter) {
          letter = N_BACK_LETTERS[Math.floor(Math.random() * N_BACK_LETTERS.length)];
        }
      } else {
        // Non-match: enforce neither matches
        while (pos === sequence[i - nLevel].position) {
          pos = Math.floor(Math.random() * 9);
        }
        while (letter === sequence[i - nLevel].letter) {
          letter = N_BACK_LETTERS[Math.floor(Math.random() * N_BACK_LETTERS.length)];
        }
      }
    }

    const isVisualMatch = i >= nLevel && pos === sequence[i - nLevel].position;
    const isAudioMatch = i >= nLevel && letter === sequence[i - nLevel].letter;

    sequence.push({
      index: i,
      position: pos,
      letter,
      isVisualMatch,
      isAudioMatch,
      lureType
    });
  }

  return sequence;
}
