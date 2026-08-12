# UOES Tools

A collection of single-file HTML tools helping faculty and staff (mostly
instructional designers) plan and build courses, with a focus on online
courses. Repo: `themaka/uoes_tools`. Each tool is one .html file with its
JS inline — no build step, no external dependencies, no framework. CSS
lives in `css/` and is linked (see **Stylesheets** below); the two frozen
v1 pages keep their CSS inline.

## Files

**Naming convention:** the live version of a tool has the plain name;
the superseded one gets a `_v1` suffix. Both planners and both objective
builders were renamed to this scheme on August 12, 2026 — before that,
`learning_objectives.html` meant v1 and `learning_objectives2.html` meant
v2, which is the opposite of what it means now. Older notes in this file
that name a file may predate the rename; trust this list.

- `index.html` — landing page listing the tools. Add a `<li>` to the
  tool list whenever a new tool page is added. It lists one entry per
  tool, pointing at the live version — the frozen `_v1` pages are not
  linked.
- `learning_objectives.html` — Learning Objective Builder **v2**, the live
  one (page `<title>` still says "v2"; the on-page heading does not).
  Out with instructional designers for feedback; a final version will be
  chosen after field testing.
- `learning_objectives_v1.html` — Learning Objective Builder **v1**.
  Frozen: do not modify. Field-tested side by side against v2.
- `blooms_verbs.html` — Bloom's Taxonomy Verbs, a standalone reference
  sheet linked from the objective builder (see below). Not listed on
  index.html, on purpose.
- `course_planner.html` — Course Content Planner **v2**, the live one: a
  4-step revision built from instructional designer feedback (see below).
- `course_planner_v1.html` — Course Content Planner **v1**, a 5-step
  backwards design walkthrough (see below). Frozen while v2 is compared
  against it.
- `workload_estimator.html` — Course Workload Estimator, a JS port of an
  R/Shiny app (see below).
- `credit_hour_planner.html` — Credit Hour Planner, a JS port of a
  two-sheet Excel workbook (see below).

## Stylesheets

CSS was moved out of the pages on August 12, 2026. Each page links its
sheets in cascade order, most general first:

| Page | Sheets |
| --- | --- |
| `index.html` | `base` + `index` |
| `learning_objectives.html` | `base` + `document` + `learning_objectives` |
| `blooms_verbs.html` | `base` + `document` + `blooms_verbs` |
| `course_planner.html` | `base` + `document` + `course_planner` |
| `credit_hour_planner.html` | `base` + `calculator` + `credit_hour_planner` |
| `workload_estimator.html` | `base` + `calculator` + `workload_estimator` |

- **`css/base.css`** — the `:root` design tokens, the `.sr-only` helper,
  `[hidden]`, and the one focus-visibility rule. Loaded by every page and
  always first. Change a brand colour here and it changes everywhere.
- **`css/document.css`** — the shell for the reading-width pages
  (`body`, centred `h1`, `.subtitle`, the `.guide` panel). The measure is
  `var(--content-width, 750px)`; the planner sets `--content-width: 900px`
  in its own sheet.
- **`css/calculator.css`** — the shell for the two wide calculators
  (header, section headings, `.card`, number/select fields, `details`
  panels, `.results`/`.total` tiles, the breakdown table, `.warn`,
  buttons, footer, print). Both calculators are ~90% this file.
- **`css/<page>.css`** — only what is unique to that page.

Rules of thumb when editing:

- Put a rule in the shared sheet only if both consumers want the *same*
  value. Where they differ (e.g. `.totals` column width, `header p`
  max-width) the shared sheet omits the property and each page sets it.
- Do not restate the focus outline in a page sheet — `base.css` owns it.
  A page may add a background wash on `:focus`, nothing more.
- Never write a brand hex code outside `base.css`; use the token.
  `test/verify_css_extraction.js` fails the build if you do.

**`learning_objectives_v1.html` and `course_planner_v1.html` still carry
inline CSS on purpose.** They are the frozen field-testing baselines, and
they must keep rendering exactly as designers saw them however `css/`
changes underneath. Do not convert them while the comparisons are live.

## Design system

Fonts and colors are consistent across pages. The values below are the
tokens defined in `css/base.css`; prefer `var(--red)` over `#CC0033` in
any new rule.

- Font: Georgia, serif. Page background `#f4f7f9` (`--bg`), body text
  `#333` (`--text`), muted text `#666` (`--muted`) — or `#767676`
  (`--muted-light`) for placeholder-ish text on white.
- **Rutgers Red `#CC0033`** (`--red`) — headers, primary buttons, links,
  accents. Hover/darker variant `#A30029` (`--red-dark`). Also the
  `accent-color` on checkboxes.
- **Rutgers Blue `#007FAC`** (`--blue`) — card borders, input underlines,
  focus outlines, secondary buttons.
- **Light Blue `#DEF0F9`** (`--blue-light`) — guidance panel backgrounds,
  focused-input wash, table/card header bands.
- **Mid Blue `#7DBFD6`** (`--blue-mid`) — thin borders, dividers. NOTE:
  Mid Blue fails the 3:1 non-text contrast requirement against white, so
  never use it alone for meaningful UI boundaries like input underlines
  (this is why input underlines use Rutgers Blue).
- White cards (`--surface`) with `2px solid var(--blue)` borders and
  `border-radius: 8px`.
- Supporting greys, all in `base.css`: `--text-mid` `#444` (step
  lead-ins), `--text-soft` `#555`, `--rule` `#999` and `--rule-light`
  `#ccc` (form control borders on the document-style pages).
- Red-tinted washes: `--red-wash` `#fff4f6` (warning callouts),
  `--red-tint` `#ffe3ea` (the "contact time" tag), `--red-pale` `#ffdbe4`
  (sub-label on a solid red tile).
- Content max-width: 750px on the objective builders and index page,
  900px on the planner, 1080px on the workload estimator (wider because
  it is a multi-column calculator). On the two `document.css` pages this
  is the `--content-width` token.

## Accessibility conventions

- Every interactive element has a visible focus style:
  `outline: 2px solid #007FAC; outline-offset: 2px`. This lives in
  `css/base.css` as a single rule covering every control, and
  `verify_css_extraction.js` focuses each visible control on each page
  and asserts the resolved outline. Note it keys off `:focus`, not
  `:focus-visible`, so the ring shows on mouse click too — that has
  always been the behaviour on the planner and the calculators, and
  `learning_objectives.html` (v2) was brought into line on August 12, 2026.
- Generated inputs get `aria-label` (and `aria-description` for guidance
  text where used). Decorative hint labels under blanks are
  `aria-hidden="true"`.
- Result/output regions use `aria-live="polite"`; copy feedback uses a
  `role="status"` element with an `.sr-only` (visually hidden) class.
- Prefer real `<label for>` associations where a visible label exists
  (module cards in the planner do this; every input in the workload
  estimator does).
- Where a control's visible label has to be abbreviated for space, the
  accessible name must still *contain* that visible text — see the G1/G2
  alignment checkboxes in course planner v2, whose names are
  "G1: <goal text>".
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
- The `<dl>` in the "What goes in each blank?" panel runs Condition,
  Audience, Behavior, Degree — sentence order, not ABCD order.

## Bloom's Taxonomy Verbs page

`blooms_verbs.html` — a standalone reference sheet, linked from the
**Behavior** entry in the objective builder's "What goes in each blank?"
panel (`target="_blank"`). It started as a second guidance panel inside
the builder on August 12, 2026 and was pulled out into its own page the
same day, because the verb list is long enough to swamp the tool it was
supposed to support.

**It is deliberately not listed on index.html.** It is a reference sheet
supporting one tool, not a tool in its own right; the home page keeps
listing four tools. Its only navigation is the footer link back to the
builder — worth remembering if it ever gets linked from somewhere else.

### Sources

Everything on the page comes from two papers, cited at the foot of it:

> Newton, P. M., Da Silva, A., & Peters, L. G. (2020). A pragmatic master
> list of action verbs for Bloom's Taxonomy. *Frontiers in Education*, 5,
> 107. <https://doi.org/10.3389/feduc.2020.00107>

> Krathwohl, D. R. (2002). A revision of Bloom's taxonomy: An overview.
> *Theory Into Practice*, 41(4), 212–218.

Newton et al. surveyed 47 verb lists from 35 UK higher-education sources
and found very little agreement between them. Their master list keeps
only the verbs appearing in more than half of those lists *and*
consistently placed at the same tier. The page reproduces that list.
**These are the paper's verbs, not a house list — don't add, drop or
re-tier one without a source.** Krathwohl 2002 supplies the revised tier
names (Remember, Understand, Apply, Analyze, Evaluate, Create), which the
page shows alongside Bloom's originals.

Two things on the page look like mistakes and are not:

- **`explain`, `select` and `choose` appear on both the master list and
  the avoid list.** That is Newton et al.'s own finding. The
  `.avoid-note` under the callout says why — institutions place the same
  verb at different tiers. Keep that note if the lists stay.
- **The tiers run Evaluation *then* Synthesis.** That is the revised
  order (Evaluate 5th, Create 6th). Bloom's original had them the other
  way round — Synthesis 5th, Evaluation 6th — so with both naming schemes
  shown per row, "lowest to highest" is only true of the revised scheme.
  The `.note` callout under the lead paragraph states this. Do not
  "fix" the order without also fixing that callout.

### Styling

`css/blooms_verbs.css`, on top of `base.css` + `document.css`. The tier
list is a `<dl>` laid out as a two-column grid (`240px` for the tier name,
the rest for its verbs) inside one white card, stacking to a single column
under 640px. The level numbers 1–6 are a **CSS counter on `dt::before`**,
not markup — decorative, since a sighted reader infers the order from
position and the lead paragraph states it in words for everyone else. The
two callouts intentionally echo the calculators: `.avoid` is the red
`.warn` treatment, `.note` its Light Blue counterpart.

## Course Content Planner notes (v1)

Content adapted for online/asynchronous delivery from CMU Eberly Center's
"Course Content & Schedule" guide (credited in the page footer), reframed
around backwards design. Five steps in v1:

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

## Course Content Planner v2 notes

`course_planner.html` (then named `course_planner_v2.html`), created
July 29, 2026 from instructional
designer feedback on v1. v1 stays in the repo unchanged so the two can be
compared side by side. The page `<title>` reads "Course Content Planner
(v2)"; the on-page `<h1>` does not — same convention as the objective
builders.

**Storage is deliberately separate.** v2 saves to
`uoes-course-planner-v2`, so an instructor can fill in both tools without
one clobbering the other. This matters because v2's module shape differs
from v1's.

### The four steps

1. **Decide what your students will take away from your course** (was
   "Decide where students should end up"). The Learning Objective Builder
   link was removed from this step; the goals lead-in reads "What should
   students be able to do by the end of the course." — punctuated as a
   statement, per Maka's wording, and set at 24px. Topic triage unchanged.
2. **Decide how you'll assess each course goal** (was "…each goal").
   Still the per-goal assessment list, live-synced from Step 1.
3. Was Step 4 — Choose a structure and teaching strategy (optional).
   Unchanged apart from the number.
4. Was Step 5 — Map it onto your modules.

**The big shift in v2 is that the module is where the work happens.**
Step 4 walks through objectives → assessments → activities *at the module
level*, then presents the module cards. Its order is:

- lead paragraph ("across the modules (weeks)")
- "Scheduling tips for online courses" panel
- **Create Learning Objectives for each module.** — carries the Learning
  Objective Builder link, pointed at the module Objectives fields
- **Decide how you will assess each module's learning objectives.** —
  with a copy of the "What makes a good assessment online?" panel
- **Create Activities for each learning objective.** — with the
  "Choosing activities that prepare students" panel
- **Module cards** — the goal key, then the cards

The "What makes a good assessment online?" panel appears **twice on
purpose**: once in Step 2 for course goals, once in Step 4 for module
objectives. Do not dedupe it.

v1's Step 3 (Design the learning activities) is gone entirely — both the
standalone step and, as of the same day, the per-goal activities list that
had been folded into Step 4. Goals no longer carry an `activities` field;
`load()` deletes it from legacy saves. Activities are a module-card field
only.

### Module cards in v2

Card order is **Objectives (a list) → Materials & resources → Assessments +
Activities**.

- **Due dates is removed.** The `duedates` state field is deleted in
  `load()` rather than carried forward, and it is gone from `blankModule`
  and from the generated plan.
- Materials & resources moved **above** the two-column row.
- The two-column row is `.two-col` (`1fr 1fr`), replacing v1's
  `.three-col`. **Assessments is the left column, Activities the right** —
  swapped July 29, 2026, so the card reads assess-then-practice, matching
  the order of the Step 4 headings above it. Still stacks to one column
  under 640px.
- Objectives is no longer a single optional text field. It is a
  **repeatable list**, added and removed the same way course goals are
  ("+ Add an objective" plus a × on each row). A module always keeps at
  least one row — removing the last one re-adds a blank.

### Goal alignment

Each module objective row carries a narrow **Alignment** column on its
right: one checkbox per *written* course goal, so an instructor can tick
which course goals that objective serves.

- Goals are numbered **G1, G2, …** in Step 1 order, counting only goals
  that actually have text. `numberedGoals()` is the single source of that
  numbering; everything else derives from it.
- Checkbox chips show just "G1"/"G2" because the column is deliberately
  narrow (`150px` against `minmax(0, 1fr)` for the objective field). The
  full goal text rides along in the `title` and the `aria-label`, which
  reads "G1: <goal text>" — the visible label is a substring of the
  accessible name, which is what WCAG label-in-name requires. The cluster
  is a `role="group"` labelled "Course goals that objective N of module M
  aligns with".
- A **goal key** (`#goalLegend`) sits between the "Module cards" heading
  and the cards, listing "G1 — <text> · G2 — <text> …". Keep it: the chips
  are unreadable without it.
- State: `module.objectives` is `[{text, align: [goalId, …]}]`. Alignments
  store **goal ids, not numbers**, so renumbering after a deletion cannot
  corrupt them.
- `pruneAlignments()` drops ids for deleted goals — called on goal removal
  and on `load()`.
- Re-render rules, which matter for not stealing focus mid-keystroke:
  typing in a goal only relabels the existing checkboxes (via
  `[data-goal-check]`) and redraws the key. A full `renderModules()` fires
  only when a goal crosses the empty/non-empty boundary, or on goal
  add/remove — that is when the *set* of checkboxes changes.
- Under 640px the row stacks: objective + × on the first line, the
  checkboxes on a second line prefixed by a visible "Alignment:"
  (`.align-mini`), and the `.obj-head` collapses to just "Objectives".
- **Watch in field testing:** with more than about four course goals the
  chip row wraps to several lines inside that 150px column, making tall
  objective rows. If designers routinely set that many goals, the column
  probably wants to become a dropdown or a full-width strip.

### v2 plan output

- Heading is "Course goals & assessments" — there is no per-goal
  activities line any more.
- Course goals are printed with their numbers: "G1 — Analyze a food web".
- Module objectives print as one line, semicolon-separated, each tagged:
  `Objectives: Identify trophic levels [aligns with G1]; Trace energy
  through a web [aligns with G1, G2]`. Tags are emitted in goal order,
  not click order.
- Module fields print in the same order as the card: Objectives,
  Materials, Assessments, Activities. Keep the two in step if either
  changes.

### Migration

`load()` in v2 accepts v1-shaped saves: a string `objectives` becomes a
one-row list, a missing or non-array `objectives` becomes a single blank
row, string rows become `{text, align: []}`, `duedates` is deleted, and a
goal's `activities` field is deleted. Everything else — auto-save
debounce, print CSS, copy-as-text, "Start over", topic triage, the
organizing-principle descriptions, the CMU Eberly Center footer credit —
is unchanged from v1.

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
tile) and a `<details>` panel, "What counts as instructional time", in the
*How this is calculated* card. The harness asserts both exist.

The panel was `<details open>` at first; **Maka collapsed it on August 12,
2026**, so the tile sub-labels now carry the explanation on first read and
the panel is there for anyone who wants the detail. The harness no longer
asserts an open/closed state — only that the panel exists. If this turns
out to leave people reading the instructional row as face-to-face class
time, reopening it is the cheap fix.

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

For the credit hour planner, `test/verify_credit_hour_planner.js` runs 291
checks: 18 scenarios against an independent transcription of the workbook's
cell formulas, the Carnegie invariant, blended-with-zero-f2f equivalence,
the non-accelerating face-to-face rule, all three guards, module totals and
the budget comparison, over/under-budget styling, conditional visibility,
the no-bulk-suggestions regression guard, the instructional-time explainer,
localStorage round-trip and partial/corrupt
saves, "Start over", report and copy text, print-PDF non-blankness,
label/aria coverage, computed focus outlines, the design tokens, and the
Mid-Blue-underline prohibition.

For the course planner v2, `test/verify_course_planner_v2.js` runs 96
checks: the four step headings and badge numbers, the reworded Step 1 and
Step 2 text, the Learning Objective Builder link appearing exactly once and
only in Step 4, the absence of the old per-goal activities list, module
card row order (Objectives, Materials, then Assessments left of
Activities), the absence of any due-date control, label/aria coverage, the
focus outline, and live sync of goal text into Step 2 and the goal key.

Alignment is covered specifically: the goal key's empty and populated
states, checkboxes appearing the moment a goal is first written and
disappearing when it is cleared, chip text being exactly G1/G2, accessible
names containing the visible chip text, the `role="group"` label, live
relabeling when a goal is reworded, adding and removing objective rows,
per-objective alignment saved as goal ids, unticking, pruning and
renumbering after a goal is deleted (surviving ticks must stay ticked), and
the guarantee that a module never drops to zero objective rows.

Plus: saving under the v2 key and *not* the v1 key, round-trip, migration
of a v1-shaped save (string `objectives` → one row, `duedates` and goal
`activities` dropped), corrupt-save recovery, plan generation with
G-number tags and field ordering, print-PDF non-blankness and print-CSS
visibility, and a guard that `course_planner_v1.html` is still untouched
(5 steps, due dates, single objectives field, v1 storage key).

For the stylesheets, `test/verify_css_extraction.js` runs 120 checks: each
converted page links exactly the expected sheets in the expected order
with `base.css` first, every sheet actually parses (a 404 or a typo'd
`href` yields zero rules and fails), no inline `<style>` block survives,
all eight design tokens resolve on every page, every *visible* focusable
control resolves the 2px Rutgers Blue outline, `.sr-only` is still clipped
to 1×1, each print sheet still hides `main > :not(#…Wrap)`, the two frozen
v1 pages still have inline CSS and no `css/` link, and no page-level sheet
contains a raw brand hex code. Re-run it after touching anything in `css/`.

All harnesses need `npm install playwright-core`; launch with
`executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"` or
wherever Chromium lives locally. The two harnesses that read `cssRules`
also need `args: ["--allow-file-access-from-files"]`, because Chromium
will not expose the rules of a `file://` stylesheet without it — this is
new since the CSS moved out of the pages.

**Note on the harness filenames:** `verify_course_planner_v2.js` still
resolves `course_planner_v2.html` (v2) and `course_planner.html` (v1)
relative to `test/`, which no longer matches the repo — v2 is now
`course_planner.html` and v1 is `course_planner_v1.html`, and both live
one directory up. The harness needs its paths corrected; it was run for
the CSS work against symlinks supplying the old names.

## Current status (August 2026)

- **Files renamed to the live/`_v1` scheme on August 12, 2026** (see
  **Files**), and index.html trimmed to one link per tool. Anything
  written before that date and not since corrected may still use the old
  names.
- **Bloom's Taxonomy Verbs moved to its own page**, `blooms_verbs.html`
  (August 12, 2026). It was briefly a second panel inside the objective
  builder; the builder now links to it from the Behavior guidance. Two
  content corrections were made when it was styled: the lead had
  attributed "A Revision of Bloom's Taxonomy: An Overview" to Anderson
  and Krathwohl (2001) when it is Krathwohl alone (2002), and the tier
  order needed the caveat callout about the two schemes disagreeing on
  the top two tiers. See the Bloom's Taxonomy Verbs page notes.
- **CSS moved into `css/` on August 12, 2026** (see **Stylesheets**).
  Verified as a pure refactor: every converted page renders pixel-identical
  to its inline-CSS predecessor at 1280px and 600px, in print, and after
  generating its plan/report/objective. `verify_course_planner_v2.js`
  (96) and `verify_credit_hour_planner.js` (291) both still pass, and
  `verify_css_extraction.js` (120) is new.
  One deliberate exception: the v2 objective builder previously had no
  focus rule of its own, so its "Create Objective" button, copy button and
  `<summary>` used the browser's default focus ring. They now take the
  documented `2px solid #007FAC` ring from `base.css`, matching every
  other page. Visible only while an element has focus. **Mention this to
  the designers currently field-testing v2** if any of them report the
  page looking different.
- v2 objective builder is in field testing; more feedback expected.
- course_planner_v1.html has the module-card Step 5 and is now frozen
  while v2 is field-tested against it.
- course_planner.html (v2) added July 29, 2026 and linked from index.html
  as "Course Content Planner (updated v2)". Out for instructional designer
  comparison against v1. Things to confirm with Maka rather than change on
  a hunch: the Step 1 goals lead-in is punctuated as a statement ("…by the
  end of the course."); the alignment chips are abbreviated to G1/G2 by
  design, with the goal key carrying the full text; and the "What makes a
  good assessment online?" panel appears in both Step 2 and Step 4
  deliberately.
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
