import { describe, expect, test } from 'bun:test';
import { generateNBackSequence, N_BACK_LETTERS } from '../src/components/tasks/DualNBack/nBackLogic';
import { generateMathProblem, generateLetterSequence, OSPAN_LETTERS } from '../src/components/tasks/OperationSpan/oSpanLogic';
import { POPULATION_NORMS, calculateZScore, calculatePercentile } from '../src/types/norms';
import {
  OSPAN_PROTOCOLS,
  ASSESSMENT_SET_SIZES,
  buildSetSizePlan,
  maxAbsoluteScore,
  maxAbsoluteScoreForProtocol,
  protocolFromRecordMode,
  shuffled
} from '../src/components/tasks/OperationSpan/ospanProtocol';

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

describe('AOSPAN protocols', () => {
  test('the full assessment administers three sets each of size 3-7', () => {
    const plan = buildSetSizePlan('assessment');
    expect(plan).toHaveLength(15);
    for (const size of [3, 4, 5, 6, 7]) {
      expect(plan.filter(n => n === size)).toHaveLength(3);
    }
  });

  test('the full assessment totals the 75 letters the norms describe', () => {
    expect(maxAbsoluteScore(buildSetSizePlan('assessment'))).toBe(75);
  });

  test('shuffling changes the order but never the set sizes administered', () => {
    const base = [...ASSESSMENT_SET_SIZES];
    for (let rep = 0; rep < 200; rep++) {
      const s = shuffled(ASSESSMENT_SET_SIZES);
      expect([...s].sort((a, b) => a - b)).toEqual([...base].sort((a, b) => a - b));
    }
  });

  test('the short practice protocol is unchanged', () => {
    expect(buildSetSizePlan('practice')).toEqual([3, 4, 3, 5, 4]);
  });

  // The regression this guards: an absolute score is the sum of perfectly
  // recalled set sizes, so it is only comparable to the published norms when
  // the same 75 items were administered.
  test('only the norm-referenced protocol reaches the population mean', () => {
    const norm = POPULATION_NORMS.operation_span_absolute;
    const assessmentMax = maxAbsoluteScore(buildSetSizePlan('assessment'));
    const practiceMax = maxAbsoluteScore(buildSetSizePlan('practice'));

    expect(OSPAN_PROTOCOLS.assessment.normReferenced).toBe(true);
    expect(assessmentMax).toBeGreaterThanOrEqual(norm.mean);

    // The short form cannot reach the mean, which is exactly why it must not
    // claim a percentile.
    expect(OSPAN_PROTOCOLS.practice.normReferenced).toBe(false);
    expect(practiceMax).toBeLessThan(norm.mean);
  });

  test('a flawless assessment run is reported as well above average', () => {
    const z = calculateZScore(maxAbsoluteScore(buildSetSizePlan('assessment')), 'operation_span_absolute');
    expect(calculatePercentile(z)).toBeGreaterThan(95);
  });

  test('the two protocols write distinguishable session modes', () => {
    expect(OSPAN_PROTOCOLS.assessment.recordMode).not.toBe(OSPAN_PROTOCOLS.practice.recordMode);
  });
});

describe('PCU is scale-free, which is why the short form uses it', () => {
  const pcu = (setSizes: number[], correctPerSet: number[]) =>
    correctPerSet.reduce((sum, c, i) => sum + c / setSizes[i], 0) / setSizes.length;

  test('a flawless run scores 1.0 on either protocol', () => {
    const short = buildSetSizePlan('practice');
    const full = buildSetSizePlan('assessment');
    expect(pcu(short, short)).toBeCloseTo(1.0, 10);
    expect(pcu(full, full)).toBeCloseTo(1.0, 10);
  });

  test('half-recall scores 0.5 regardless of how many sets were administered', () => {
    const short = buildSetSizePlan('practice');
    const full = buildSetSizePlan('assessment');
    expect(pcu(short, short.map(n => n / 2))).toBeCloseTo(0.5, 10);
    expect(pcu(full, full.map(n => n / 2))).toBeCloseTo(0.5, 10);
  });
});

describe('recovering a protocol from a stored session', () => {
  test('round-trips every protocol through its record mode', () => {
    for (const id of Object.keys(OSPAN_PROTOCOLS) as (keyof typeof OSPAN_PROTOCOLS)[]) {
      const p = OSPAN_PROTOCOLS[id];
      expect(protocolFromRecordMode(p.recordMode)?.id).toBe(p.id);
    }
  });

  test('returns null for a mode from another task, rather than guessing', () => {
    expect(protocolFromRecordMode('forward')).toBeNull();
    expect(protocolFromRecordMode('cross_modal_voice')).toBeNull();
    expect(protocolFromRecordMode('')).toBeNull();
  });

  test('each protocol reports the ceiling its own plan reaches', () => {
    expect(maxAbsoluteScoreForProtocol('assessment')).toBe(75);
    expect(maxAbsoluteScoreForProtocol('practice')).toBe(19);
    expect(maxAbsoluteScoreForProtocol('assessment')).toBe(maxAbsoluteScore(buildSetSizePlan('assessment')));
    expect(maxAbsoluteScoreForProtocol('practice')).toBe(maxAbsoluteScore(buildSetSizePlan('practice')));
  });
});
