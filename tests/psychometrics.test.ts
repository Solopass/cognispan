import { describe, expect, test } from 'bun:test';
import { probit, calculateSDT, calculateCompositeWMC, calculateSerialPositionErrors } from '../src/services/psychometrics';
import { erf, calculateZScore, calculatePercentile, POPULATION_NORMS } from '../src/types/norms';

const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

describe('probit (inverse normal CDF)', () => {
  test('matches published quantiles', () => {
    expect(close(probit(0.5), 0, 1e-9)).toBe(true);
    expect(close(probit(0.975), 1.959964, 1e-5)).toBe(true);
    expect(close(probit(0.95), 1.644854, 1e-5)).toBe(true);
    expect(close(probit(0.025), -1.959964, 1e-5)).toBe(true);
    expect(close(probit(0.99), 2.326348, 1e-5)).toBe(true);
  });

  test('is symmetric about 0.5', () => {
    for (const p of [0.01, 0.1, 0.3, 0.45]) {
      expect(close(probit(p), -probit(1 - p), 1e-6)).toBe(true);
    }
  });

  test('is accurate in the tail branches (p < 0.02425)', () => {
    // Beyond the central rational branch, exercises the c/d coefficient path
    expect(close(probit(0.001), -3.090232, 1e-4)).toBe(true);
    expect(close(probit(0.999), 3.090232, 1e-4)).toBe(true);
  });

  test('clamps degenerate probabilities instead of returning NaN', () => {
    expect(probit(0)).toBe(-5.0);
    expect(probit(1)).toBe(5.0);
  });
});

describe('erf', () => {
  test('matches Abramowitz & Stegun reference values', () => {
    expect(close(erf(0), 0, 1e-7)).toBe(true);
    expect(close(erf(1), 0.8427008, 1.5e-7)).toBe(true);
    expect(close(erf(0.5), 0.5204999, 1.5e-7)).toBe(true);
    expect(close(erf(-1), -0.8427008, 1.5e-7)).toBe(true);
  });
});

describe('calculateSDT', () => {
  test('applies the Hautus (1995) log-linear correction', () => {
    // 10 signal trials (8 hits), 10 noise trials (2 false alarms)
    const r = calculateSDT(8, 2, 2, 8);
    // (8+0.5)/(10+1) = 0.7727 ; (2+0.5)/(10+1) = 0.2273
    expect(close(r.hitRate, 0.773, 1e-3)).toBe(true);
    expect(close(r.falseAlarmRate, 0.227, 1e-3)).toBe(true);
  });

  test("d' equals z(H) - z(F)", () => {
    const r = calculateSDT(8, 2, 2, 8);
    const expected = probit(0.773) - probit(0.227);
    expect(Math.abs(r.dPrime - expected) < 0.01).toBe(true);
  });

  test("d' is 0 when hits and false alarms are equal", () => {
    const r = calculateSDT(5, 5, 5, 5);
    expect(close(r.dPrime, 0, 1e-3)).toBe(true);
    expect(close(r.criterionC, 0, 1e-3)).toBe(true);
  });

  test('never returns NaN or Infinity at ceiling or floor performance', () => {
    for (const r of [calculateSDT(10, 0, 0, 10), calculateSDT(0, 10, 10, 0)]) {
      for (const v of Object.values(r)) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  test("A' stays within [0, 1] and exceeds 0.5 for above-chance performance", () => {
    const r = calculateSDT(9, 1, 1, 9);
    expect(r.aPrime).toBeGreaterThan(0.5);
    expect(r.aPrime).toBeLessThanOrEqual(1);
  });

  test('criterion C is negative for a liberal responder', () => {
    // Says "match" often: many hits but many false alarms
    const r = calculateSDT(9, 1, 7, 3);
    expect(r.criterionC).toBeLessThan(0);
  });
});

describe('calculateZScore / calculatePercentile', () => {
  test('z of the population mean is 0 and maps to the 50th percentile', () => {
    const n = POPULATION_NORMS.digit_span_forward;
    expect(calculateZScore(n.mean, 'digit_span_forward')).toBe(0);
    expect(close(calculatePercentile(0), 50, 0.1)).toBe(true);
  });

  test('+/-1 SD maps to ~84th / ~16th percentile', () => {
    expect(close(calculatePercentile(1), 84.1, 0.15)).toBe(true);
    expect(close(calculatePercentile(-1), 15.9, 0.15)).toBe(true);
  });

  test('unknown norm keys return 0 rather than NaN', () => {
    expect(calculateZScore(10, 'no_such_task')).toBe(0);
  });
});

describe('calculateCompositeWMC', () => {
  const emptyBaselines = {
    dualNBackLevel: 0,
    digitSpanForward: 0,
    digitSpanBackward: 0,
    corsiSpanForward: 0,
    corsiSpanBackward: 0,
    aospanAbsolute: 0,
    keepTrackScore: 0
  } as any;

  test('defaults to 100 when nothing has been measured', () => {
    expect(calculateCompositeWMC(emptyBaselines)).toBe(100);
  });

  test('returns 100 when every score sits exactly at the population mean', () => {
    const atMean = {
      ...emptyBaselines,
      dualNBackLevel: POPULATION_NORMS.dual_n_back_level.mean,
      digitSpanForward: POPULATION_NORMS.digit_span_forward.mean,
      corsiSpanForward: POPULATION_NORMS.corsi_blocks_forward.mean,
      aospanAbsolute: POPULATION_NORMS.operation_span_absolute.mean
    };
    expect(calculateCompositeWMC(atMean)).toBe(100);
  });

  test('is on an IQ-like scale: +1 SD on every measure gives 115', () => {
    const oneSd = {
      ...emptyBaselines,
      dualNBackLevel: POPULATION_NORMS.dual_n_back_level.mean + POPULATION_NORMS.dual_n_back_level.sd,
      digitSpanForward: POPULATION_NORMS.digit_span_forward.mean + POPULATION_NORMS.digit_span_forward.sd,
      corsiSpanForward: POPULATION_NORMS.corsi_blocks_forward.mean + POPULATION_NORMS.corsi_blocks_forward.sd,
      aospanAbsolute: POPULATION_NORMS.operation_span_absolute.mean + POPULATION_NORMS.operation_span_absolute.sd
    };
    expect(calculateCompositeWMC(oneSd)).toBe(115);
  });
});

describe('calculateSerialPositionErrors', () => {
  test('reports one entry per serial position with correct error rates', () => {
    const res = calculateSerialPositionErrors([
      { target: [1, 2, 3], recalled: [1, 9, 3] },
      { target: [4, 5, 6], recalled: [4, 5, 9] }
    ]);
    expect(res).toHaveLength(3);
    expect(res[0]).toEqual({ position: 1, errorRate: 0 });
    expect(res[1]).toEqual({ position: 2, errorRate: 0.5 });
    expect(res[2]).toEqual({ position: 3, errorRate: 0.5 });
  });

  test('counts a short recall as errors rather than throwing', () => {
    const res = calculateSerialPositionErrors([{ target: [1, 2, 3], recalled: [1] }]);
    expect(res[2].errorRate).toBe(1);
  });
});

describe('serial position curve over real span trials', () => {
  // Mirrors how AnalyticsView pools trials: different span lengths together.
  const trial = (target: number[], recalled: number[]) => ({ target, recalled });

  test('pools trials of different lengths by position', () => {
    const res = calculateSerialPositionErrors([
      trial([1, 2, 3], [1, 2, 3]),
      trial([4, 5, 6, 7], [9, 5, 6, 7])
    ]);
    // Position 1 seen twice, one error; position 4 seen once, correct.
    expect(res).toHaveLength(4);
    expect(res[0]).toEqual({ position: 1, errorRate: 0.5 });
    expect(res[3]).toEqual({ position: 4, errorRate: 0 });
  });

  test('a flawless set of trials produces a flat zero curve', () => {
    const res = calculateSerialPositionErrors([
      trial([1, 2, 3], [1, 2, 3]),
      trial([4, 5, 6], [4, 5, 6])
    ]);
    expect(res.every(p => p.errorRate === 0)).toBe(true);
  });

  test('returns an empty curve when nothing has been recorded', () => {
    expect(calculateSerialPositionErrors([])).toEqual([]);
  });

  test('positions are 1-based and contiguous', () => {
    const res = calculateSerialPositionErrors([trial([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])]);
    expect(res.map(p => p.position)).toEqual([1, 2, 3, 4, 5]);
  });

  test('an abandoned trial counts its missing positions as errors', () => {
    const res = calculateSerialPositionErrors([trial([1, 2, 3], [1])]);
    expect(res[0].errorRate).toBe(0);
    expect(res[1].errorRate).toBe(1);
    expect(res[2].errorRate).toBe(1);
  });

  test('error rates are proportions in [0,1], ready to render as percentages', () => {
    const res = calculateSerialPositionErrors([
      trial([1, 2, 3], [9, 9, 9]),
      trial([1, 2, 3], [1, 2, 3])
    ]);
    for (const p of res) {
      expect(p.errorRate).toBeGreaterThanOrEqual(0);
      expect(p.errorRate).toBeLessThanOrEqual(1);
    }
    expect(res[0].errorRate).toBe(0.5);
  });
});
