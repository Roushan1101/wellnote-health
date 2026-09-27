# Wellnote — public frontend, local health history

A React + TypeScript + Vite health journal with **four entirely fictional reports** as its public default and the display name **RK**. Every bundled reading, sample date, reference and laboratory label is an invented illustration, not RK's actual medical history. No patient reports or medical PDFs belong in this repository.

The interface uses charcoal headings and slate body text, with pink/peach reserved for accents and warm backgrounds. Distinct status labels and icons accompany colors so the palette is not the only way to understand a result. The dashboard opens directly on the reports without a top demo banner, import panel or large report-picker introduction. A compact profile indicator distinguishes sample data from local records.

The hosted app can read a personal **JSON export locally in the browser**. It does not upload the file. Flags and educational topics are not diagnoses, prescriptions, medication doses or a health score.

## Compare a history, not just two fixed files

- The demo contains 25 markers across eight categories and four fictional collection dates: 14 February, 14 June and 14 October 2024, and 14 February 2025.
- All reports appear in history charts, the Comparison page and source summaries. Compact Before/After controls on Biomarkers select a pair; the large four-report perspective panel is no longer on Overview. The desktop sidebar retains collection-date snapshot links.
- The default comparison is the earliest and newest report. Reversed choices are automatically ordered by date. Same-day samples stay distinct by report ID; ID ordering is a deterministic tie-break, **not an inferred sampling order**.
- The original pair table, summary cards and pair exports follow the selected Before/After reports. Rows unavailable in both are excluded and counted separately. History charts and the **Comparison** page deliberately include the full history independently of that pair.
- Educational topics follow supported flags in the selected later report, with an explicit warning when that selection is historical rather than the newest report. Otherwise unsupported flags receive generic group-level review context, never an automatic treatment or iron recommendation.
- Each reading retains its own reference and optional unit. Different effective units disable numerical deltas, percentage changes, trends and comparison plots. No unit conversion is inferred.
- An explicit empty reading unit stays empty; malformed or different units cannot silently fall back to the marker default. Keep distinct tests (such as random and fasting glucose) under distinct marker IDs. Context-only references are not numerically scored, and strict targets are not overwritten by general risk bands.
- Per-report JSON summaries cover all reports, not only the selected pair. The JSON template is a complete portable synthetic dataset; per-report summaries are not importable full histories.

## History charts and all-report comparison

- **Overview:** choose a trend category and biomarker to see its line chart across all loaded reports, not just the Before/After pair.
- **Biomarker details:** select a biomarker or activate a chart point for a complete history chart and an all-report readings table, with original-value provenance where supplied.
- X positions represent elapsed collection dates. Same-day samples share their calendar-date position; report IDs keep sources distinct without inventing an intraday sequence.
- Each sample has its own reference boundaries and, when both bounds exist, a shaded mini-band. Strict cutoffs remain distinct. References are labeled **Illustrative reference** for the demo and **Report reference** for imported data. Boundaries are not a clinical target prescribed by the app.
- Lines join adjacent exact observations only. Missing, bounded and qualitative readings remain in the history table rather than becoming zero or exact points. Different or blank effective units disable the shared chart instead of combining incompatible quantities.
- **Comparison:** all four demo reports appear side by side in collection-date order. Report checkboxes, category slicers, search, status-in-any-selected-report and availability filters can narrow the matrix. Each cell retains its own result, unit, reference and classification.
- All-report CSV and printing follow the matrix's selected reports and filters. Pair exports remain separate. Mobile charts and tables scroll horizontally with readable text; keyboard-accessible chart points also open details.

## Nutrient education and mobile readability

- Low vitamin D, B12, iron, magnesium and calcium results have three food examples and two medication/supplement **alternatives to discuss with a clinician**. A low flag does not confirm dietary deficiency; the cause, treatment need, formulation and monitoring require assessment. No doses or combined regimens are prescribed.
- Replacement examples are suppressed for high, boundary, normal, missing or context-only results. High iron, low HDL, low GGT and isolated blood-count or electrolyte flags must not be treated as proven nutrient deficiencies. Unsupported flags keep general clinical-review advice rather than invented medicines.
- Guidance follows the selected later report and explicitly identifies historical selections. Optional educational links provide further information; clicking them leaves this local-only app.
- Mobile primary content and controls use at least 16 px text, secondary information at least 14 px, and primary touch controls at least 44 px height. Tables and charts scroll inside their containers rather than shrinking text. Navigation remains reachable through horizontal scrolling.

## Load personal data without publishing it

1. Prepare a Wellnote version 2 JSON export **outside this repository**. Version 1 two-report exports remain accepted and are migrated in memory.
2. Open **Settings**, then choose **Load my health data**. Import and browser-storage controls live in Settings rather than taking up dashboard space. Files must be `.json`, no larger than 2 MiB. PDFs are not supported.
3. The app reads the chosen file using `File.text()` and validates it before updating the dashboard. Invalid input leaves the current dataset intact and shows an actionable field-specific error.
4. **Remember the next import** is off by default. Without consent, the data lives only in page memory; reload/close restores the demo.
5. If explicitly enabled before import, the data is saved in this browser's unencrypted `localStorage`. Existing version-1 saved data is validated and migrated when read. The storage key remains path-scoped and backward compatible.
6. **Clear personal data / return to demo** in Settings removes the app's saved and in-memory data. Loading another file without Remember also removes the previous saved copy. Clearing does not delete original files or previous downloads.

When a source collection date is clarified, update `date` and `collectionDate` together in the local export and record the clarification in that report's `note`. Re-import the corrected file: deploying new app code does not replace an older browser-saved dataset. All date labels, chart positions, comparisons and exports are derived from the imported date rather than a PDF filename or a guessed day/month format.

Storage failures are explained rather than silently claiming a save/clear succeeded. Browser storage is **not encrypted** and can be read by other code on the same origin, including other repository sites on the same GitHub Pages hostname. Path scoping avoids accidental mixing, not malicious access. Avoid shared devices and use trusted browsers/hosting.

## Portable schema v2

Top-level keys are exactly `schemaVersion`, `person`, `reports`, `markers`:

```ts
{
  schemaVersion: 2,
  person: {
    name: string,
    initials: string,
    firstName?: string,
    latestReportedAge?: number,
    reportedSex?: string
  },
  reports: ReportInput[],
  markers: HistoryMarker[]
}

type ReportInput = {
  id: string;                 // unique sample ID; required
  date: string;               // YYYY-MM-DD, equals collectionDate when supplied
  collectionDate?: string;    // verified sample collection date
  collectionTime?: string;    // printed local time, e.g. "11:32 AM"; no timezone conversion
  reportedDate?: string;      // distinct from collection date
  laboratory?: string;
  note?: string;
  label?: string;             // accepted, but display labels are derived from date
  fullDate?: string;
  shortDate?: string;
  year?: number | string;     // matching year; four-digit string normalized to number
  pages?: number;             // integer 1–1000
  filename?: string;          // metadata only; never turned into a PDF link
  age?: number;               // integer 0–130
}

type HistoryMarker = {
  id: string;
  name: string;
  group: "heart" | "nutrition" | "blood" | "liver" |
    "kidney" | "glucose" | "thyroid" | "urine";
  unit: string;               // default display unit
  priority: number;           // integer 0–10000
  note?: string;              // generic marker context
  readings: Record<string, Reading | null>; // keys are report IDs
}

type Reading = {
  raw: string;
  sourceLabel: string;
  reference: Reference;
  page?: number;
  unit?: string;              // overrides marker.unit for this sample
  sourceRaw?: string;         // original value before an explicit external normalization
  sourceUnit?: string;
  sourceReference?: string;
  note?: string;              // per-report interpretation/provenance
}

type Reference =
  | { kind: "numeric"; label: string; min?: number; max?: number;
      minExclusive?: boolean; maxExclusive?: boolean; nilIsZero?: boolean }
  | { kind: "text"; label: string; accepted: string[] }
  | { kind: "context"; label: string };
```

Validation:

- 2–50 reports and 1–500 unique markers. Same-day reports are supported; report IDs, not dates, identify samples.
- No predefined marker IDs are required. Sparse histories and empty selected pairs have safe empty states.
- Missing `readings` keys are normalized to `null`. Unknown report keys are rejected. A marker needs at least one reading somewhere in the history.
- Duplicate report/marker IDs, unsupported fields, invalid dates/types, oversized strings, nonfinite/inverted references and malformed flags are rejected.
- Marker IDs use lowercase letters/digits separated by hyphens. Reserved prototype-related report IDs are forbidden.
- `date` must equal `collectionDate` when it is supplied. A collection time requires a collection date. Labels are derived without local timezone shifts; supplied display labels cannot override the canonical date.
- Missing collection dates are explicitly labeled **“Collection date not supplied; legacy report date”**. Migration does not claim an old report date was a sampling date.
- Numeric references require a finite minimum or maximum. Text references require 1–30 accepted strings. Optional source page numbers must not exceed a supplied report page count.
- Ages are integers 0–130. Report year must match the canonical date.

Version 1 input remains `{schemaVersion:1,person,reports:{earlier,latest},markers:Marker[]}` with per-marker `earlier`/`latest` readings. Existing IDs are retained; absent IDs become `legacy-earlier`/`legacy-latest`. Chronological projection does not mutate canonical readings.

`src/lib/dataset.ts` validates/migrates inputs; `src/types.ts` describes normalized runtime types, where generated date labels are present. `src/lib/history.ts` projects selected pairs. `Reading.source*` fields are shown beside normalized values in details and retained in CSV/JSON exports. They document conversions performed by the export producer; this app does not perform or verify those conversions.

## Run and verify

Use Node.js 22 and npm, inside this folder:

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The production preview uses loopback. Browser tests start their own preview on port 5196 and use only fictional fixtures. Coverage includes all six demo pairs, sparse inputs, collection/report dates, same-day laboratories, unit mismatch safety, normalization provenance, legacy migration/storage, exports, print, keyboard/mobile controls and CSP.

## GitHub Pages

Publish **only this folder's contents as the repository root**, never its parent. Keep personal JSON exports, PDFs, environment files and credentials out of the repository.

1. Create/authenticate to the intended GitHub repository and use a `main` branch.
2. Review tracked files, including the intentionally public synthetic `src/data` and lockfile.
3. In **Settings → Pages**, choose **GitHub Actions**.
4. Push to `main` or manually run the supplied Pages workflow.
5. It performs `npm ci`, unit tests, production build, artifact upload and deployment to the `github-pages` environment. Repository content permission is read-only; only deployment receives Pages write and identity-token permissions.
6. Verify the deployment URL, sample selection, mobile layout and local import behavior.

Vite uses relative base `./`, a relative favicon and hash navigation for repository-subpath hosting. No secrets or environment variables are needed. Private exports should remain outside the repository; `.gitignore` also excludes `*.personal.json`, the conventional personal-export filename, PDFs and environment files. **Ignore rules do not replace a privacy audit.**

## Privacy boundary

Only synthetic data and generic code are published. No report uploads, accounts, analytics, external fonts or remote AI services are used. Production CSP includes `connect-src 'none'`, self-hosted script/font/style restrictions, blocked objects and blocked form submission. Development retains Vite's local hot-reload connection; use a production build for the locked-down hosted experience.

Hosting providers can log normal page requests. Optional educational links navigate to external sites without a referrer. CSP is defense in depth, not encryption or protection from a compromised origin or browser extension. Imported references and extraction accuracy are not independently verified. Original PDFs are never attached or linked; page numbers remain plain-text provenance.
