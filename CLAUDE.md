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
- `credit_hour_planner.html` — Credit Hour Planner, a JS port of a
  two-sheet Excel workbook (see below).

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

## Credit Hour Planner notes

Port of the **Planning Time Calculator (Rutgers, FOR FACULTY DIY Version)**,
an Excel workbook with two sheets, initially developed by **Ruth Ronan** at
Rutgers University (created 2018, last modified 2020). The sheets carry an
embedded CC BY-NC-SA badge, so this port is a derivative work: the footer
must keep the Ruth Ronan credit, the Workload Estimator authors, and the
same license. Credit wording confirmed by Maka July 27, 2026 — do not
reword it without asking.

Both sheets were password-protected (`Rutgers`); irrelevant in the port.

### Sheet 1 → "Weekly time budget"

Three inputs (semester weeks, Carnegie credits, study hours per credit)
drive one calculation. The original had two parallel blocks —
fully-online/traditional and blended/hybrid — computed side by side. The
port makes it a **course-format choice at the top of the page** instead,
which also disambiguates the module budget.

The math, from the blended block (rows 19–23), generalizes to both:

- `acceleration = 15 / weeks`. A course must deliver the same total hours
  however long the term runs, so a 7-week term has a rate of ~2.14.
- `MINUTES_PER_CREDIT_HOUR = 50`; one credit hour = one 50-minute period
  of instruction per week.
- Face-to-face minutes = `50 × f2f`, **never accelerated** (the original
  hardcodes `F20 = 1`) — meetings run at their scheduled length.
- Online instructional = `50 × accel × (credits − f2f) + (50 × accel × f2f
  − f2fMinutes)`. The second term pushes the accelerated instructional
  time the meetings don't cover into the online total.
- Studying = `50 × accel × credits × study`.

**The instructional row is seat time, and users do not infer that.** Maka
asked whether it meant face-to-face class time — it does, in a traditional
course (3 credits = 150 min/wk = three 50-minute periods); in a fully
online course it is the asynchronous equivalent, and in a blended course it
is the seat time the meetings don't cover. That ambiguity is inherent: the
original merged "traditional" and "fully online" into one block precisely
because the math is identical and only the delivery differs. Two things now
carry the explanation and should be kept: an italic sub-label on each tile
(`#desc-instr`, swapped by format, plus a static one on the face-to-face
tile) and a `<details open>` panel, "What counts as instructional time", in
the *How this is calculated* card. The harness asserts both.

Setting `f2f = 0` makes the blended block identical to the fully-online
block, so the port uses **one code path** for both formats. Invariant worth
keeping: semester hours always equal `12.5 × credits × (1 + study)`,
independent of weeks and format. The harness asserts this on every case.

### Sheet 2 → "Module time planner"

A module is one week. The budget it compares against is
`online instructional + studying` (sheet 2's `B3` = `B23 + B24`), which
excludes face-to-face time — correct for both formats.

15 learning activities and 10 assessment activities, each with a suggested
time. Those suggestions lived in Excel **data-validation input messages** —
`<dataValidation showInputMessage="1" promptTitle="Blog" prompt="1 hour
suggested" sqref="B15"/>` — with no `type`/`operator`/`formula`, so they
imposed no constraint and were invisible until you clicked the cell. They
are surfaced here as hint text under each label. The suggestion values live
in the `sug` field of the `LEARN` / `ASSESS` arrays in the JS.

Readings and Writing assignments are derived rows, not inputs — they mirror
the two reading/writing hour fields and render as read-only `<output>` with
no underline (an underline would read as editable, and Mid Blue fails
contrast anyway).

### Deliberate departures from the original workbook

1. **The 50/60 scaling on reading and writing is gone.** Sheet 2 computed
   `(B9 × 50) / 60` for readings and the same for writing, which shrank
   both by 17%. Everything else on that sheet is plain clock hours and the
   workload estimator reports clock hours, so the port adds them at face
   value. Confirmed with Maka before changing. A `<details>` panel on the
   Reading & writing card explains it.
2. **Face-to-face hours are clamped to the course's credit hours.** The
   original let `f2f > credits` produce a negative online instructional
   total. The port clamps and shows an inline warning.
3. **`weeks < 1` warns instead of failing silently.** The original wrapped
   the acceleration rate in `IFERROR(15/B4, 0)`, which quietly produced a
   zero-hour course.
4. **Typos fixed:** "Poscast" → Podcast (a validation prompt), and
   "additonal" (sheet 1, A23).

### Do not add a bulk "fill with suggested times" control

An earlier draft had a "Fill blanks with suggested times" button. Maka
caught the result in testing: it filled all 21 suggestions at once for a
planned total of **32.80 hours against a 7.50-hour budget**, flagged as
25.30 hours over. The ported math was correct — the button was wrong.

Ruth's directions box says the suggestions are read one at a time:
*"Suggested times are provided when you click on the cell for each
category."* Nothing in the workbook sums them; `B30` and `E25` total only
what the user types. A bulk control silently reframes 21 independent
per-activity hints as a menu to take wholesale, and no real module contains
a blog *and* a case study *and* experiential learning *and* a webinar *and*
a wiki *and* seven kinds of assessment.

The button is gone. In its place, a line above the activity cards says the
suggestions are not a checklist. `verify_credit_hour_planner.js` has a
regression guard asserting no bulk-apply control exists.

**Open question — revisit with Maka.** How to give instructors genuinely
useful guidance on activity times without implying "use all of these."
Ideas not yet evaluated: per-row click-to-apply; typical module *patterns*
(e.g. a reading-and-discussion week vs. a project week) that fill a
coherent set; showing each suggestion as a share of the weekly budget; or
a running "you have N hours left" indicator beside the inputs as they are
filled. Nothing here is decided.

### Cross-links

Sheet 2 had a red button to <https://cte.rice.edu/workload> for estimating
reading and writing time — the same tool `workload_estimator.html` ports.
The page links to the **local port as primary**, with the Rice original
credited alongside. Note this means `credit_hour_planner.html` depends on
`workload_estimator.html`, which is not yet cleared for publishing.

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

For the credit hour planner, `test/verify_credit_hour_planner.js` runs 292
checks: 18 scenarios against an independent transcription of the workbook's
cell formulas, the Carnegie invariant, blended-with-zero-f2f equivalence,
the non-accelerating face-to-face rule, all three guards, module totals and
the budget comparison, over/under-budget styling, conditional visibility,
the no-bulk-suggestions regression guard, the instructional-time explainer,
localStorage round-trip and partial/corrupt
saves, "Start over", report and copy text, print-PDF non-blankness,
label/aria coverage, computed focus outlines, the design tokens, and the
Mid-Blue-underline prohibition. Both harnesses need
`npm install playwright-core`; launch with
`executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"` or
wherever Chromium lives locally.

## Current status (July 2026)

- v2 objective builder is in field testing; more feedback expected.
- course_planner.html's latest version (module-card Step 5) was delivered
  via chat during a session when the synced computer was offline — verify
  the repo copy includes the module cards before editing.
- workload_estimator.html added July 27, 2026 and linked from index.html.
  **Not cleared for publishing yet.** The CC BY-NC-SA footer wording reads
  fine to Maka but is awaiting sign-off from institutional stakeholders.
  Do not push it live, and do not change the credit/license wording in the
  meantime — if it comes back with required edits, that is the version to
  apply.
- credit_hour_planner.html added July 27, 2026 and linked from index.html.
  Footer credit settled: "Adapted from the Planning Time Calculator,
  initially developed by Ruth Ronan at Rutgers University."
  **Still not cleared for publishing**, for one remaining reason: it links
  to workload_estimator.html as its reading/writing tool, so publishing it
  first would expose that page before its CC BY-NC-SA sign-off lands. Ship
  the two together.
