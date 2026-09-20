/**
 * Empirical Population Norms from Peer-Reviewed Neuropsychological Literature
 * 
 * References:
 * - Digit Span: typical adult span lengths from the wider literature, in the
 *   tradition of the WAIS-IV subtest. WAIS-IV itself publishes age-scaled index
 *   scores rather than mean raw spans, so these are a reference point rather
 *   than a lookup from its tables. Wechsler, D. (2008), WAIS-IV Administration
 *   and Scoring Manual, describes the subtest.
 * - Corsi Blocks: Kessels, R. P., et al. (2000). Neuropsychological Assessment of Visuospatial Memory.
 * - AOSPAN: Unsworth, N., et al. (2005). An automated version of the operation span task.
 * - Dual N-Back: Jaeggi, S. M., et al. (2008). Improving fluid intelligence with training on working memory.
 */

export interface NormativeDistribution {
  mean: number;
  sd: number;
  reference: string;
}

export const POPULATION_NORMS: Record<string, NormativeDistribution> = {
  digit_span_forward: {
    mean: 7.0,
    sd: 1.5,
    reference: 'Typical adult span (WAIS-IV subtest tradition)'
  },
  digit_span_backward: {
    mean: 5.2,
    sd: 1.2,
    reference: 'Typical adult span (WAIS-IV subtest tradition)'
  },
  digit_span_ascending: {
    mean: 6.1,
    sd: 1.3,
    reference: 'Typical adult span (WAIS-IV subtest tradition)'
  },
  corsi_blocks_forward: {
    mean: 6.2,
    sd: 1.1,
    reference: 'Kessels et al. (2000)'
  },
  corsi_blocks_backward: {
    mean: 5.6,
    sd: 1.1,
    reference: 'Kessels et al. (2000)'
  },
  operation_span_absolute: {
    mean: 43.3,
    sd: 14.8,
    reference: 'Unsworth et al. (2005) [0-75 Scale]'
  },
  operation_span_pcu: {
    mean: 0.74,
    sd: 0.13,
    reference: 'Unsworth et al. (2005) [Proportion 0.0-1.0]'
  },
  dual_n_back_level: {
    mean: 2.6,
    sd: 0.8,
    reference: 'Jaeggi et al. (2008) Untrained Baseline'
  }
};

/**
 * Approximation of error function erf(x) (Abramowitz and Stegun 7.1.26)
 */
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * Calculates standardized Z-score from raw score and distribution
 */
export function calculateZScore(raw: number, normKey: string): number {
  const norm = POPULATION_NORMS[normKey];
  if (!norm) return 0;
  return (raw - norm.mean) / norm.sd;
}

/**
 * Calculates percentile ranking (0.0 to 99.9) from Z-score
 */
export function calculatePercentile(zScore: number): number {
  const percentile = 0.5 * (1 + erf(zScore / Math.SQRT2)) * 100;
  return Math.min(99.9, Math.max(0.1, Number(percentile.toFixed(1))));
}
