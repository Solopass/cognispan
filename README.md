# CogniSpan: Working Memory Capacity (WMC) Cognitive Laboratory

CogniSpan is a scientific-grade, local-first progressive web application built to assess, train, and expand Working Memory Capacity (WMC) across the three empirically validated pillars of executive cognition: the **Phonological Loop**, the **Visuospatial Sketchpad**, and the **Central Executive / Updating Engine**.

## Project status

> **Working prototype, paused.** Last worked on 2026-09-08. Built on the previous PC and migrated 2026-09-14.

| | |
|---|---|
| **Works** | All 5 tasks and the daily protocol UI are implemented. Data stays in the browser (IndexedDB/LocalStorage) with CSV/JSON export. |
| **Checked on the new PC (2026-09-14)** | ✅ `bun run build` passes (TypeScript + Vite, 2 s). The app was **not** opened and played through. |
| **Not done / unknown** | No automated tests. The psychometric scoring (d′, WAIS-IV norms, AOSPAN thresholds) hasn't been checked against the published references. No PWA install or offline check. |
| **Needs** | Node 18+ or Bun. No API keys, no backend. |
| **Next step** | Play through each task once and check the scores look sane, then decide whether it's worth publishing (clean enough to go public). |

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
