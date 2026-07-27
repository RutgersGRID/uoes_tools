# UOES Tools

A collection of single-file HTML tools helping faculty and staff (mostly
instructional designers) plan and build courses, with a focus on online
courses. Repo: `themaka/uoes_tools`. Each tool is one self-contained .html
file — inline CSS and JS, no build step, no external dependencies.

## Files

- `index.html` — landing page listing the tools. Add a `<li>` to the
  tool list whenever a new tool page is added.
- `learning_objectives.html` — Learning Objective Builder **v1**. Frozen:
  do not modify. It is being field-tested side by side against v2.
- `learning_objectives2.html` — Learning Objective Builder **v2**
  (page `<title>` says "v2"; the on-page heading does not). Currently out
  with instructional designers for feedback; a final version will be chosen
  after field testing. Not linked from index.html (shared directly).
- `course_planner.html` — Course Content Planner, a 5-step backwards
  design walkthrough (see below).
- `workload_estimator.html` — Course Workload Estimator, a JS port of an
  R/Shiny app (see below).

## Design system

Fonts and colors are consistent across pages:

- Font: Georgia, serif. Page background `#f4f7f9`, body text `#333`,
  muted text `#666` (or `#767676` for placeholder-ish text on white).
- **Rutgers Red `#CC0033`** — headers, primary buttons, links, accents.
  Hover/darker variant `#A30029`.
- **Rutgers Blue `#007FAC`** — card borders, input underlines, focus
  outlines, secondary buttons.
- **Light Blue `#DEF0F9`** — guidance panel backgrounds, focused-input
  wash, table/card header bands.
- **Mid Blue `#7DBFD6`** — thin borders, dividers. NOTE: Mid Blue fails
  the 3:1 non-text contrast requirement against white, so never use it
  alone for meaningful UI boundaries like input underlines (this is why
  input underlines use Rutgers Blue).
- White cards with `2px solid #007FAC` borders and `border-radius: 8px`.
- Content max-width: 750px on the objective builders and index page,
  900px on the planner, 1080px on the workload estimator (wider because
  it is a multi-column calculator).

## Accessibility conventions

- Every interactive element has a visible focus style:
  `outline: 2px solid #007FAC; outline-offset: 2px`.
- Generated inputs get `aria-label` (and `aria-description` for guidance
  text where used). Decorative hint labels under blanks are
  `aria-hidden="true"`.
- Result/output regions use `aria-live="polite"`; copy feedback uses a
  `role="status"` element with an `.sr-only` (visually hidden) class.
- Prefer real `<label for>` associations where a visible label exists
  (module cards in the planner do this; every input in the workload
  estimator does).
- Semantic HTML: `<main>`, `<section aria-labelledby>`, `<details>/<summary>`
  for collapsible guidance panels.

## Learning Objective Builder notes

Both versions build an ABCD-model objective (Audience, Behavior,
Condition, Degree) from a template string in the JS: `{placeholder}`
becomes an inline blank; `{label:Choice1|Choice2}` becomes a dropdown.
Blanks auto-grow while typing. Output is rendered with underlined,
labeled parts plus a plain-text copy button.

v2 differences (from instructional designer feedback):
- The Opener is no longer a separate field — the condition blank carries
  it (e.g. "Given a blank map of the US"). The word "opener" is
  deliberately absent from all guide/tooltip text; examples like
  "Given a map" convey the pattern instead.
- Degree is optional: hint reads "degree (optional)"; tooltip begins
  "Optional: How well they must perform. Examples can include measuring
  accuracy, completeness, time, quality, any required elements, or
  alignment with a rubric."
- An empty optional blank is omitted from the generated sentence (with
  punctuation cleanup — no stray space before the period). Empty
  *required* blanks still render as `______`.

## Course Content Planner notes

Content adapted for online/asynchronous delivery from CMU Eberly Center's
"Course Content & Schedule" guide (credited in the page footer), reframed
around backwards design. Five steps:

1. Decide where students should end up — course goals (links to the
   Learning Objective Builder) + "topic triage" (Essential / Supporting /
   Trim, with "coverage is the enemy" guidance).
2. Decide how you'll assess each goal — goals sync live from Step 1.
   Terminology is **assessment**, not "evidence", in all UI text — but the
   internal state field is still `evidence` for saved-data compatibility.
3. Design the learning activities — per goal, shows the goal + its
   assessment ("Assessed by: …", live-synced) and a blank for activities.
   Guidance: absorb / interact / produce mix, low-stakes practice first.
4. Choose a structure and teaching strategy — organizing-principle
   dropdown (each choice shows a description) + strategy textarea.
5. Map it onto your modules — one **card per module** (not a table):
   header bar with "Module N" + topic input; optional Objectives line;
   three-column grid Activities / Assessments / Due dates (stacks to one
   column under 640px); Materials at the bottom. Default 16 modules,
   min 1 / max 20; resizing preserves entered text.

Other behaviors to preserve:
- Auto-save to `localStorage` under key `uoes-course-planner`
  (debounced ~400ms, try/catch-wrapped). `load()` migrates older saves:
  goals gain `activities`; modules gain `objectives`, `assessments`,
  `duedates`. Never rename existing state fields without a migration.
- "Create My Course Plan" renders the plan (only filled-in fields; empty
  modules show "(not planned yet)"), with Copy-as-text and Print buttons.
- Print CSS shows only the generated plan. The hide rule must target
  `main > :not(#planWrap)` — an earlier `body > …` selector hid `<main>`
  itself and printed a blank page. Keep this in mind if restructuring.
- "Start over" clears storage after a `confirm()`.

## Workload Estimator notes

Port of the **Enhanced Course Workload Estimator** by Betsy Barre, Allen
Brown, and Justin Esarey (Wake Forest CAT / Rice CTE), originally an
R/Shiny app (`ui.R` + `server.R`). **Licensed CC BY-NC-SA 4.0** — this
port is a derivative work, so the footer must keep the author credits,
the link to the methodology page, and the same license. Non-commercial
only.

Why JS was the right call: the app is pure arithmetic over form values —
no R statistics, no server-side data — so it collapses into one static
HTML file with no Shiny server to host.

### Lookup tables

Two R arrays, transcribed into nested JS objects. R fills arrays
**column-major**, which is why the flat data vectors in `server.R` look
scrambled; the JS transcription was verified programmatically against an
independent column-major decode of the original vectors (45 checks).

- `PAGES_PER_HOUR[density][difficulty][purpose]` — 27 values, 67 down to 5
  pages/hour. R's dim order was `[difficulty, purpose, density]`.
- `HOURS_PER_PAGE[genre][drafting][density]` — 18 values, 0.75 to 10
  hours/page. R's dim order was `[density, drafting, genre]`.
- Discussion constants (from the code, not published anywhere): text posts
  at 250 words/hour; audio-video at 3 finished minutes/hour (i.e. 20 min
  of student work per finished minute).

### Deliberate departures from the original R

1. **Audio/video discussion formula unified.** `server.R` used
   `0.18x + x/6` (≈0.347 hr per A/V minute) in the Total output but `x/3`
   (≈0.333) in the Independent and Contact outputs, so Total ≠ Independent
   + Contact for A/V discussions. The port uses `x/3` everywhere. This is
   the *only* number that differs from the original, and only in A/V
   scenarios (~4% lower).
2. **"Independent" checkbox replaced with a two-option select.** In the R
   code, the checkbox labeled "Independent" put Other Assignments into the
   *contact* bucket when checked and *independent* when unchecked — the
   label read backwards. Replaced by an explicit
   "Independent work / Contact time with instructor" dropdown, defaulting
   to Independent, which preserves the original default behavior while
   fixing the label.
3. **Divide-by-zero guards.** `classweeks` < 1 or a manual reading rate of
   0 produced `Inf`/`NaN` in R. The port clamps these to 0 and shows an
   inline warning.
4. **Reading purpose label** is "Understand" in the UI (matching the
   original dropdown) even though the R array dimname said "Learn".

### Added features (not in the original)

- Per-category breakdown table with hours, share of total, and bar,
  tagged Independent vs. Contact.
- Auto-save to `localStorage` key `uoes-workload-estimator` (debounced
  400ms, try/catch-wrapped). `load()` tolerates missing keys and migrates
  an older `other_engage` boolean to the `other_bucket` select.
- "Create printable summary" / "Copy as text" / "Print" / "Start over".
  Print CSS uses the `main > :not(#reportWrap)` pattern (same lesson as
  the planner).
- Collapsible `<details>` methodology panels under Reading, Writing, and
  Discussion, summarizing the published rationale (Rayner's ~300 wpm
  reading synthesis; Torrance et al.'s 493-student essay study, which the
  original authors themselves flag as speculative). The discussion panel
  states plainly that those assumptions come from the code, not the
  published methodology page.

### Methodology sources

The published details page
(<https://cat.wfu.edu/resources/workload/estimationdetails/>) covers
**reading and writing only**. There is no public write-up for discussion
posts, videos, exams, other assignments, or synchronous meetings — those
were reverse-engineered from `server.R`.

## Testing

Changes were verified with headless Chromium (playwright-core) checks:
form rendering, live sync between steps, plan generation, localStorage
persistence/migration, and print-to-PDF output. Worth repeating for
anything touching the planner's state handling or print CSS.

For the workload estimator specifically, a `verify.js` harness runs 123
checks: all 45 lookup-table cells against an independent decode of the R
arrays, 11 scenarios compared against a faithful line-by-line
reimplementation of the original `server.R` math, Total = Independent +
Contact, divide-by-zero guards, conditional panel visibility,
localStorage round-trip and migration, report generation, print-PDF
non-blankness, and label/aria coverage. Re-run it after any math change.

## Current status (July 2026)

- v2 objective builder is in field testing; more feedback expected.
- course_planner.html's latest version (module-card Step 5) was delivered
  via chat during a session when the synced computer was offline — verify
  the repo copy includes the module cards before editing.
- workload_estimator.html added July 27, 2026 and linked from index.html.
  Confirm the CC BY-NC-SA attribution wording in the footer is acceptable
  before publishing.
