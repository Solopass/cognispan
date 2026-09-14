import { SDTResult } from '../types/psychometrics';
import { UserCognitiveProfile } from '../types/cognitive';
import { calculateZScore } from '../types/norms';

/**
 * Rational approximation of the inverse normal cumulative distribution function (probit function)
 * Based on Beasley-Springer-Moro algorithm.
 */
export function probit(p: number): number {
  if (p <= 0 || p >= 1) {
    if (p <= 0) return -5.0;
    if (p >= 1) return 5.0;
  }

  // Split-range rational approximation
  const a = [
    -3.969683028665376e+01,  2.209460984245205e+02,
    -2.759285104469687e+02,  1.383577518672690e+02,
    -3.066479806614716e+01,  2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,  1.615858368580409e+02,
    -1.556989798598866e+02,  6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
     4.374664141464968e+00,  2.938163982698783e+00
  ];
  const d = [
     7.784695709041462e-03,  3.224671290700398e-01,
     2.445134137142996e+00,  3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
          ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

/**
 * Computes Signal Detection Theory metrics using Hautus (1995) log-linear correction
 */
export function calculateSDT(
  hits: number, 
  misses: number, 
  falseAlarms: number, 
  correctRejections: number
): SDTResult {
  // Hautus log-linear rule (+0.5 to hits/FA, +1.0 to total opportunities)
  const hitRate = (hits + 0.5) / (hits + misses + 1.0);
  const falseAlarmRate = (falseAlarms + 0.5) / (falseAlarms + correctRejections + 1.0);

  const zHit = probit(hitRate);
  const zFA = probit(falseAlarmRate);

  // d' sensitivity
  const dPrime = Number((zHit - zFA).toFixed(3));

  // Response bias criterion C
  const criterionC = Number((-0.5 * (zHit + zFA)).toFixed(3));

  // Likelihood ratio beta
  const beta = Number(Math.exp((zFA * zFA - zHit * zHit) / 2.0).toFixed(3));

  // Non-parametric sensitivity A' (Grier, 1971)
  let aPrime = 0.5;
  if (hitRate >= falseAlarmRate) {
    aPrime = 0.5 + ((hitRate - falseAlarmRate) * (1 + hitRate - falseAlarmRate)) / (4 * hitRate * (1 - falseAlarmRate));
  } else {
    aPrime = 0.5 - ((falseAlarmRate - hitRate) * (1 + falseAlarmRate - hitRate)) / (4 * falseAlarmRate * (1 - hitRate));
  }

  // Non-parametric bias B''D
  const num = (1 - hitRate) * (1 - falseAlarmRate) - (hitRate * falseAlarmRate);
  const den = (1 - hitRate) * (1 - falseAlarmRate) + (hitRate * falseAlarmRate);
  const bDoublePrime = den !== 0 ? num / den : 0;

  return {
    hitRate: Number(hitRate.toFixed(3)),
    falseAlarmRate: Number(falseAlarmRate.toFixed(3)),
    dPrime,
    beta,
    criterionC,
    aPrime: Number(aPrime.toFixed(3)),
    bDoublePrime: Number(bDoublePrime.toFixed(3))
  };
}

/**
 * Calculates serial position error frequencies to assess Primacy vs Recency effects
 */
export function calculateSerialPositionErrors(
  trials: { target: (string | number)[]; recalled: (string | number)[] }[]
): { position: number; errorRate: number }[] {
  const positionCounts: Record<number, { errors: number; total: number }> = {};

  for (const trial of trials) {
    const len = trial.target.length;
    for (let i = 0; i < len; i++) {
      if (!positionCounts[i]) {
        positionCounts[i] = { errors: 0, total: 0 };
      }
      positionCounts[i].total += 1;
      if (trial.recalled[i] !== trial.target[i]) {
        positionCounts[i].errors += 1;
      }
    }
  }

  return Object.keys(positionCounts).map(k => {
    const idx = Number(k);
    const data = positionCounts[idx];
    return {
      position: idx + 1,
      errorRate: data.total > 0 ? Number((data.errors / data.total).toFixed(2)) : 0
    };
  });
}

/**
 * Computes Composite Working Memory Capacity Index (CWMI)
 * Normalized to standard psychometric IQ-like scale (Mean = 100, SD = 15)
 */
export function calculateCompositeWMC(baselines: UserCognitiveProfile['baselines']): number {
  let weightedZSum = 0;
  let weightSum = 0;

  if (baselines.dualNBackLevel > 0) {
    const z = calculateZScore(baselines.dualNBackLevel, 'dual_n_back_level');
    weightedZSum += z * 0.35;
    weightSum += 0.35;
  }

  if (baselines.digitSpanForward > 0) {
    const z = calculateZScore(baselines.digitSpanForward, 'digit_span_forward');
    weightedZSum += z * 0.20;
    weightSum += 0.20;
  }

  if (baselines.corsiSpanForward > 0) {
    const z = calculateZScore(baselines.corsiSpanForward, 'corsi_blocks_forward');
    weightedZSum += z * 0.25;
    weightSum += 0.25;
  }

  if (baselines.aospanAbsolute > 0) {
    const z = calculateZScore(baselines.aospanAbsolute, 'operation_span_absolute');
    weightedZSum += z * 0.20;
    weightSum += 0.20;
  }

  if (weightSum === 0) return 100; // Baseline default

  const aggregateZ = weightedZSum / weightSum;
  return Math.round(100 + 15 * aggregateZ);
}
