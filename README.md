# Wellnote public frontend + local health journal

A standalone React + TypeScript + Vite health journal with a safe public default. **Only synthetic data is published.** Alex Morgan and the bundled results are invented illustrations, not redacted or anonymized patient records. You can use your own data on the hosted page by loading a local JSON export; it is never uploaded. App flags and educational topics are not diagnoses or prescriptions.

## Included

- 25 synthetic measurements across 8 categories, for 14 February 2024 and 14 February 2025.
- Comparison and single-report views, category/search/status/trend filters, sorting and pagination.
- Detail dialogs, report-specific reference changes, censored bounds, a strict cutoff, qualitative results, and missing examples.
- General educational guidance without prescriptions or supplement doses.
- Filtered, labeled synthetic CSV exports, printable summaries, and downloadable synthetic report JSON.
- A permanent demo/local-data notice, local fonts, no accounts, uploads, analytics, or remote AI calls.
- A prominent **Load my health data** control, strict JSON validation, actionable errors, and optional unencrypted browser storage requiring explicit consent.

The example has 24 results per report, 23 shared measurements, a latest-only magnesium result, and an earlier-only sample volume. References are illustrative rather than clinical standards.

## Use your data on the published page

1. Prepare a version 1 Wellnote JSON export locally, outside this repository. Do not upload it to GitHub or a hosting service.
2. Open the website and choose **Load my health data**. Only `.json` files up to 2 MiB are accepted; this does not parse PDFs.
3. The file is read with `File.text()` and validated before replacing the synthetic dataset. Invalid input leaves the current dashboard unchanged.
4. **Remember the next import** is off by default. Leave it off for memory-only use: reload or close the page to return to the demo. If explicitly enabled before import, data is saved only in this browser's `localStorage` and restored on the same site path.
5. **Clear personal data / return to demo** removes the app's in-memory and saved copy and resets filters/dialogs. It does not delete the original JSON file or previous downloads. Loading another file without Remember also removes any previous saved copy.

Browser storage is **not encrypted**. Other code on the same origin (including other repository sites under the same GitHub Pages hostname) can access it. A path-scoped storage key prevents accidental mixing, not malicious access. Avoid shared devices and use trusted hosting and browsers. Private browsing/storage restrictions may prevent remembering; the app explains errors and supports memory-only import.

Imported views use live profile, report dates, readings, references and counts through React context. Guidance topics are shown only for supported, currently flagged latest measurements; no topic means neither normal health nor absence of other flags. Original PDFs are never attached or linked; optional page numbers are plain-text provenance. Imported references and transcription accuracy are not independently verified.

### Portable JSON schema (version 1)

The top-level object has exactly these keys:

```ts
{
  schemaVersion: 1,
  person: {
    name: string,
    initials: string,
    firstName?: string,
    latestReportedAge?: number,
    reportedSex?: string
  },
  reports: {
    earlier: ReportMetadata,
    latest: ReportMetadata
  },
  markers: Marker[]
}

type ReportMetadata = {
  date: string;       // valid YYYY-MM-DD; latest must be after earlier
  label: string;
  fullDate: string;
  shortDate: string;
  id?: string;
  year?: number | string; // matching year; a four-digit string is normalized to a number
  pages?: number;     // integer 1–1000
  filename?: string;  // optional metadata only, never turned into a link
  age?: number;       // integer 0–130
}
```

`Marker`, `Reading`, and reference types are defined in `src/types.ts`:

- Marker: `id`, `name`, `group`, `unit`, `priority`, `earlier`, `latest`, optional `note`.
- `group`: `heart | nutrition | blood | liver | kidney | glucose | thyroid | urine`.
- `priority`: integer 0–10000. Marker IDs are unique lowercase letters/digits separated by hyphens.
- Reading: `{raw: string, sourceLabel: string, reference: Reference, page?: number}`, or `null` when not reported. Each marker needs at least one reading. Optional page must be within its report's page count, if supplied.
- Numeric reference: `{kind:"numeric", label:string, min?:number, max?:number, minExclusive?:boolean, maxExclusive?:boolean, nilIsZero?:boolean}`. At least one finite bound is required; min cannot exceed max.
- Text reference: `{kind:"text", label:string, accepted:string[]}` with 1–30 accepted strings.
- Context reference: `{kind:"context", label:string}` for unscored measurements.
- Maximum 500 markers. Unknown properties, duplicate IDs, invalid dates/types, oversized text, malformed references, and missing required IDs are rejected with a field-specific error.

Required IDs for the comparison interface:

```text
vitamin-d, vitamin-b12, iron, magnesium, total-cholesterol, ldl, hdl,
non-hdl, hdl-ldl-ratio, triglycerides, hscrp, ggt, lymphocytes
```

Other IDs are optional. Do not invent a result to satisfy the schema: one of a marker's readings may be `null`, but if a required marker is entirely absent this version cannot import the dataset. The error names every missing ID.

**Download JSON template** provides a complete valid synthetic dataset. Per-report JSON downloads are human-readable summaries, not full portable datasets; use the template or a full version 1 local export for importing. Keep personal exports outside this repository; names such as `*.personal.json` and `wellnote-personal-data.json` are ignored as an additional guard, not a substitute for review.

## Run and verify

Use Node.js 22 and npm. Run all commands **inside this folder**:

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` serves the production build on loopback. End-to-end tests start their own preview server on port 5196. The browser installation is only needed once. No secrets or environment variables are required.

## Publish to GitHub Pages

Publish **only the contents of this `wellnote-demo` folder as the repository root**, not its parent folder. Review all tracked files before publishing. Never include personal reports, patient data, PDFs, build artifacts, or credentials.

1. Authenticate to GitHub and create a repository for this synthetic demo.
2. Add only this folder's contents, including its synthetic `src/data` files and `package-lock.json`, to the repository. Use a `main` branch.
3. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
4. Push to `main` or run the supplied workflow manually.
5. The workflow installs from the lockfile, runs unit tests, builds, uploads `dist`, and deploys to the `github-pages` environment. Its deployment job can write Pages and obtain an identity token; repository contents are read-only.
6. Open the deployment URL and verify navigation, downloads, and the demo banner.

Vite uses relative base `./`, a relative favicon, and hash navigation so repository-subpath Pages sites work. If publishing to a non-`main` default branch, update the workflow trigger. Pages availability and organization policies depend on the GitHub account.

## Privacy boundary

This repository must contain only generic UI and newly invented fixtures. No original reports, private metadata, source filenames, personal identifiers, or extracted real results are required or included. `.gitignore` excludes PDFs and environment files, but **ignore rules are not a privacy audit**. Do not add real data even locally to a copy intended for publication.

All public assets can be read by any visitor. Hosting providers may log routine requests; optional educational links leave this site. Exports are generated in the browser. Personal imports are never uploaded and are saved in browser storage only with explicit consent. Production HTML has a Content Security Policy with `connect-src 'none'`, self-hosted scripts/fonts/styles, blocked objects and blocked form submission. Development retains Vite's local hot-reload connection; use the production build for the locked-down hosted experience.

The source fixtures live in `src/data/markers.ts` and `src/data/reports.ts`; they are intentionally tracked for a reproducible build. Local import adds no server persistence or authentication. CSP is defense in depth, not encryption or protection from a compromised hosting origin/browser extension.
