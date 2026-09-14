import { DigitSpanMode } from '../../../types/cognitive';

export interface DigitSpanTrial {
  spanLength: number;
  digits: number[];
  mode: DigitSpanMode;
}

/**
 * Generates a random sequence of non-repeating consecutive digits (1 to 9)
 */
export function generateDigitSequence(spanLength: number): number[] {
  const digits: number[] = [];
  let lastDigit = -1;

  for (let i = 0; i < spanLength; i++) {
    let d: number;
    do {
      d = Math.floor(Math.random() * 9) + 1; // 1 to 9
    } while (d === lastDigit); // Prevent immediate repetitions like 7-7
    digits.push(d);
    lastDigit = d;
  }

  return digits;
}

/**
 * Validates user recall according to the specified WAIS-IV mode
 */
export function evaluateDigitResponse(
  target: number[], 
  userResponse: number[], 
  mode: DigitSpanMode
): boolean {
  if (target.length !== userResponse.length) return false;

  let expected = [...target];

  if (mode === 'backward') {
    expected.reverse();
  } else if (mode === 'ascending') {
    expected.sort((a, b) => a - b);
  }

  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== userResponse[i]) {
      return false;
    }
  }

  return true;
}
