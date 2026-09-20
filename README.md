# CogniSpan: Working Memory Capacity (WMC) Cognitive Laboratory

CogniSpan is a scientific-grade, local-first progressive web application built to assess, train, and expand Working Memory Capacity (WMC) across the three empirically validated pillars of executive cognition: the **Phonological Loop**, the **Visuospatial Sketchpad**, and the **Central Executive / Updating Engine**.

## Project status

> **Working, verified end to end.** Built on the previous PC (last worked on 2026-09-08), migrated 2026-09-14, verified and fixed 2026-09-20.

| | |
|---|---|
| **Works** | All 5 tasks and the daily protocol UI. Data stays in the browser (IndexedDB/LocalStorage) with CSV/JSON export. |
| **Verified (2026-09-20)** | ✅ `bun run build` and 41 tests pass. All 5 tasks played through end to end and their reported scores recomputed by hand: Digit Span span 8 → 74.8th, Corsi span 7 → 76.6th, Dual N-Back d′ 4.04 with the staircase advancing, Keep Track 3/3, O-Span 75/75 → 98.4th. |
| **Scoring** | The psychometrics are correct as written and now covered by tests against the published sources: probit quantiles, `erf`, Hautus (1995) log-linear d′, criterion C, Grier A′/B″, percentiles, and the CWMI composite scale. |
| **Fixed (2026-09-20)** | The O-Span administered 5 sets (19 letters) but scored against the Unsworth 75-letter norms, so a flawless run reported the 5th percentile. It now offers a **Full Assessment** (15 sets, 75 letters, norm-referenced) and a **Short Practice** (5 sets, scored by partial-credit unit, no percentile, excluded from the composite). Two related bugs went with it: the saved O-Span record was short by the final set, and a session in one mode could stop the first session in another mode from setting its baseline. |
| **Known limitation** | The timing engine pauses on `visibilitychange`, which is correct for a timed experiment but the UI gives no sign it has paused — a backgrounded tab just appears to hang mid-trial. |
| **Not done / unknown** | The norms are plausible but attribution is loose: WAIS-IV publishes scaled scores, not raw span means, so `digit_span_*` is a literature-typical figure rather than a WAIS-IV table value. No PWA install or offline check. No component/DOM tests. |
| **Needs** | Node 18+ or Bun. No API keys, no backend. |
| **Next step** | Decide whether it's worth publishing (clean enough to go public). |

`bun install && bun run dev` works in place of the npm commands below.

---

## Getting Started

### 1. Install Dependencies
Open your terminal in this directory and run:
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 5 Validated Cognitive Tasks

1. **Dual N-Back (Audio-Visual Executive Updating)**
   - Simultaneously tracks a 3x3 visual spatial grid and auditory phoneme stream.
   - Includes $N-1$ and $N+1$ proactive interference lures to prevent familiarity-based guessing.
   - Controls: Key `A` for Visual Match, Key `L` for Audio Match (or on-screen pads).
   - Psychometrics: Real-time Signal Detection sensitivity ($d'$) and response bias ($\beta$) with Hautus log-linear correction.

2. **WAIS-IV Standardized Digit Span**
   - Pure phonological capacity and executive sorting.
   - Forward, Backward, and Ascending (numerical sorting) modes.
   - Cadence: Exactly 1 digit per second with monotone audio synthesis.
   - Mapped against published WAIS-IV adult normative distributions.

3. **Corsi Block-Tapping (Visuospatial Sketchpad)**
   - Kessels et al. (2000) standardized 9-block irregular geometry (eliminates straight-line heuristic chunking).
   - Forward and Backward spatial path recall.
   - Automated span titration with 2 trials per span length.

4. **Automated Operation Span (AOSPAN)**
   - Engle lab gold standard for measuring pure working memory capacity under cognitive load.
   - Phase 1: Individual arithmetic baseline calibration ($T_{\text{deadline}} = M + 2.5 \times SD$).
   - Phase 2: Speed-gated math verification interleaved with serial letter memorization.
   - Enforces $\ge 85\%$ math accuracy requirement to ensure participants don't abandon processing.

5. **Keep Track Task (Miyake et al., 2000 Updating)**
   - Rapid word stream across 6 distinct semantic categories.
   - Tests selective memory overwrite and active unbinding by asking participants to continuously maintain only the most recent exemplar for 2–4 target categories.

---

## Core Features & Architecture

- **12-Minute "Daily Protocol"**: A curated daily workout cycling through Phonological Warmup &rarr; Visuospatial Load &rarr; Deep Executive Updating.
- **Hardware Abstraction Layer (HAL)**:
  - `requestAnimationFrame` + `performance.now()` loop eliminates JavaScript event-loop jitter.
  - Native Web Audio API synthesis for $0.0\text{ms}$ latency audio cues.
- **Local-First Data Sovereignty**:
  - 100% private, client-side persistence in IndexedDB / LocalStorage.
  - One-click exports to tidy CSV (one row per trial for Python/R analysis) and raw JSON.
- **Accessibility & Ergonomics**:
  - Distraction-free OLED dark laboratory theme (`#09090b`).
  - Full split-hand keyboard navigation (`A`, `L`, `1`-`9`, `Enter`, `Backspace`, `Esc`).
  - Colorblind-safe high-contrast geometric borders and indicators.

---

## License

**Source-available, noncommercial.** Copyright © 2026 Solopass. Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md).

- ✅ **Free** for personal use, hobby projects, study and research, and for nonprofits, schools and public institutions.
- 💼 **Commercial use** (in a business, product or paid service, or for-profit internal use) needs a paid license. See [COMMERCIAL.md](COMMERCIAL.md), or contact [realsolopass@gmail.com](mailto:realsolopass@gmail.com) · <https://polymatica.pages.dev>.
