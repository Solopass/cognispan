export interface MathProblem {
  problemString: string;
  displayedAnswer: number;
  isCorrect: boolean;
}

// 12 phonemically distinct consonants matching the recall matrix
export const OSPAN_LETTERS = ['F', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T'];

/**
 * Generates an arithmetic verification problem: (A [*, /] B) [+, -] C = D
 * Ensuring clean integer results and realistic distractors (+-1 or +-2).
 */
export function generateMathProblem(): MathProblem {
  const isMultiplication = Math.random() < 0.6;
  let a: number, b: number, c: number, intermediate: number;

  if (isMultiplication) {
    a = Math.floor(Math.random() * 8) + 2; // 2 to 9
    b = Math.floor(Math.random() * 8) + 2; // 2 to 9
    intermediate = a * b;
  } else {
    b = Math.floor(Math.random() * 6) + 2; // 2 to 7
    const quotient = Math.floor(Math.random() * 8) + 2;
    a = b * quotient;
    intermediate = quotient;
  }

  const isAddition = Math.random() < 0.5;
  if (isAddition) {
    c = Math.floor(Math.random() * 9) + 1; // 1 to 9
  } else {
    // Ensure subtraction strictly results in a positive integer >= 1
    const maxC = Math.max(1, Math.min(9, intermediate - 1));
    c = Math.floor(Math.random() * maxC) + 1;
  }
  const trueAnswer = isAddition ? intermediate + c : intermediate - c;

  const isCorrect = Math.random() < 0.5;
  let displayedAnswer = trueAnswer;

  if (!isCorrect) {
    let offset = (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.5 ? 1 : 2);
    if (trueAnswer + offset <= 0) {
      offset = Math.abs(offset);
    }
    displayedAnswer = trueAnswer + offset;
  }

  const op1 = isMultiplication ? '*' : '/';
  const op2 = isAddition ? '+' : '-';
  const problemString = `(${a} ${op1} ${b}) ${op2} ${c}`;

  return {
    problemString,
    displayedAnswer,
    isCorrect
  };
}

/**
 * Generates a random sequence of letters without immediate repeats
 */
export function generateLetterSequence(setSize: number): string[] {
  const letters: string[] = [];
  const pool = [...OSPAN_LETTERS];

  for (let i = 0; i < setSize; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    letters.push(pool[idx]);
    pool.splice(idx, 1); // Avoid repeat within same set
  }

  return letters;
}
