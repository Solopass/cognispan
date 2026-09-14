import { CorsiMode } from '../../../types/cognitive';

export interface CorsiPoint {
  id: number;
  x: number; // 0.0 to 1.0 (relative to canvas width)
  y: number; // 0.0 to 1.0 (relative to canvas height)
}

/**
 * Standardized Kessels et al. (2000) non-symmetric 9-block spatial coordinates.
 * Designed to prevent straight-line heuristic chunking.
 */
export const KESSELS_CORSI_BLOCKS: CorsiPoint[] = [
  { id: 1, x: 0.35, y: 0.20 },
  { id: 2, x: 0.68, y: 0.15 },
  { id: 3, x: 0.15, y: 0.38 },
  { id: 4, x: 0.75, y: 0.42 },
  { id: 5, x: 0.48, y: 0.52 },
  { id: 6, x: 0.82, y: 0.70 },
  { id: 7, x: 0.18, y: 0.72 },
  { id: 8, x: 0.52, y: 0.85 },
  { id: 9, x: 0.85, y: 0.88 },
];

/**
 * Generates a sequence of block IDs without immediate consecutive repeats
 */
export function generateCorsiSequence(spanLength: number): number[] {
  const sequence: number[] = [];
  let lastId = -1;

  for (let i = 0; i < spanLength; i++) {
    let id: number;
    do {
      id = Math.floor(Math.random() * 9) + 1; // 1 to 9
    } while (id === lastId);
    sequence.push(id);
    lastId = id;
  }

  return sequence;
}

/**
 * Evaluates spatial sequence in forward or backward mode
 */
export function evaluateCorsiResponse(
  target: number[], 
  userTaps: number[], 
  mode: CorsiMode
): boolean {
  if (target.length !== userTaps.length) return false;

  const expected = mode === 'backward' ? [...target].reverse() : [...target];

  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== userTaps[i]) {
      return false;
    }
  }

  return true;
}
