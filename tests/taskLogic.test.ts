import { describe, expect, test } from 'bun:test';
import { generateNBackSequence, N_BACK_LETTERS } from '../src/components/tasks/DualNBack/nBackLogic';
import { generateMathProblem, generateLetterSequence, OSPAN_LETTERS } from '../src/components/tasks/OperationSpan/oSpanLogic';
import { POPULATION_NORMS, calculateZScore, calculatePercentile } from '../src/types/norms';

describe('generateNBackSequence', () => {
  test('produces the requested trial count (20 + n by default)', () => {
    expect(generateNBackSequence(2)).toHaveLength(22);
    expect(generateNBackSequence(3, 30)).toHaveLength(30);
  });

  test('match flags agree with the actual n-back stimulus', () => {
    for (const n of [1, 2, 3, 4]) {
      const seq = generateNBackSequence(n, 60);
      for (let i = 0; i < seq.length; i++) {
        const expectedVisual = i >= n && seq[i].position === seq[i - n].position;
        const expectedAudio = i >= n && seq[i].letter === seq[i - n].letter;
        expect(seq[i].isVisualMatch).toBe(expectedVisual);
        expect(seq[i].isAudioMatch).toBe(expectedAudio);
      }
    }
  });

  test('stimuli stay inside the 3x3 grid and the letter pool', () => {
    const seq = generateNBackSequence(2, 100);
    for (const s of seq) {
      expect(s.position).toBeGreaterThanOrEqual(0);
      expect(s.position).toBeLessThan(9);
      expect(N_BACK_LETTERS).toContain(s.letter);
    }
  });

  test('the first n trials are never scored as matches', () => {
    const n = 3;
    const seq = generateNBackSequence(n, 40);
    for (let i = 0; i < n; i++) {
      expect(seq[i].isVisualMatch).toBe(false);
      expect(seq[i].isAudioMatch).toBe(false);
    }
  });

  test('target rate lands near the intended ~30% per modality', () => {
    // Pooled over many sequences so this checks the design, not one sample
    let visual = 0, audio = 0, scorable = 0;
    for (let rep = 0; rep < 200; rep++) {
      const seq = generateNBackSequence(2, 100);
      for (let i = 2; i < seq.length; i++) {
        scorable++;
        if (seq[i].isVisualMatch) visual++;
        if (seq[i].isAudioMatch) audio++;
      }
    }
    expect(visual / scorable).toBeGreaterThan(0.25);
    expect(visual / scorable).toBeLessThan(0.40);
    expect(audio / scorable).toBeGreaterThan(0.25);
    expect(audio / scorable).toBeLessThan(0.40);
  });

  test('n=1 never produces an n-1 lure (there is no such position)', () => {
    const seq = generateNBackSequence(1, 60);
    expect(seq.every(s => s.lureType === 'none')).toBe(true);
  });
});

describe('generateLetterSequence', () => {
  test('returns the requested number of letters', () => {
    for (const size of [3, 4, 5, 6, 7]) {
      expect(generateLetterSequence(size)).toHaveLength(size);
    }
  });

  test('never repeats a letter within a set', () => {
    for (let rep = 0; rep < 500; rep++) {
      const set = generateLetterSequence(7);
      expect(new Set(set).size).toBe(7);
    }
  });

  test('only uses letters from the recall matrix', () => {
    for (const l of generateLetterSequence(7)) {
      expect(OSPAN_LETTERS).toContain(l);
    }
  });
});

describe('generateMathProblem', () => {
  test('the isCorrect flag always matches the arithmetic shown', () => {
    for (let rep = 0; rep < 2000; rep++) {
      const p = generateMathProblem();
      // problemString is of the form "(a op1 b) op2 c"
      const m = p.problemString.match(/^\((\d+) ([*/]) (\d+)\) ([+-]) (\d+)$/);
      expect(m).not.toBeNull();
      const [, aS, op1, bS, op2, cS] = m!;
      const a = Number(aS), b = Number(bS), c = Number(cS);
      const intermediate = op1 === '*' ? a * b : a / b;
      const trueAnswer = op2 === '+' ? intermediate + c : intermediate - c;
      expect(p.isCorrect).toBe(p.displayedAnswer === trueAnswer);
    }
  });

  test('division problems always divide evenly', () => {
    for (let rep = 0; rep < 2000; rep++) {
      const p = generateMathProblem();
      const m = p.problemString.match(/^\((\d+) \/ (\d+)\)/);
      if (m) expect(Number(m[1]) % Number(m[2])).toBe(0);
    }
  });

  test('displayed answers stay positive so distractors are plausible', () => {
    for (let rep = 0; rep < 2000; rep++) {
      expect(generateMathProblem().displayedAnswer).toBeGreaterThan(0);
    }
  });

  test('roughly half the problems are incorrect', () => {
    let correct = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (generateMathProblem().isCorrect) correct++;
    expect(correct / n).toBeGreaterThan(0.44);
    expect(correct / n).toBeLessThan(0.56);
  });
});

describe('AOSPAN score scale matches its normative scale', () => {
  // The administered protocol, mirrored from OSpanView's setSizesPlan.
  const SET_SIZES_PLAN = [3, 4, 3, 5, 4];
  const maxAchievable = SET_SIZES_PLAN.reduce((a, b) => a + b, 0);

  test('a flawless run scores at or above the population mean', () => {
    const norm = POPULATION_NORMS.operation_span_absolute;
    expect(maxAchievable).toBeGreaterThanOrEqual(norm.mean);
  });

  test('a flawless run is not reported as below-average', () => {
    const z = calculateZScore(maxAchievable, 'operation_span_absolute');
    expect(calculatePercentile(z)).toBeGreaterThan(50);
  });
});
