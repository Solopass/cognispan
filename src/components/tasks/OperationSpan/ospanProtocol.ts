/**
 * AOSPAN administration protocols.
 *
 * The normative data in `types/norms.ts` (Unsworth et al., 2005) describes the
 * absolute score on the *full* automated operation span: set sizes 3-7, three
 * sets of each, 75 letters in total. An absolute score is the sum of the set
 * sizes recalled perfectly, so it is only comparable to those norms when the
 * same 75 items were administered. A shortened run has a lower ceiling and
 * cannot be read against that distribution.
 *
 * So there are two protocols:
 *   - `assessment`: the full 15-set protocol, norm-referenced.
 *   - `practice`:   a short 5-set run, scored by partial-credit unit (PCU),
 *                   which is a proportion and therefore scale-free. It makes
 *                   no percentile claim and does not feed the WMC composite.
 */

export type OSpanProtocolId = 'assessment' | 'practice';

export interface OSpanProtocol {
  id: OSpanProtocolId;
  label: string;
  description: string;
  /** Session mode string written to the SessionRecord. */
  recordMode: string;
  /** Whether the absolute score may be compared to the population norms. */
  normReferenced: boolean;
  /** Approximate administration time, for the UI. */
  approxMinutes: number;
}

export const OSPAN_PROTOCOLS: Record<OSpanProtocolId, OSpanProtocol> = {
  assessment: {
    id: 'assessment',
    label: 'Full Assessment',
    description: 'Set sizes 3-7, three sets of each (75 letters). The administered protocol behind the Unsworth et al. (2005) norms, so the absolute score carries a percentile.',
    recordMode: 'automated_complex_span',
    normReferenced: true,
    approxMinutes: 18
  },
  practice: {
    id: 'practice',
    label: 'Short Practice',
    description: 'Five sets, scored by partial-credit unit. Scale-free, so it is comparable across runs, but it is not the normed protocol and reports no percentile.',
    recordMode: 'short_practice_span',
    normReferenced: false,
    approxMinutes: 4
  }
};

/** The fixed short-practice plan. */
export const PRACTICE_SET_SIZES: readonly number[] = [3, 4, 3, 5, 4];

/** Set sizes for the full protocol: three sets each of 3, 4, 5, 6, 7. */
export const ASSESSMENT_SET_SIZES: readonly number[] = [3, 4, 5, 6, 7].flatMap(n => [n, n, n]);

/** Total letters administered, i.e. the highest reachable absolute score. */
export function maxAbsoluteScore(setSizes: readonly number[]): number {
  return setSizes.reduce((sum, n) => sum + n, 0);
}

/** Fisher-Yates, so set sizes arrive in an unpredictable order within a run. */
export function shuffled(setSizes: readonly number[]): number[] {
  const out = [...setSizes];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Builds the set-size plan for one run of the given protocol. */
export function buildSetSizePlan(protocol: OSpanProtocolId): number[] {
  return protocol === 'assessment'
    ? shuffled(ASSESSMENT_SET_SIZES)
    : [...PRACTICE_SET_SIZES];
}
