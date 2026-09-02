# UOES Tools

A collection of single-file HTML tools helping faculty and staff (mostly
instructional designers) plan and build courses, with a focus on online
courses. Repo: `themaka/uoes_tools`. Each tool is one .html file with its
JS inline — no build step, no external dependencies, no framework. CSS
lives in `css/` and is linked (see **Stylesheets** below).

## Files

**Naming convention:** each tool is a single plain-named file. There was
a `_v1` scheme for a while, holding the superseded version of the planner
and the objective builder alongside the live one; **both v1 pages were
deleted on August 26, 2026** and the `obsolete/` directory with them, so
every file below is live. They are recoverable from git history if a
comparison is ever wanted again. Older notes in this file may name files
that no longer exist; trust this list.

- `index.html` — landing page listing the tools. Add a `<li>` to the
  tool list whenever a new tool page is added. It lists one entry per
  tool. `blooms_verbs.html` is deliberately not listed — see below.
- `learning_objectives.html` — Learning Objective Builder. Out with
    instructional designers for feedback; a final version will be chosen
    after field testing.
- `blooms_verbs.html` — Bloom's Taxonomy Verbs, a standalone reference
  sheet linked from the objective builder (see below). Not listed on
  index.html, on purpose.
- `course_planner.html` — Course Content Planner **v2**, the live one: a
  4-step revision built from instructional designer feedback (see below).
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
  in its own sheet. The `.guide` panel takes a `var(--blue)` border and
  16px text (both changed August 26, 2026 — see **Accessibility
  conventions**).
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
  (this is why input underlines use Rutgers Blue). The `.guide` panel
  border was moved off it for the same reason on August 26, 2026: it
  measured 1.90:1 against the page background, and the Light Blue fill is
  only 1.09:1, so nothing else marked the panel's edge.
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
  accessible name must still *contain* that visible text — see the CO1/CO2
  alignment checkboxes in course planner v2, whose names are
  "CO1: <course objective text>".
- Semantic HTML: `<main>`, `<section aria-labelledby>`, `<details>/<summary>`
  for collapsible guidance panels.
- **Every `<summary>` wraps its text in a heading**, at the level that fits
  the page outline — `h3`/`h4` on the planner, `h2` on the objective
  builder, `h4` on both calculators. Heading navigation is the commonest
  screen reader strategy on these long pages and it skipped every guidance
  panel until this landed (August 26, 2026). `document.css` and
  `calculator.css` render the heading `display: inline` so it stays on the
  disclosure marker's line; do not give it its own size or weight.
- **No two disclosures on a page may share an accessible name.** Where a
  panel is deliberately repeated (the three "Where these numbers come
  from" panels in the workload estimator), append an `.sr-only` qualifier
  *inside the heading*, so the visible text stays a substring of the
  accessible name. The planner had a repeated assessment panel until the
  September 2026 consolidation; its Step 2 copy still carries its
  qualifier ("— course objectives"), harmless now that it is the only
  one, and a reminder of the rule if a panel is ever repeated again.
  The same rule covers the two module-count labels — see **The module
  count is editable in two places**.
- Click and tap targets clear 24px (WCAG 2.5.8). `summary` carries 3px of
  vertical padding for this; a bare line of text fell just under.

## Learning Objective Builder notes

The builder builds an ABCD-model objective (Audience, Behavior,
Condition, Degree) from a template string in the JS: `{placeholder}`
becomes an inline blank; `{label:Choice1|Choice2}` becomes a dropdown.
Blanks auto-grow while typing. Output is rendered with underlined,
labeled parts plus a plain-text copy button.

Shaped by instructional designer feedback on the original version
(deleted August 26, 2026), which differed as follows:
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

## Course Content Planner: behaviours to preserve

Content adapted for online/asynchronous delivery from CMU Eberly Center's
"Course Content & Schedule" guide (credited in the page footer), reframed
around backwards design.

These conventions predate v2 and still hold. They were written up when
there were two planners; the v1 page is gone, but every item here
describes the live one:

- **Module cards, not a table.** Header bar with "Module N" + topic
  input, then the fields. Default 16 modules, min 1 / max 20; resizing
  preserves entered text. Stacks to one column under 640px. The header
  bar is also the card's disclosure control — see **Collapsible module
  cards**.
- **Terminology is `assessment`, not "evidence", in all UI text** — the
  internal state field is still `evidence`, for saved-data
  compatibility. Same split as the goals/objectives rename; see **Course
  objective alignment**.
- Auto-save to `localStorage` (debounced ~400ms, try/catch-wrapped).
  **Never rename an existing state field without a migration in
  `load()`.**
- **The storage key is `uoes-course-planner`**, matching
  `uoes-workload-estimator` and `uoes-credit-hour-planner`. It was
  `uoes-course-planner-v2` until August 27, 2026 — see **Storage key**
  below. `load()` still migrates a v1-shaped save, and the harness still
  checks that.
- "Create My Course Plan" renders the plan (only filled-in fields; empty
  modules show "(not planned yet)"), with Copy-as-text and Print buttons.
- Print CSS shows only the generated plan. The hide rule must target
  `main > :not(#planWrap)` — an earlier `body > …` selector hid `<main>`
  itself and printed a blank page. Keep this in mind if restructuring.
- "Start over" clears storage after a `confirm()`.

## Course Content Planner v2 notes

`course_planner.html` (then named `course_planner_v2.html`), created
July 29, 2026 from instructional designer feedback on the original
planner, which was deleted August 26, 2026. Neither page carries a
version in its `<title>` any more — both were dropped on August 26, when
the v1 pages went and the suffix stopped meaning anything.

### Storage key

The planner saves to **`uoes-course-planner`**. It used
`uoes-course-planner-v2` from July 29 to **August 27, 2026**: while both
planners existed the keys had to be separate, and the suffix outlived
that reason by a day short of a month. Maka's call to rename it, on the
grounds that nobody had saved work in it yet.

**The rename was a clean break — there is no read-fallback to the old
key.** Anything saved under `uoes-course-planner-v2` is simply invisible
now. That was the accepted cost; do not add a shim for it later without
asking, because a fallback that reads a key nothing writes is
indistinguishable from dead code within a month.

What did *not* change: `load()` still migrates a **v1-shaped** save
found under this key (string `objectives`, `duedates`, `principle`,
`strategy`). Shape migration and key naming are separate concerns, and
`test/load_rock_test.html` seeds a deliberately v1-shaped payload so
that path stays exercised by hand as well as by the harness.

The rule that has not moved: **never rename an existing state field
without a migration in `load()`.** `state.goals`, `evidence` and friends
still carry their original names for exactly that reason — see **Course
objective alignment**. Renaming the key was safe only because no saved
data needed to survive it.

### Collapsible steps

The whole page read as one long form and was intimidating on arrival, so
**each step's body sits in a `<details class="step-body">` whose
`<summary>` is that step's own `<h2>`** (August 26, 2026). A step
collapses to its heading.

- **Course basics and Step 1 carry `open` in the markup; Steps 2 and 3
  start closed.** On load the page is ~1700px tall instead of ~8600px.
- All four are collapsible, not just the later two, so a step can be
  folded away once it is done.
- The open/closed state is **not persisted** — a reload returns to the
  default. Content is saved as always; only the disclosure state resets.
- This is the same arrangement as the `.guide` panels: a real
  `<details>`/`<summary>` so the button role, `aria-expanded` and
  keyboard activation come for free, with the heading inline inside the
  summary. Heading navigation still reaches every step and each
  section's `aria-labelledby` still resolves. See **Accessibility
  conventions**.
- The plan generator reads `state`, not the DOM, so **"Create My Course
  Plan" works with every step collapsed** — there is a check for this.

**This matters for the harness.** Anything that drives a control inside
Step 2 or Step 3 must open the step first, or Playwright times out
waiting for visibility — and the steps revert to the default on every
reload, so `openSteps()` is called after each one.

### The three steps

1. **Decide what your students will take away from your course** (was
   "Decide where students should end up"). The Learning Objective Builder
   link was removed from this step; the objectives lead-in reads "What
   should students be able to do by the end of the course." — punctuated
   as a statement, per Maka's wording, and set at 24px. The step is now
   the course objectives list and nothing else — see **The course topic
   list is gone**.
2. **Decide how you'll assess each course objective** (was "…each goal").
   Still the per-objective assessment list, live-synced from Step 1.
3. **Organize your course content into modules** (v1's Step 5; called
   "Map it onto your modules" until September 2026).

### The course topic list is gone

Step 1 carried a **Course Topics (optional)** triage list — repeatable
topic rows, each with an Essential / Supporting / Trim dropdown, printed
in the plan and the Word export under a "Topics" heading grouped by
priority. **Removed on September 2, 2026** at Maka's request, from the
step and from both outputs.

Gone with it: `state.topics`, the `PRIORITIES` array, `renderTopics()`,
`#topicsList`/`#addTopicBtn`, the two blank rows the page seeded on first
load, the "Topics" block in `buildPlan()` and in `docxParts()`, and the
`select.pri-essential`/`select.pri-trim` rules (plus `.row-list select`,
which nothing else used — the planner now has no `<select>` on it at
all).

`load()` **deletes `topics` from saved work**, the same way it drops
`duedates`, `principle` and `strategy`; the id counter is re-derived from
`state.goals` alone. The harness guards the whole removal: no
`#topicsList`/`#addTopicBtn`, no "Course Topics" heading in Step 1, no
`topics` key saved, a legacy topic list discarded on load, and no Topics
section in either the plan or the `.docx`.

**Step 1's guidance prose lost its topic references too**, the same day:
the lead no longer ends "— then cut your topic list down to what serves
those objectives", and the "Why start at the end?" panel lost its "list
every topic you could cover, then cut the list drastically" paragraph.
The panel's summary was "Why start at the end? (and why less is more)"
until that paragraph went — less-is-more was the paragraph's whole point,
so the parenthetical came out with it.

**Step 3 still says "Distribute your essential topics…"** and the module
cards still carry a topic field. Left alone on purpose: that is about
module topics, which still exist. Ask Maka before rewording it.

**v2 started with four steps.** The third — "Choose a structure and
teaching strategy (optional)", carrying an organizing-principle dropdown
and a strategy textarea — was **removed on August 26, 2026** at Maka's
request, and the module step renumbered from 4 to 3. Gone with it: the
`PRINCIPLES` description table, the "Ways to organize a course" guidance
panel, `#principleNote` in the stylesheet, and the "Organization &
teaching strategy" block of the generated plan. `load()` deletes
`principle` and `strategy` from saved work, the same way `duedates` is
dropped. The harness guards it staying gone — no such heading, no
`#principle`/`#strategy`/`#principleNote` in the DOM, no orphaned
`step4Head`/`step5Head` ids.

**The big shift in v2 is that the module is where the work happens.**
Step 3 still walks through objectives → assessments → activities *at the
module level*, then presents the module cards — but since the September
2026 consolidation it says so in a **four-item ordered list** rather than
in three sub-sections with a guidance panel each. Its order is:

- lead paragraph ("Break down your course content into manageable
  chunks…")
- **"Why break content into modules?"** panel — replaces "Scheduling tips
  for online courses". Its link is a **placeholder**: see **The
  scheduling tips link** below
- **"Plan Your Modules"** heading, then "For each module, you should:"
  over an `<ol>`: create learning objectives, decide how you will assess
  them, select activities that build toward the assessment, list
  materials & resources. **This one list replaced three headed
  sub-sections** ("Create Learning Objectives for each module.", "Decide
  how you will assess…", "Create Activities…") and the two guidance
  panels that hung off them
- **"Resources for planning"** panel — UOES Resource Library links for
  objectives, assessments and activities, plus the Credit Hour Planner's
  activity list
- the module-count row
- **Module cards** — the course-objective key, then the cards. Its
  `<h3>Module cards</h3>` is commented out, not deleted

The Learning Objective Builder link used to sit in the first of those
sub-sections. It now lives in **Step 1's "Why start at the end?" panel**
("Use the Learning Objective Builder if you want help writing an
objective, then paste the result into the list below."), opening in a new
tab with `rel="noopener noreferrer"`, the same way the objective builder
links to the Bloom's page. The harness pins it there: exactly one such
link on the page, inside that panel, and none in the module step.

**The "What makes a good assessment online?" panel is no longer
repeated.** It appeared in both Step 2 and Step 3 by design until
September 2026, when the module-step copy went as part of the length
reduction — the `<ol>` above now carries the same instruction in a line.
Only the Step 2 copy remains. This reverses a long-standing "do not
dedupe it" note; if a module-level copy is ever wanted back, it needs its
`.sr-only` qualifier again (see **Accessibility conventions**).

v1's Step 3 (Design the learning activities) is gone entirely — both the
standalone step and, as of the same day, the per-objective activities list
that had been folded into the module step. Course objectives no longer
carry an `activities` field;
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
  the order of the Step 3 headings above it. Still stacks to one column
  under 640px.
- Objectives is no longer a single optional text field. It is a
  **repeatable list**, added and removed the same way course objectives are
  ("+ Add an objective" plus a × on each row). A module always keeps at
  least one row — removing the last one re-adds a blank.

### Collapsible module cards

Sixteen expanded cards was a wall of form, so **"Module N" in each card
header is a disclosure button** over that card's body (August 26, 2026).
Module 1 starts open; the rest start closed.

- **The topic input stays outside the collapsing region**, in the header
  bar beside the button, so a whole course's topics can be typed straight
  down the collapsed list. Only the body — objectives, materials,
  assessments, activities — collapses.
- **This is why the card uses a `<button aria-expanded aria-controls>`
  rather than a `<details>`/`<summary>` like the steps and guide panels.**
  A click on an input inside a `<summary>` toggles the panel, so the topic
  field could not live there. Do not "harmonise" this into a `<details>`
  without moving the topic field inside it and accepting that cost.
- The triangle is a CSS `::before` on the button, swapped by the
  `[aria-expanded="true"]` attribute selector, so it always matches the
  real state.
- **Open state lives in a `Set` outside `state`**, keyed by module index.
  It survives a re-render — and `renderModules()` runs whenever a course
  objective is added or removed, so this matters — but not a reload. Same
  choice the collapsible steps make.

### The module count is editable in two places

Course basics has the original `#moduleCount`; Step 3 has
`#moduleCountCards` sitting directly above the cards, because that is
where you notice the number is wrong. **Both read and write the one
`state.moduleCount`** through `setModuleCount()`, which also writes the
clamped result back into both boxes — typing 50 used to leave 50 in the
field while only 20 cards appeared.

`setModuleCount()` **returns early when the number has not actually
moved.** Two inputs feed it and a change event can arrive carrying a
value the state already holds; rebuilding then discards and recreates
every card and every listener on it for nothing. There is a check for
this, and it fails if the guard is removed.

**Both labels read exactly "Number of modules" on screen**, so each
carries an `.sr-only` qualifier naming the other location — " — same
setting as in Step 3" in basics, " — same setting as in Course basics" in
Step 3. Basics said "Number of modules (usually weeks)" until September
2026; when that came off, the two visible labels became identical and the
basics label needed a qualifier of its own.

Two separate rules are at work, and the qualifier has to satisfy both:

- **Distinct accessible names**, so a screen reader's form-field list can
  tell the two boxes apart. Identical names would give two
  indistinguishable entries.
- **WCAG 2.5.3 Label in Name**: the accessible name must *contain* the
  visible text, so a voice-control user saying "click Number of modules"
  still matches. This is why the qualifier is **appended** — prepending it
  or rewording the label would break the match.

Four checks pin it: both visible labels are identical, each accessible
name starts with its own visible text, the two names differ, and both
labels still have an `.sr-only` span.

Layout: the Step 3 block is a wrapping flex row holding **label, box and
hint all on one line** (the hint is `flex: 1 1 240px`, so it drops below
only when the row runs out of width — on a phone). A check asserts the
three share a row at the harness's default 1280px. The basics field still
stacks its label above the box, matching Course title beside it.

**Harness note:** set a count by filling the field and then *blurring*
it, never by dispatching `change` by hand. A manual dispatch leaves the
field focused, and the browser fires its own `change` on the next focus
move — which lands in the middle of whatever you do next and rebuilds
the cards under it.

### Course objective alignment

Each module objective row carries a narrow **Alignment** column on its
right: one checkbox per *written* course objective, so an instructor can
tick which course objectives that module objective serves.

**Naming:** the UI calls these "course objectives" everywhere; the code
still calls them goals (`state.goals`, `#goalsList`, `#goalLegend`,
`numberedGoals()`, `data-goal-check`). That split is deliberate and
matches the older "assessment" vs. `evidence` split — renaming the state
would strand every saved plan. Change UI strings freely; leave the
identifiers alone unless you write a migration.

- Course objectives are numbered **CO1, CO2, …** in Step 1 order, counting
  only ones that actually have text. `numberedGoals()` is the single
  source of that numbering — the key, the chip labels, the tooltip/`aria`
  text and the printed tags all derive from it, so the prefix is changed
  in exactly one place.
- Checkbox chips show just "CO1"/"CO2" because the column is deliberately
  narrow (`150px` against `minmax(0, 1fr)` for the objective field). The
  full objective text rides along in the hover tooltip and the
  `aria-label`, which reads "CO1: <course objective text>" — the visible
  label is a substring of the accessible name, which is what WCAG
  label-in-name requires. The cluster is a `role="group"` labelled
  "Course objectives that objective N of module M aligns with".

### The scheduling tips link

The "Why break content into modules?" panel ends with "For tips on
structuring and scheduling your modules, see the (not yet released)
Structure and Scheduling Tips resource from UOES", pointing at
`scheduling_tips.html`. **That file does not exist and is not going to.**
The resource is being written as a page on the UOES Drupal site, and the
link will become a `https://uoes.rutgers.edu/node/<id>` URL — **probably
`node/197`**, following the three already linked from Step 3's "Resources
for planning" panel (194 objectives, 195 activities, 196 assessments).
Maka will confirm the number when that Drupal section goes live.

Until then the link is knowingly dead and the "(not yet released)" text
carries the apology. Two things follow:

- **Do not create a local `scheduling_tips.html`** to satisfy it. The
  destination is Drupal, and a stub page here would have to be found and
  deleted later.
- **Do not quietly drop the link either.** It is a placeholder with a
  known replacement, not an oversight.

Anyone field testing before the Drupal page lands will hit a 404 from
that link; it is the one known dead end on the page.

### Why the key is collapsed, not deleted

Maka asked (September 2026) whether the key could be replaced outright by
an instruction to hover a chip, as part of the length reduction. It was
collapsed instead, because **the hover path is not equivalent for every
input**. Measured before deciding:

- **Screen readers never needed the key.** Every chip's `aria-label`
  already reads "CO1: <full objective text>", inside a `role="group"`
  labelled "Course objectives that objective N of module M aligns with".
  Removing the key would have cost them nothing — which is the trap: the
  users an audit checks are the ones this change is safe for.
- **Keyboard reaches the tooltip.** `:has(input:focus-visible)` fires on
  tab, confirmed.
- **Touch cannot, without side effects.** In a touch context a tap does
  surface the tooltip — *and ticks the checkbox*. A tablet user has to
  claim an alignment to find out what CO1 means, then tap again to undo.
  That is the finding that settled it.
- **Nothing fails WCAG either way.** 1.4.13 governs the tooltip's
  behaviour and it already conforms (hoverable, dismissible, persistent);
  no criterion says information may not live only in hover content. This
  was a usability call, not a conformance one — do not "fix" it back by
  citing a success criterion.
- **The key was never the length problem.** With four objectives it was
  91px of a 3847px page (2.4%), and 210px at 390px — biggest exactly
  where touch makes hover cost the most. Collapsed it is 53px, and the
  module cards remain the bulk of the page.

If an instruction is ever added alongside it, **do not word it "hover"** —
naming one modality excludes the others. "Select a CO tag to see the full
objective" covers hover, focus and tap.

The panel styling comes from `.guide`, so the key inherits its 16px type
rather than the 14px it used to set (the August 26, 2026 rule that guide
text is not a step smaller than body text). `#goalLegend` keeps only its
line-height and top margin; the fill, border and padding are the panel's.

**Harness note:** `openSteps()` opens `.legend-panel` along with the four
`.step-body` panels, because several checks read the key with `innerText`,
which is empty while it is hidden.

### The alignment chip tooltip

The hover popup on a CO1/CO2 chip was a native `title` attribute until
**August 27, 2026**, when Maka asked for its type to be 20% larger. A
native tooltip's font is the browser's, not the page's, so it had to
become a real element (`.align-tip`) to be sized at all. Things that
followed from that, none of them optional:

- **Type is `font-size: 1.2em`** — 15.6px against the chip's 13px, i.e.
  the requested 20%, expressed as a ratio so it tracks the chip.
- **It opens to the *left* of the chip, not below it.** Dropped below, it
  lands on the next chip down — the chips wrap to several lines inside
  that 150px column — and swallows clicks meant for it. This was a real
  bug, caught by the harness, not a theoretical one.
- **On a narrow screen the row stacks and the chips move to the left
  edge**, so leftward would run out through the card's `overflow: hidden`
  edge. Under 640px the tooltip hangs off `.align-box` instead and drops
  underneath the whole (already wrapped) chip line.
- **The tooltip is a sibling of the `<label>`, not a child**, so hovering
  or clicking it cannot toggle the checkbox. This is why each chip is
  wrapped in `.align-chip-wrap`. Being inside the hovered wrapper is also
  what makes it *hoverable* under WCAG 2.1 1.4.13 — `pointer-events: none`
  would fail that.
- **It carries `aria-hidden="true"`.** The checkbox's `aria-label` already
  says "CO1: <text>"; without this a screen reader would meet the same
  sentence twice on every chip, sixteen modules deep.
- **Shown on `:hover` and on `:has(input:focus-visible)`**, in two
  separate rules — `:focus-within` would leave a tooltip standing over the
  objective field after a mouse click, and splitting the rules means a
  browser without `:has()` still gets hover. Keyboard focus showing it at
  all is new; the native `title` never did.
- **Escape dismisses it** (1.4.13, Dismissible), via a `keydown` listener
  that puts `tips-off` on `<body>`; the next `pointermove` or `focusin`
  clears it. Both show rules are **gated on `body:not(.tips-off)`** rather
  than being overridden by a later `display: none`. An override has to
  out-specify every show rule, and losing that race fails silently —
  Escape just stops dismissing, with nothing wrong-looking in the
  stylesheet. A new show rule wants the same prefix.

The harness covers all of it: tooltip text and `aria-hidden`, no leftover
`title`, the 1.2 ratio measured from computed styles, hidden-until-hovered,
zero overlap with any other chip, staying inside the card at 390px, and
Escape dismissing while the pointer is still on the chip.
- A **course-objective key** (`#goalLegend`) sits above the module cards,
  listing "CO1 — <text> · CO2 — <text> …". Since September 2026 it lives
  **inside a `<details class="guide legend-panel">` that is closed on
  load** — summary "What CO1, CO2… stand for". See **Why the key is
  collapsed, not deleted**. Keep the key itself: the chips are unreadable
  without it.
- State: `module.objectives` is `[{text, align: [goalId, …]}]`. Alignments
  store **ids, not numbers**, so renumbering after a deletion cannot
  corrupt them.
- **A row with alignments but no objective text still prints**, as
  `(objective not written yet) [aligns with CO1]`. It printed nothing at
  all until August 27, 2026: `moduleObjectiveList()` filtered on the text,
  so every tick on an unwritten row was thrown away silently by both the
  plan and the Word export. Ticking the chips is the quicker half of
  filling a row in, so the state is easy to arrive at — the Rock 'n' Roll
  fixture lands in it for eleven of its thirteen modules, which is how it
  surfaced. The row-worth-printing test is `text || tags.length`, and the
  tags are computed against `numberedGoals()` rather than from
  `o.align.length`, so a stale id cannot revive an otherwise empty row.
  A row with neither text nor alignment is still left out.
- `pruneAlignments()` drops ids for deleted course objectives — called on
  removal and on `load()`.
- Re-render rules, which matter for not stealing focus mid-keystroke:
  typing in a course objective only relabels the existing checkboxes (via
  `[data-goal-check]`) and redraws the key. A full `renderModules()` fires
  only when one crosses the empty/non-empty boundary, or on add/remove —
  that is when the *set* of checkboxes changes.
- Under 640px the row stacks: objective + × on the first line, the
  checkboxes on a second line prefixed by a visible "Alignment:"
  (`.align-mini`), and the `.obj-head` collapses to just "Objectives".
- **Watch in field testing:** with more than about four course objectives
  the chip row wraps to several lines inside that 150px column, making
  tall objective rows. CO1 is wider than the old G1 but the capacity is
  the same — three chips per line either way. If designers routinely set
  that many, the column probably wants to become a dropdown or a
  full-width strip.

### v2 plan output

- Heading is "Course objectives & assessments" — there is no per-objective
  activities line any more.
- Course objectives are printed with their numbers: "CO1 — Analyze a food
  web".
- Module objectives print as one line, semicolon-separated, each tagged;
  an unwritten one that carries alignments prints as the `UNWRITTEN`
  placeholder rather than vanishing:
  `Objectives: Identify trophic levels [aligns with CO1]; Trace energy
  through a web [aligns with CO1, CO2]`. Tags are emitted in course
  objective order, not click order.
- Module fields print in the same order as the card: Objectives,
  Materials, Assessments, Activities. Keep the two in step if either
  changes.

### Word export

"Download as Word" sits beside Copy-as-text and Print inside `#planWrap`,
added August 27, 2026 at Maka's request: the plan wanted to leave the page
as a Word table with **one row per module (week)**, editable, pasteable
into a syllabus, and circulable for comment. Print is unchanged and still
prints the on-page plan.

**It writes the `.docx` by hand — file format and archive both.** A .docx
is a ZIP of XML parts, and this repo has no build step and no
dependencies, so `zipStore()` emits a **store-only** (uncompressed) ZIP —
a CRC-32 table, a local header, a central directory entry and an
end-of-central-directory record — and `docxParts()` emits the five parts
Word needs:

    [Content_Types].xml
    _rels/.rels
    word/_rels/document.xml.rels
    word/styles.xml
    word/document.xml

Why a real `.docx` rather than the much shorter trick of serving HTML with
a `.doc` extension: recent Word versions raise a "file format and
extension don't match" prompt on those, which is exactly the wrong thing
to put in front of a faculty member. The ZIP writer is ~40 lines and buys
a file that opens silently.

Things worth knowing before touching it:

- **The ZIP timestamp is a fixed 1980-01-01.** The same plan therefore
  exports byte-identically, which makes a diff meaningful; nothing in Word
  reads it.
- **Brand colours are read back out of the design tokens** via
  `token("--red", …)` on the document element, not written again as hex.
  Same rule as the stylesheets, honoured in JS — see **Design system**.
  Each has a fallback in case the token ever disappears.
- **The document is landscape Letter with 1in margins**, which leaves
  12960 twips of content width. `DOCX_COLS` holds the six column widths
  and they must keep summing to `DOCX_TABLE_W` — there is a check.
- **OOXML element order is not free.** `w:pPr` wants `pStyle` before
  `spacing`; `w:rPr` wants `b`, `i`, `color`, `sz` in that order; `w:tcPr`
  wants `tcW` before `shd`; `w:tblPr` wants `tblW`, `tblBorders`,
  `tblCellMar`. Word rejects the whole file if these are shuffled, so
  reorder nothing when adding a property.
- **A paragraph must follow a table that ends the body** — hence the bare
  `<w:p/>` before `<w:sectPr>`. Removing it produces a file Word will not
  open.
- `xesc()` escapes the double quote as well as `&`/`<`/`>` and strips
  control characters, because one pasted from elsewhere makes the XML
  invalid and Word refuses the file rather than skipping the character.
- Newlines inside a textarea become `<w:br/>` inside the one paragraph, so
  a multi-line Materials field stays one cell.
- The header row carries `<w:tblHeader/>` so it repeats when the table
  runs past a page.

**The table columns are Module, Topic, Objectives, Materials, Assessments,
Activities** — the same order the module card and the on-page plan use.
Keep all three in step if any of them changes. Module objectives are one
paragraph each inside the cell, tagged `[aligns with CO1, CO2]` exactly as
the on-page plan tags them: `moduleObjectiveList()` was factored out of
`buildPlan()` so the two cannot drift.

**An unplanned module keeps its row with empty cells** rather than saying
"(not planned yet)" the way the on-page plan does. That is deliberate — an
empty row in Word is a week you have not planned *and* somewhere to type,
so the export doubles as a template. If a designer reads a blank row as a
bug, this is the note to revisit.

The filename is `<course title> - Course Plan.docx`, with characters
Windows and macOS reject stripped and the title capped at 80 characters.

### Migration

`load()` in v2 accepts v1-shaped saves: a string `objectives` becomes a
one-row list, a missing or non-array `objectives` becomes a single blank
row, string rows become `{text, align: []}`, `duedates` is deleted, and a
course objective's `activities` field is deleted, and `principle` and
`strategy` are deleted. Everything else — auto-save debounce, print CSS,
copy-as-text, "Start over", the CMU Eberly Center footer credit — is
unchanged from v1. A saved `topics` array is deleted too, the same way
`duedates`, `principle` and `strategy` are.

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

For the course planner, `test/verify_course_planner_v2.js` runs 167
checks (the count moves with almost every planner change; treat a
mismatch as a stale note, not a failure): the three step headings and badge numbers, the collapsible-step
defaults (all four are `<details>`, basics and Step 1 open, 2 and 3
closed, a closed step really hides its body, clicking a heading toggles
it), the reworded Step 1 and
Step 2 text, the Learning Objective Builder link appearing exactly once
and only in Step 1's guidance panel, the two module-count labels (same
visible text, each accessible name starting with it, the two names
differing, both carrying an `.sr-only` qualifier) and their one-row
layout, the absence of the old per-objective activities list, module
card row order (Objectives, Materials, then Assessments left of
Activities), the absence of any due-date control and of any course-topic
control, label/aria coverage, the
focus outline, and live sync of course objective text into Step 2 and the
course-objective key.

The Word export has 25 of those checks. The harness reads the archive
back with its own ZIP parser rather than trusting the writer: every entry
stored, every CRC recomputed, the five parts present, both XML parts
parsed with `DOMParser`. Then the content — one row per module plus a
header, six `gridCol`s summing to 12960, a repeating header row, the six
column names, landscape orientation, a module row carrying every field,
alignment tags and CO numbering preserved, colours matching the tokens, a
course title full of XML metacharacters escaped and still parsing, the
filename sanitised, and the button hidden in print.

Six more cover the unwritten-objective regression: the tick reaching
state, the placeholder reaching both the plan and the export, the module
no longer being called unplanned once it carries one, a row with neither
text nor alignment still being left out, and a stale alignment id not
reviving an empty row.

Alignment is covered specifically: the key's empty and populated
states, checkboxes appearing the moment a course objective is first
written and disappearing when it is cleared, chip text being exactly
CO1/CO2, accessible
names containing the visible chip text, the `role="group"` label, live
relabeling when a course objective is reworded, adding and removing
objective rows, per-objective alignment saved as ids, unticking, pruning
and renumbering after one is deleted (surviving ticks must stay ticked), and
the guarantee that a module never drops to zero objective rows.

Plus: saving under `uoes-course-planner` and leaving no stale `-v2` key,
round-trip, migration of a v1-shaped save (string `objectives` → one row, `duedates` and goal
`activities` dropped), corrupt-save recovery, plan generation with
G-number tags and field ordering, print-PDF non-blankness and print-CSS
visibility.

For the stylesheets, `test/verify_css_extraction.js` runs 153 checks: each
converted page links exactly the expected sheets in the expected order
with `base.css` first, every sheet actually parses (a 404 or a typo'd
`href` yields zero rules and fails), no inline `<style>` block survives,
all eight design tokens resolve on every page, every *visible* focusable
control resolves the 2px Rutgers Blue outline, `.sr-only` is still clipped
to 1×1, each print sheet still hides `main > :not(#…Wrap)`, and no
page-level sheet contains a raw brand hex code. Re-run it after touching anything in `css/`.

36 of those checks cover the collapsible panels specifically, on every
converted page: exactly one heading inside each `<summary>`, no two
accessible names alike on a page, the visible label contained in the
accessible name, a summary at least 24px tall, the `.guide` border at
least 3:1 against the page background, `.guide` text no smaller than body
text, and the calculators' blue summary text at least 4.5:1 on the card.
That last one passes by 0.03 (4.53:1) and is pinned deliberately — if a
future palette change drops it under, this is what will say so.

All harnesses need `npm install playwright-core`. They locate a browser
through `test/_chrome.js`, which checks `$PW_CHROME` first and then the
usual Linux/macOS/Windows install paths, so normally you just run them:

    node test/verify_css_extraction.js
    PW_CHROME="/path/to/chrome" node test/verify_css_extraction.js

Use a **Playwright-provisioned Chromium**, not a stock system Chrome — a
system Chrome exits immediately on playwright-core's launch flags. Fetch
one with `node node_modules/playwright-core/cli.js install chromium`.

The two harnesses that read `cssRules` also need
`args: ["--allow-file-access-from-files"]`, because Chromium will not
expose the rules of a `file://` stylesheet without it. They must also
tolerate the **cross-origin Google Fonts sheet** the site header links:
`cssRules` throws on it however the browser is launched, so it is skipped
rather than counted as a parse failure.

## Current status (August 2026)

- **Length-reduction pass on the planner, September 2026** — Maka's,
  edited directly on the page. **The goal was to make the page
  dramatically shorter without losing functionality**, by consolidating
  guidance and cutting extra headings; nothing a designer could *do* was
  removed. That is the reason behind several changes that look like
  losses on their own, and the reason the "do not dedupe the assessment
  panel" rule was reversed: the module-step copy is gone because the new
  "Plan Your Modules" list already says it in a line. What changed:
  - Step 3 is now **"Organize your course content into modules"**, and
    its three headed sub-sections collapsed into one four-item ordered
    list under "Plan Your Modules". See **The three steps**.
  - The **Learning Objective Builder link moved to Step 1's "Why start at
    the end?" panel** and opens in a new tab. It was briefly off the page
    altogether during the pass.
  - The **Course Topics triage list** went from Step 1, with its "Topics"
    section in the plan and the Word export. See **The course topic list
    is gone**.
  - **Both module-count labels now read "Number of modules"** — basics
    dropped "(usually weeks)" — so both carry `.sr-only` qualifiers, and
    the Step 3 block is one row (label, box, hint).
  - Guidance panels were rewritten around **UOES Resource Library links**
    rather than in-page prose.
  - The **course-objective key collapsed into a closed panel** rather than
    being replaced by a hover instruction — see **Why the key is
    collapsed, not deleted** for the touch finding that decided it.
  One loose end left deliberately: the scheduling-tips link is a
  placeholder (see **The scheduling tips link**). `.grid-caption` went
  with the paragraph that used it.
  Worth telling the designers field testing: the page is much shorter,
  the builder link moved, and topic triage is gone.

- **The Course Topics list was removed from Step 1, September 2, 2026** —
  Maka's call. It is gone from the step and from both the on-page plan and
  the Word export, and `load()` discards a saved `topics` array. See **The
  course topic list is gone**, including why the surrounding guidance
  prose still mentions topics. Worth telling the designers currently field
  testing: any topic triage they had typed in is not carried forward.

- **Alignment ticks on an unwritten module objective used to vanish from
  the output, fixed August 27, 2026.** Maka hit it in the Rock 'n' Roll
  fixture, whose modules 3–13 have no objective text — the ticks saved
  fine and then neither the plan nor the Word export printed them. The
  filter now keeps any row with text *or* alignments and marks the gap.
  Predates the Word export; the export only inherited it. See **Course
  objective alignment**.
- **The course plan exports to Word, August 27, 2026.** “Download as
  Word” joins Copy-as-text and Print on the generated plan and produces a
  real `.docx` whose module schedule is a table with **one row per
  module** — Maka’s ask. Written by hand, ZIP and OOXML both, because
  there is no build step here; see **Word export** for the constraints
  that come with that. Print is untouched. Worth putting in front of the
  designers currently field testing, since the table is the form most of
  them will actually circulate.
- **The storage key lost its `-v2` suffix, August 27, 2026** — it is now
  `uoes-course-planner`, matching the other two tools. Maka's call, on
  the grounds that no one has saved work in the planner yet. A clean
  break with no read-fallback: see **Storage key**. Also fixed the same
  day, `test/load_rock_test.html` was seeding the *v1* key and so opened
  an empty planner; it now writes the planner's actual key.
- **The alignment chip tooltip is a real element, August 27, 2026.** Maka
  asked for 20% larger type on the CO1/CO2 hover popup, which a native
  `title` attribute cannot give — the browser owns that font. Replacing it
  brought the keyboard and Escape behaviour a `title` never had, and a
  placement constraint worth knowing before touching it. See **The
  alignment chip tooltip**. Worth mentioning to anyone field testing: the
  popup now looks like part of the page rather than an OS tooltip.
- **Both v1 pages deleted, August 26, 2026**, along with the `obsolete/`
  directory — Maka's call; the side-by-side field test against v1 is no
  longer something to protect. Recoverable from git history. The
  harnesses lost their frozen-page and v1-untouched guards with them.
  The "v2" suffix was dropped from both page `<title>`s the same day, once
  it named a distinction that no longer existed.
- **Module cards collapse too, August 26, 2026**, and the module count
  gained a second field beside them in Step 3. See **Collapsible module
  cards** and **The module count is editable in two places** — including
  why the cards use a button rather than a `<details>`, and the harness
  note about setting a count by blurring rather than dispatching
  `change`.
- **The planner dropped to three steps, August 26, 2026.** "Choose a
  structure and teaching strategy (optional)" was removed at Maka's
  request and the module step renumbered 4 → 3. See **The three steps**.
  Any feedback already collected about the organizing-principle dropdown
  is moot.
- **Disclosure panel accessibility pass, August 26, 2026.** The
  collapsible guidance panels were sound in their bones — real
  `<details>/<summary>`, default marker intact, focus ring covered by
  `base.css` — but had five gaps, now fixed across every page:
  summaries are headings, duplicate accessible names carry `.sr-only`
  qualifiers, the `.guide` border moved off Mid Blue, `summary` clears the
  24px target minimum, and `.guide` text is no longer a step smaller than
  body text. Details under **Accessibility conventions**. **The only
  visible change is the type size**; mention it to anyone currently field
  testing, along with the focus-ring note from August 12.
- **"Goals" renamed to "course objectives", August 26, 2026**, to match
  backwards design vocabulary — Maka's call. UI text only: `state.goals`,
  `#goalsList`, `#goalLegend`, `numberedGoals()` and `data-goal-check`
  keep their names so saved plans still load. Alignment chips went from
  G1/G2 to **CO1/CO2**.
- **The test harnesses were repaired the same day** and had drifted badly:
  two of the three could not run at all (stale `course_planner_v2.html`
  paths, a hardcoded Linux Chromium path, and a hard crash on the
  cross-origin Google Fonts sheet the site header links). See **Testing**
  for how to run them now. `verify_css_extraction.js` also had 13 failures
  predating this work, from the site header — those are fixed, and it
  gained 36 checks covering the panel fixes above.
- **Files renamed to the live/`_v1` scheme on August 12, 2026** (see
  **Files**), and index.html trimmed to one link per tool. That scheme is
  itself gone now — the `_v1` pages were deleted August 26 — but notes
  written before August 12 may still use the pre-rename names.
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
- The objective builder is in field testing; more feedback expected.
- course_planner.html added July 29, 2026 and linked from index.html.
  Out for instructional designer review. Things to confirm with Maka rather than change on
  a hunch: the Step 1 objectives lead-in is punctuated as a statement
  ("…by the end of the course."); the alignment chips are abbreviated to
  CO1/CO2 by design, with the key carrying the full text; and the "What makes a
  good assessment online?" panel appears in both Step 2 and Step 3
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
