# UOES Tools

A collection of single-file HTML tools helping faculty and staff (mostly
instructional designers) plan and build courses, with a focus on online
courses. Repo: `RutgersGRID/uoes_tools`. Each tool is one .html file with its
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
- `learning_activity_estimator.html` — Learning Activity Estimator: how
  long one learning activity takes a student. It was
  `workload_estimator.html`, the Course Workload Estimator (a JS port of
  an R/Shiny app), until September 14, 2026, when it was scoped down —
  see **Learning Activity Estimator notes**. The rate tables and the
  CC BY-NC-SA credit are the port's.
- `credit_hour_planner.html` — Credit Hour Planner: does the whole
  course plan enough instructional time and out-of-class work for its
  credits? Rebuilt October 21, 2026; until then a weekly-budget port of a
  two-sheet Excel workbook (see **Credit Hour Planner notes**).

## Stylesheets

CSS was moved out of the pages on August 12, 2026. Each page links its
sheets in cascade order, most general first:

| Page | Sheets |
| --- | --- |
| `index.html` | `base` + `index` |
| `learning_objectives.html` | `base` + `document` + `learning_objectives` |
| `blooms_verbs.html` | `base` + `document` + `blooms_verbs` |
| `course_planner.html` | `base` + `document` + `course_planner` |
| `credit_hour_planner.html` | `base` + `document` + `credit_hour_planner` |
| `learning_activity_estimator.html` | `base` + `document` + `learning_activity_estimator` |

- **`css/base.css`** — the `:root` design tokens, the `.sr-only` helper,
  `[hidden]`, and the one focus-visibility rule. Loaded by every page and
  always first. Change a brand colour here and it changes everywhere.
- **`css/document.css`** — the shell for the reading-width pages
  (`body`, centred `h1`, `.subtitle`, the `.guide` panel), plus the
  **step-card family** shared by the planner and the credit hour planner
  since September 11, 2026: `section.step`, the collapsible
  `.step-body`, `.step-num`, `.step-lead`, the `.two-col` grid and the
  `.primary-btn` / `.small-btn` pair. Those were the planner's own until
  the credit hour planner adopted the same layout; they moved verbatim
  and the planner renders byte-identically. The measure is
  `var(--content-width, 750px)`; the planner and the credit hour planner
  each set `--content-width: 900px` in their own sheet. The `.guide` panel takes a `var(--blue)` border and
  16px text (both changed August 26, 2026 — see **Accessibility
  conventions**).
- **`css/calculator.css` is gone** (deleted September 14, 2026). It was
  the shell for the wide, multi-column calculator layout the two
  calculators shared. The credit hour planner left it on September 11
  and the workload estimator on September 14, each for the planner's
  layout on `document.css`; the tiles, breakdown table, `.warn`,
  buttons and print rules each page still wanted moved into its own
  sheet. Recoverable from git history.
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
  900px on the planner, the credit hour planner and the activity
  estimator (the estimator was 1080px, as a wide multi-column
  calculator, until September 14, 2026). On the `document.css` pages
  this is the `--content-width` token.

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
  panel until this landed (August 26, 2026). `document.css`
  renders the heading `display: inline` so it stays on the
  disclosure marker's line; do not give it its own size or weight.
- **No two disclosures on a page may share an accessible name.** Where a
  panel is deliberately repeated, append an `.sr-only` qualifier *inside
  the heading*, so the visible text stays a substring of the accessible
  name. The activity estimator's three "Where these numbers come from"
  panels carried such qualifiers until September 14, 2026, when Maka
  asked for explicit titles instead ("Where this estimated reading rate
  comes from", "…writing rate…", "Where this discussion estimate comes
  from") — unique on their own, so the qualifiers went. The planner had a repeated assessment panel until the
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
  listing the course objectives **one per line** — a plain `<ul>` under a
  "Course objectives:" lead, each row "CO1 — <text>". It was one run-on
  string separated by " · " until September 10, 2026, when Maka found it
  read as a wall of text with the Rock 'n' Roll fixture's four long
  objectives; the harness checks the rows stack. Since September 2026 it lives
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

## Learning Activity Estimator notes

`learning_activity_estimator.html`. **Until September 14, 2026 this was
the Course Workload Estimator** (`workload_estimator.html`), a port of
the **Enhanced Course Workload Estimator** by Betsy Barre, Allen Brown,
and Justin Esarey (Wake Forest CAT / Rice CTE), originally an R/Shiny app
(`ui.R` + `server.R`). **Licensed CC BY-NC-SA 4.0** — the page is a
derivative work, so the footer must keep the author credits, the link to
the methodology page, and the same license. Non-commercial only. The
footer wording is still the one awaiting institutional sign-off (see
**Current status**); the rescope did not touch it.

### Why it was scoped down

The Course Workload Estimator summed a whole course into hours per week
(independent vs. contact), which is what the Credit Hour Planner's weekly
time budget and module planner already do. **Maka's call, September 14,
2026:** stop reproducing that and make the page do the one thing the
Credit Hour Planner cannot — estimate how long a *specific* activity
takes a student, so the number can be typed into the module planner.
(The module planner went with the October 21, 2026 rebuild of the Credit
Hour Planner, whose rows now carry the estimator's methods in their own
Estimate panels; see **Credit Hour Planner notes**.)
The ask, in order: rename it Learning Activity Estimator, remove every
reference to hours per week for the course, make it clearly about
individual activities, drop the Course info section, and **give every
activity on the Credit Hour Planner's lists a home**, grouped where the
estimation logic is the same ("reading from texts is not unlike reading a
blog or journal entry").

What went: the Course info section (class weeks), the per-week division
everywhere, the Total / Independent / Contact tiles, the share bar and
the independent/contact tag in the table, the Exams (per semester), Other
assignments (number × hours slider) and Class meetings sections. The
harness guards that none of it is back: no `#classweeks`, no per-week
wording anywhere on the page or in the report, no independent/contact
split.

### The six sections

Each estimates **one activity at a time** and its heading carries the
result as a readout ("0.45 hrs") so a collapsed section still shows what
it holds. Reading opens by default; the rest start closed. The lead
paragraph of each names the Credit Hour Planner activities it covers —
that mapping is the design, so here it is in one place:

| Section | Planner activities it covers | Model |
| --- | --- | --- |
| Reading | Readings, Supplemental materials, a case study *to read*, blog and journal entries written by others | pages ÷ rate table (density × difficulty × purpose), or a manual rate |
| Writing | Writing assignments, Blog, Journal posts, Wiki, the written report of a project | pages × rate table (genre × drafting × density), or a manual rate. **Length may be given in words**, converted at the chosen density (250 or 500 words a page) |
| Discussion & peer feedback | Discussion posts, Peer review, comments on classmates' blogs/journals/wikis | posts × words ÷ 250 per hour, or A/V minutes ÷ 3 per hour, or manual hours |
| Media & live sessions | Mini-lecture video, Other videos, Podcast, Webinar session, Simulation / eLearning tutorial | items × running time. Counted at running time; the hint says to add task time separately |
| Quizzes & tests | Quiz, Test, Pre-assessment, Assessment preparation time | time limit ÷ 60 + preparation hours (default 0; the hint cites the planner's 3-hour suggestion) |
| Projects & other activities | Case study, Experiential learning, Research activities, Individual assignment, Group assignment, Project / presentation, "Something else" | **no model** — choosing an activity fills in the Credit Hour Planner's typical time (2, 2, 2, 2, 4, 1 hours; 0 for Something else) and the hours stay editable |

The last row is honest about itself: the page says there is no
research-based rate for those and that the figure is a starting point.
The typical times are the planner's `sug` values, carried as
`data-sug` on the `<option>`s; **keep the two lists in step** if the
planner's suggestions ever change. The fill happens in a `change`
listener on the select itself, which runs before the form's handler
renders.

The results block is a single Total tile, a table (Activity / Based on /
Hours) listing only the sections with hours, and a hint pointing at the
Credit Hour Planner's module planner — **stale since October 21, 2026**;
see the Credit Hour Planner's **Cross-links**. The "Based on" column repeats each
section's inputs in words ("30 pages at 67 pages per hour", "1000 words,
about 4.00 pages, at 2 hours per page") so the copy text and the report
carry their assumptions.

### Storage

**A new key, `uoes-activity-estimator`, and no migration.** The old
`uoes-workload-estimator` saves hold a different set of fields whose
per-week figures mean nothing here; `load()` never reads that key and
the harness checks that an old save is ignored. Same reasoning as the
planner's key rename: nothing worth carrying forward. New fields keep
their defaults when a save lacks them; a corrupt save falls back to
defaults.

**Fixture:** `test/load_rock_activities.html` seeds one Rock 'n' Roll
activity into every section (Module 7 readings, the R&A progress report,
the Electric Dylan discussion, Module 8 lecture videos, Exam 1, the R&A
final presentation) and opens the page — the estimator's counterpart to
`load_rock_test.html`. The estimator has no field for an activity's
name, so the loader's card lists what each section holds. The seed is
the page's own save shape, keyed by field id; keep it in step with
`FIELDS` if a field is renamed.

### Lookup tables

Two R arrays, transcribed into nested JS objects. R fills arrays
**column-major**, which is why the flat data vectors in `server.R` look
scrambled; the JS transcription was verified programmatically against an
independent column-major decode of the original vectors (45 checks) when
the port was made. The rescope did not touch them.

- `PAGES_PER_HOUR[density][difficulty][purpose]` — 27 values, 67 down to 5
  pages/hour. R's dim order was `[difficulty, purpose, density]`.
- `HOURS_PER_PAGE[genre][drafting][density]` — 18 values, 0.75 to 10
  hours/page. R's dim order was `[density, drafting, genre]`.
- `WORDS_PER_PAGE` — 250 / 500 by writing density, new with the rescope,
  for the words-to-pages conversion.
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
2. **Divide-by-zero guard.** A manual reading rate of 0 produced `Inf` in
   R; the page counts reading as 0 and shows an inline warning. (The
   `classweeks < 1` guard went with the field.)
3. **Reading purpose label** is "Understand" in the UI (matching the
   original dropdown) even though the R array dimname said "Learn".
4. **Per activity, not per week** — the whole rescope. The original's
   "Independent" checkbox on Other assignments, which the port had turned
   into a two-option select, is gone with that section.

### Methodology sources

The published details page
(<https://cat.wfu.edu/resources/workload/estimationdetails/>) covers
**reading and writing only**. There is no public write-up for discussion
posts — those constants were reverse-engineered from `server.R`, and the
page's discussion panel says so. The media, quiz and project sections are
arithmetic on the user's own numbers, plus the Credit Hour Planner's
typical times; nothing there claims a source.

### Layout

The page took the course planner's layout on September 14, 2026, on
Maka's `course-planner-simplification` branch (the commit is "Restyle
workload estimator to the course planner's layout"), a few hours before
the rescope: a single 900px column of collapsible `section.step` cards.
**Each closed heading shows that section's hours** — the JS writes them
into `data-sum` on the `<summary>` and the sheet draws it as `::after`
generated content. That is deliberate, not a shortcut: as a real
`<span>` inside the summary it failed WCAG 2.5.3 (the float put a space
in the visible label that the accessible name lacked) and
`verify_css_extraction.js` caught it. The restyle carried its own copy
of the step-card block to avoid touching the planner mid-field-test; it
merged into the credit hour planner's layout branch the same day, which
had promoted the same rules into `document.css`, so the copy was
dropped and `calculator.css` deleted.

## Credit Hour Planner notes

`credit_hour_planner.html`. **Rebuilt on October 21, 2026 as a
whole-course planner.** Until then it was a port of a two-sheet Excel
workbook that turned credits into a weekly time budget and checked one
module against it; that page is summarised under **History: the
weekly-budget page** at the end of this section, and its full notes are
in this file's git history (the section of the same name, as of
`accfb42`). The rebuild kept the file, the title, the footer credits and
the step-card layout, and replaced everything else.

### Credits and license

The page still descends from two CC BY-NC-SA 4.0 works, so the footer
keeps three paragraphs and must not lose any of them:

- the **Planning Time Calculator** (Rutgers, FOR FACULTY DIY Version),
  initially developed by **Ruth Ronan** (created 2018, last modified
  2020) — "Adapted from the Planning Time Calculator, initially developed
  by Ruth Ronan at Rutgers University." Most of the activity types and
  their typical times are the workbook's;
- the **Course Workload Estimator** by Betsy Barre, Allen Brown and
  Justin Esarey (Wake Forest CAT / Rice CTE) — the Estimate panels use
  copies of its rate tables (see **Estimate panels**);
- the license line, "this adaptation is shared under the same license".

The text summary ends with the same credits in four lines. Credit wording
confirmed by Maka July 27, 2026 — do not reword it without asking. One
thing to raise rather than fix: the footer says "Reading and writing
estimates come from…", but the discussion constants are the Workload
Estimator's too.

### Why it was rebuilt

**Maka's diagnosis, October 21, 2026:** the page was doing three things
at once — stating the credit-hour minimums, budgeting a week, and
checking whether one module fit. Maka chose to make **this page the whole
course** ("option C"). Planning week by week or module by module
("option B") belongs to the Course Content Planner, later; nothing for it
is built yet, and the page's Next Steps panel already points there.

The old page was kept for a day as `old_credit_hour_planner.html`, with
its CSS copy and harness, and deleted in `3e4a0c4`.

### The page

Under the subtitle, a closed `.guide` panel, **"Hints on how to use this
tool."** — Maka's rewrite of October 21: one line per part of the page
(Course basics, Course format, Course activities, Course totals) and a
line on autosave and Start over. Maka removed the "Why we built this
tool" and "Hints for breaking down larger activities" panels the same
day; do not bring them back.

Then three numbered steps, **all open** (the harness pins it):

1. **Your course** — two cards in `.two-col`.
   - *Course basics*: Course credits (`#credits`, step 0.5, default 3)
     and Course length (weeks) (`#weeks`, default 15). Under them the
     **minimums sentence** (`#minimums`): whole-course totals first,
     weekly averages second ("…at least 37 hours and 30 minutes of
     instructional time and 75 hours of out-of-class work, 112 hours and
     30 minutes in all. Across 15 weeks that averages…"), a note that
     departments may require more, and a closed panel, "How these
     minimums are calculated.", citing 34 CFR 600.2, N.J.A.C. 9A and
     Rutgers Policy 10.2.4.
   - *Course format*: Synchronous / Blended / hybrid / Asynchronous
     radios (`name="format"`, values `sync` / `blended` / `async`,
     default `sync`), a line saying that the first two create a Class
     meetings line, and at the foot of the card **one** closed explainer,
     **"What is, and isn't, instructional time?"**, covering both kinds of
     work: instructor-led time (live, lab, field, experiential with direct
     instructor involvement), monitored and documented asynchronous
     material, what out-of-class work is, the 2:1 ratio, and that the same
     activity can land on either side. The harness checks its position
     and each of those points.
2. **Course activities** — two lead paragraphs, then free rows (see
   **Activity rows**), "+ Add an activity", and two subtotals
   (`#sum-acad`, `#sum-ooc`).
3. **Course totals** — `#warnings`; three tiles (Instructional time,
   Out-of-class work, Whole course), each with its minimum and a
   decorative meter that turns red while short; the weekly averages line
   (`#weekly`); the check (`#status`, mirrored to an `.sr-only` live
   region); the buttons (**Create printable summary** as the
   `.primary-btn`, Copy as text, Print, Start over); and a closed
   **"Next Steps"** panel under the buttons, Maka's: once the totals are
   right, plan week by week in the Course Content Planner (link opens in a
   new tab), after saving a copy with "Create printable summary" or "Copy
   as text".

The site header's main nav on this page is trimmed to UOES Home,
Applications Home and Course Design Tools (Maka, October 21); the other
pages still list each tool.

### The minimums

    STANDARD_WEEKS = 15
    ACADEMIC_MIN_PER_CREDIT = 50    // minutes a week
    OOC_MIN_PER_CREDIT = 100        // minutes a week

    instructional = credits × 50 × 15 / 60   hours, whole course
    out-of-class  = credits × 100 × 15 / 60  hours, whole course

**The minimums are whole-course figures; the weeks only make weekly
averages.** A course owes the same totals however long its term runs, so
a 3-credit course needs 37.5 + 75 = 112.5 hours in 5 weeks or 15. This is
the old page's acceleration rate (15 ÷ weeks) stated the other way round,
and the word "acceleration" is gone from the page (harness check). The
2:1 ratio is fixed by the definition; the old "study hours per credit"
input is gone.

Credits of 0 put a note in place of the check; fewer than 1
week puts a warning in `#warnings` and drops the weekly averages.
Sentences use `hhmm()` ("37 hours and 30 minutes"); tiles and tables use
two decimals.

### Activity types

`TYPES` in the JS, shown grouped by `optgroup` in each row's Type
select. "Typical" is `sug`, filled into Hours each when the type is
chosen; "Counts as" is the default `bucket`; "Estimate" is the method of
its Estimate panel; "Unit" is what How many counts.

| Group | Type | Typical (h) | Counts as | Estimate | Unit |
| --- | --- | --- | --- | --- | --- |
| Scheduled | Class meetings | — | Instructional | — | — |
| Learning activities | Readings | — | Out-of-class | reading | reading |
| | Blog | 1 | Out-of-class | writing | post |
| | Case study | 2 | Out-of-class | — | case |
| | Discussion posts | 1 | Out-of-class | discussion | post |
| | Experiential learning (event, interview, field trip, lab) | 2 | Instructional | — | activity |
| | Journal posts | 1.5 | Out-of-class | writing | entry |
| | Mini-lecture video | 0.3 | Instructional | media | video |
| | Other videos | 0.5 | Out-of-class | media | video |
| | Podcast | 0.5 | Out-of-class | media | episode |
| | Research activities | 2 | Out-of-class | — | activity |
| | Simulation / eLearning tutorial | 0.5 | Instructional | media | tutorial |
| | Supplemental materials | 2 | Out-of-class | reading | item |
| | Webinar session | 1.5 | Instructional | media | session |
| | Wiki | 2 | Out-of-class | writing | contribution |
| Assessment activities | Writing assignment | — | Out-of-class | writing | assignment |
| | Assessment preparation | 3 | Out-of-class | — | assessment |
| | Group assignment | 4 | Out-of-class | — | assignment |
| | Individual assignment | 2 | Out-of-class | — | assignment |
| | Peer review | 1.5 | Out-of-class | discussion | review |
| | Pre-assessment | 1 | Out-of-class | test | pre-assessment |
| | Quiz | 0.5 | Out-of-class | test | quiz |
| | Project / presentation | 1 | Out-of-class | — | project |
| | Test / exam | 1 | Instructional | test | exam |
| Other | Something else | — | Out-of-class | — | — |

- The typical times are the workbook's, except **Discussion posts: 1, not
  3.** The workbook's 3 was a week of posting; How many now counts posts,
  and 1 hour is the estimator's figure for one 250-word post.
- The instructional defaults (Class meetings, Experiential, Mini-lecture
  video, Simulation, Webinar, Test / exam) and the unit guesses for
  Experiential ("activities") and Assessment preparation ("assessments")
  are **Claude's, not yet reviewed with Maka**.
- **Keep the estimator in step.** Its Projects & other section carries the
  typical times for Case study, Experiential, Research, Individual, Group
  and Project (2, 2, 2, 2, 4, 1) as `data-sug`, and its Quizzes & tests
  hint cites Assessment preparation's 3 hours.

### Activity rows

Each row is `{ id, name, type, bucket, count, each, auto, bucketSet,
est, estUsed, estOpen }`; `count` and `each` stay the strings typed, so
an empty box stays empty. The row's controls are Activity (name), Type,
Counts as (Instructional time / Out-of-class work), How many (with the
unit under it, singular for 1), Hours each (with an **Estimate** link
under it when the type has a method), a Total `<output>` (count × each),
and ×.

- **Choosing a type** fills Hours each with its typical time if the box
  is empty or still holds the previous type's typical time (a number
  typed by hand stays); clears it if the new type has none and the box
  held the old one's; sets Counts as unless it was chosen by hand
  (`bucketSet`); names an unnamed row after the type so the summary
  reads; and resets the estimate settings if the method changed.
- **Typing never rebuilds the list** — `refreshRow()` updates labels and
  the total in place so focus stays. A type change re-renders and puts
  focus back on the Type select. + Add and × move focus to a name box;
  removing the last row leaves one blank row.
- Every control's accessible name carries the row's name ("How many
  Weekly discussion"); each row is a `role="group"`; the column header row
  is `aria-hidden`. **At phone width** the header goes and each cell shows
  its own `.inv-mini` label (also `aria-hidden`); no horizontal scroll at
  390px.
- There is still **no "fill everything with typical times" control**, for
  the reason the old page found (all 21 suggestions at once made a 32.8-hour
  module against a 7.5-hour budget): typical times are per-activity
  hints, not a menu. The lead text says they are "a starting point, not a
  requirement".

### The Class meetings line

Synchronous and Blended set up a **Class meetings** line at the top of
the list (`auto: true`, a hint under it says so). `meetingSpec()`:

- name "Class meetings (weekly)", or "Class meetings (weekly, blended)";
- How many = the weeks, rounded;
- Hours each = the weekly share of the instructional minimum — all of it
  for synchronous, half for blended — **rounded up** to the hundredth. A
  3-credit, 15-week synchronous course gets 15 × 2.50 = 37.50 hours, the
  minimum exactly; a 4-credit one gets 15 × 3.34 = 50.10 of 50.

While `auto`, it follows credits, length and format. **Any edit to the
line** — name, count, hours, type, counts as, an estimate — makes it the
designer's, and it stops following. Asynchronous removes an auto line
(not an edited one). Deleting it sets `meetingsDismissed` (saved), so it
stays gone while credits and weeks change, until a format radio is chosen
again. No auto line is added if a row of type Class meetings already
exists.

**Why it rounds up (Maka, October 22, 2026).** It rounded to the
nearest hundredth until then, which left many common courses a few
minutes short of the minimum the line exists to meet — 4 credits × 15
weeks gave 15 × 3.33 = 49.95 of 50 hours, and the page warned "3 minutes
short" about its own line; 1 credit × 15 weeks and 3 credits × 13 or 16
weeks did the same. Maka's rule: round up, as long as the overshoot stays
within 10 minutes. It does: at most 0.6 minutes a week, so under 10 for
any term of 16 weeks or fewer. `Math.ceil(weekly * 100 - 1e-9)` — the
epsilon stops floating-point noise pushing an exact 250 to 251. The
harness sweeps 0.5–6 credits × 1–16 weeks in both formats against that
rule.

### Estimate panels

A row whose type has a method gets an **Estimate** button
(`aria-expanded` / `aria-controls`) under Hours each; it opens a compact
panel of the Learning Activity Estimator's inputs under the row and
focuses its first field. Methods (`ESTIMATE` in the JS), with the
estimator's defaults:

| Method | Fields | Hours for one |
| --- | --- | --- |
| reading | pages each; density (450/600/750 words); difficulty; purpose (survey/understand/engage) | pages ÷ `PAGES_PER_HOUR[density][difficulty][purpose]` |
| writing | length each, in pages or words; density (250/500 words); genre; drafting | pages × `HOURS_PER_PAGE[genre][drafting][density]` |
| discussion | format text or audio/video; words each (250) or minutes each (3) | words ÷ 250, or minutes ÷ 3 |
| media | running time each (minutes) | minutes ÷ 60; "add any task time as its own line" |
| test | time limit each (minutes); preparation each (hours, 0) | limit ÷ 60 + preparation |

- **Changing a setting fills Hours each** (rounded to hundredths) and
  sets `estUsed`; **typing Hours each by hand takes over** and clears it,
  and the panel's result line then says the box holds a hand-typed number
  until a setting changes again. While a needed number is missing the
  result line says what to fill in.
- Settings are saved with the row and validated on load (unknown keys
  dropped, a select value that is not an option reset). **Whether a panel
  is open is not saved**; they all start closed.
- The summary adds "each estimated from 25 pages, 750 words per page,
  many new concepts, understand" under a row only while `estUsed`.
- **Density reads as words per page in the summary** (Maka, October 22,
  2026). The dropdowns keep "250 words (double-spaced)", "750 words
  (textbook)" and so on, so designers recognise the page, but each density
  option carries a short third element ("250 words per page") that the
  summary prints instead. It used to print "500 words, 250 words
  (double-spaced)", two word counts meaning different things. Maka's
  point: density is only words per page and spacing does not change the
  work. Worth knowing: when a writing length is given **in words**,
  density cancels out — the single-spaced rates are exactly twice the
  double-spaced ones — so the choice only matters for a length in pages.
  Counting words would be cleaner but designers rarely know the count.
- **`PAGES_PER_HOUR`, `HOURS_PER_PAGE` and `WORDS_PER_PAGE` are copies of
  the estimator's** — the repo keeps each tool one self-contained file.
  The harness reads both pages and fails if the copies differ. Change
  both or neither.

### The check: each kind of work against its own minimum

Instructional time is compared with its minimum and out-of-class work
with its own; **nothing is netted against anything.** Extra instructional
time does not cover an out-of-class shortfall, and the page never says it
does (both are harness checks). Maka's call, October 21, 2026: New
Jersey's definition allows "an equivalent amount of academic work as
established by an institution", 34 CFR 600.2 reads as two floors, and
Rutgers 10.2.4 is a 2023 draft — whether one can stand in for the other
is the school's decision, not the tool's.

Results, in `check()`: a note if credits are 0, a note if nothing is
planned, a red `.warn` per short bucket (the instructional one says how
to add instructor-led time), or a green `.note.ok` when both are met.
**The warnings name the course shape the minimum comes from** — "short of
the 37 hours and 30 minutes a 3 credit, 15 week course needs", not "this
course needs" (Maka, October 22, 2026), so the figure reads as a
consequence of the designer's own credits and length. `courseShape()`
writes it: "an" before 8, 11 and 18; the weeks are left out while the
length is under 1.
**Going over is fine** — the credit hour is a minimum, not a ceiling (the
August 29 finding, 34 CFR 600.2's "not less than"); there is no overload
warning yet (open item).

### Terminology

- **"Instructional time", never "academic work"**, anywhere visible
  (harness check). In N.J.A.C. 9A:1-1.2 and Rutgers 10.2.4 "academic work"
  is class and outside work together, so using it for the instructor-led
  part alone read as wrong to anyone who knows the policies. The internal
  key stays `acad` (`sum-acad`, `out-acad`, `bucket: "acad"`).
- **"Carnegie" does not appear on the page** (Maka, August 28, 2026). The
  math is still the Carnegie unit; do not name it in labels or hints.
- Formats are **synchronous / blended / asynchronous**, not online /
  traditional (Maka, August 29, 2026): a live online class is scheduled
  meeting time.

### Storage

**Key `uoes-credit-hour-course`**, new with the rebuild. The old page's
`uoes-credit-hour-planner` saves are ignored — no migration, since their
weekly-budget fields mean nothing here — and the harness checks that one
is. Saved 400 ms after each change:

    { credits, weeks, format, meetingsDismissed, rows: [ …row objects ] }

`load()` checks every row (unknown type → blank, bucket → `ooc` unless
`acad`, numbers → strings, estimate settings via `loadEst()`, `estOpen`
false); a corrupt save starts fresh and a partial one loads what it can.
Start over (with a confirm) clears the key, the form and the rows, then
sets up the meetings line again. `window.__state`, `__update` and
`__asText` are exposed for the harness.

**Fixture:** `test/load_rock_credit_hours.html` (October 22, 2026) seeds
the whole Rock 'n' Roll course — 3 credits, 15 weeks, asynchronous, 18
rows — and opens the page; the planner's counterpart to
`load_rock_test.html` and `load_rock_activities.html`. It meets both
minimums by a small margin (38.82 of 37.5 instructional, 77.28 of 75
out-of-class), so deleting the Live review sessions row (3 h) shows the
instructional warning. It exercises a hand-set bucket (monitored
discussions as instructional time), seven rows with `estUsed` estimates
whose `each` equals what the page computes (so no panel says "typed by
hand"), and two hand-typed overrides of a typical time. The seed is the
page's own save shape; keep it in step if a type id, method field or the
key changes.

### Summary, copy and print

`asText()` builds the plain-text plan: CREDIT HOUR PLAN; COURSE (credits,
length, format); one block per bucket listing each row with hours
(`count x each` and total, plus a detail line with the unit and any
estimate), its total and minimum; WHOLE COURSE total and average per
week; CHECK; the credit lines. "Create printable summary" puts it in a
`<pre>` in `#reportWrap`; Print does the same and calls `window.print()`
(the print sheet hides `main > :not(#reportWrap)`); Copy as text uses the
clipboard API with a textarea fallback and announces through
`#copystatus`.

### Cross-links

- **Out:** only the Course Content Planner, from Next Steps. The page no
  longer links the Learning Activity Estimator (the Estimate panels
  replaced the "Not sure how long an activity takes?" note).
- **In:** the course planner's Step 3 sentence points to both tools
  ("…make sure you have the right amount of activities planned, try the
  Credit Hour Planner. … estimating how long a specific activity takes,
  try the Learning Activity Estimator."); its Resources for planning
  panel links the page by absolute URL; the estimator and the other pages
  link it from the header nav; index.html lists it.
- **Stale, to fix with Maka's wording:** index.html still describes the
  old page ("an hours-per-week budget … check whether the activities
  planned for a module actually fit"), and the estimator's results hint
  still says to "enter these hours in the Credit Hour Planner's module
  planner", which no longer exists.
- **Publishing:** the link dependency on the estimator is gone, but the
  page carries the estimator's tables and credits the Workload Estimator
  authors, so the same CC BY-NC-SA sign-off covers both. **Still ship the
  two together.**

### Open items

To review with Maka: the default instructional types and the two unit
guesses (see **Activity types**).
Still open: finals week (does a 15-week term include it?); a syllabus
credit-hour statement the page could produce; an overload warning when a
course runs far over; always-shown estimate panels as an alternative to
the Estimate link; the week-by-week planning that now belongs to the
Course Content Planner.

### History: the weekly-budget page

For orientation only; none of this is on the page now.

- **July 27, 2026** — ported from the Planning Time Calculator workbook.
  Sheet 1 became a "Weekly time budget" (weeks, credits, meeting hours,
  study hours per credit, an acceleration rate of 15 ÷ weeks), sheet 2 a
  "Module time planner" of 15 learning and 10 assessment activities with
  the workbook's suggested times (they had lived in Excel
  data-validation input messages), and a "Does the module fit?" check.
  Departures then: the workbook's 50/60 scaling on reading and writing
  dropped, a `weeks < 1` guard, typos fixed ("Poscast").
- **August 12** — the "What counts as instructional time" panel
  collapsed.
- **August 28–29** — "Carnegie" dropped; formats re-cut as synchronous /
  blended / asynchronous; the clamp keeping meeting hours within the
  credit hours removed (minimum, not a ceiling).
- **September 10** — the meeting field took minutes per week
  (provisional; moot now).
- **September 11** — took the course planner's step-card layout.
- **September 14** — linked the new Learning Activity Estimator for every
  activity's time.
- **October 21** — rebuilt as this page.

## Testing

Changes were verified with headless Chromium (playwright-core) checks:
form rendering, live sync between steps, plan generation, localStorage
persistence/migration, and print-to-PDF output. Worth repeating for
anything touching the planner's state handling or print CSS.

For the Learning Activity Estimator, `test/verify_activity_estimator.js`
runs 111 checks (new with the September 14, 2026 rescope — the old
estimator's `verify.js`, 123 checks against the R math, was never in the
repo and its per-week scenarios no longer apply): identity and scope
(title, no Course info, no course-level fields, no per-week wording, no
independent/contact split, six collapsible sections with Reading open,
every Credit Hour Planner activity named on the page), the corners and
monotonicity of the reading table and the corners of the writing table
through the UI, each section's arithmetic, the manual overrides and their
warning, the words-to-pages conversion at both densities, the
typical-time fill and refill in Projects & other, the total and table
and heading readouts (including the `::after` content), persistence
under `uoes-activity-estimator` with the old key ignored, corrupt and
partial saves, "Start over", the report text and its credit line,
print-PDF non-blankness, the print-CSS pattern, label/aria coverage,
unique disclosure names, the focus outline, and the cross-links.

For the credit hour planner, `test/verify_credit_hour_planner.js` runs 133
checks, rewritten with the October 21, 2026 rebuild (the weekly-budget
harness went with the old page): structure (title, three open steps in
order, no weekly-budget leftovers such as `#f2f`, `#study` or the word
"acceleration", no module-fit step), the one instructional-time explainer
and its wording, "instructional time" never "academic work", the Next
Steps panel; the minimums for 3 credits and a short term; the Class
meetings line (synchronous default, blended halves it, asynchronous
removes it, follows credits and length, rounds up to meet the minimum
within 10 minutes across 0.5–6 credits × 1–16 weeks, becomes the
designer's on edit,
stays deleted until the format changes); rows (typical-time fill,
naming, default bucket, hand-typed values and buckets surviving a type
change, count × each, focus kept while typing, add and remove, units);
the Estimate panels (closed by default, button semantics, each method's
arithmetic through the UI, hand-typed hours taking over and a setting
taking back, density printed as words per page and never as spacing or
book type in the summary while the dropdown keeps both, settings
surviving a reload, **the rate tables matching the
estimator's**, fetched from `learning_activity_estimator.html`); row
accessibility; the check (each bucket against its own minimum, no
netting, red bars, two warnings when both are short, both warnings naming
the course shape — "a 3 credit, 15 week course", "an 8 credit, 7 week
course", the weeks dropped with no valid length); persistence under
`uoes-credit-hour-course`, corrupt and partial saves, the old key
ignored, Start over; the summary text and its credit line; and the phone
layout at 390px. Its only failure in a sandbox is the blocked-fonts
"no page errors" check.

For the course planner, `test/verify_course_planner_v2.js` runs 168
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

For the stylesheets, `test/verify_css_extraction.js` runs 168 checks: each
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

## Current status

- **The Credit Hour Planner was rebuilt as a whole-course planner,
  October 21, 2026** — Maka's call, on seeing the page did three jobs at
  once. Three steps: Your course, Course activities (free rows with
  types, buckets, units and Estimate panels), Course totals (each kind of
  work against its own minimum). New storage key, no migration. Maka then
  trimmed the hints, the nav and the step names and added Next Steps.
  See **Credit Hour Planner notes**. The credit hour bullets below dated
  August 29, September 10 and September 11 describe the old page; the
  sections they point to are in this file's git history as of `accfb42`.
  **Worth telling anyone field testing:** saved work on the old page is
  not carried over, and the page no longer plans a week or a module.

- **The Course Workload Estimator became the Learning Activity Estimator,
  September 14, 2026** — Maka's call, on realising the estimator's
  per-week course totals reproduced the Credit Hour Planner. It now
  estimates one activity at a time and covers every activity on the
  planner's lists, grouped by how each is estimated; the file is
  `learning_activity_estimator.html`, the storage key is new, and the
  index entry and the credit hour planner's cross-links follow. See
  **Learning Activity Estimator notes** for the section-to-activity
  mapping. **Worth telling anyone field testing:** the old page's saved
  entries are not carried over, the credit hour planner now points at it
  for *every* activity rather than reading and writing only, and the
  "Projects & other activities" section fills in the planner's typical
  times rather than estimating anything. The CC BY-NC-SA footer is
  unchanged and still awaits sign-off.

- **Both calculators took the course planner's layout, September 11
  and 14, 2026, and `calculator.css` is deleted.** The credit hour
  planner first (Maka's ask, to bring the pages' look together), then
  the workload estimator on a branch Maka made at the office; the two
  branches merged into `credit-hour-planner-layout` on September 14,
  the estimator's duplicated step-card rules were dropped in favour of
  the shared ones in `document.css`, and the now-unused calculator
  sheet went. See **The credit hour planner takes the planner's
  layout** and **The estimator takes the planner's layout too**. Local
  `main` also still holds the unpushed September 10 minutes commit. Worth telling anyone field testing: same page, same numbers,
  a narrower column of numbered cards with boxed inputs. The
  "How this is calculated" explainer is still in section 1 — Maka's
  earlier question about what it refers to is still open, and the
  planned answer (move it under the Weekly time budget and name the row
  it means) is a content change for a separate pass.

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

- **The meeting field takes minutes per week, September 10, 2026 —
  provisional.** Maka found that typing 3 hours and reading 2.5 on the
  tile was confusing at a glance, weighed three fixes, and is leaning
  towards minutes but wants the instructional designers' view first. Built
  so it can be shown and reverted; see **The meeting field takes minutes,
  not academic hours**, including the revert caveat about saves.
- **The credit hour planner's format choice is now synchronous / blended /
  asynchronous, and meeting hours moved into Course basics, August 29,
  2026.** Maka noticed the page would not let a 3-credit course meet for
  more than three hours a week and cited 34 CFR 600.2, where the credit
  hour is a floor rather than a ceiling; the clamp is gone. Moving the
  field out of the blended-only format card and making it universal then
  broke the merged "Fully online or traditional" option, and Maka's fix was
  to re-cut the axis as synchronous vs. asynchronous — a live online class
  is scheduled meeting time. See **The format axis is synchronous, not
  online** and departure 2. **Two things to watch in field testing:** the
  default format is now synchronous rather than the old fully-online
  option, and "online instructional" is called "self-paced instructional"
  throughout.

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
- The estimator page (now `learning_activity_estimator.html`) was added
  as workload_estimator.html on July 27, 2026 and linked from index.html.
  **Not cleared for publishing yet.** The CC BY-NC-SA footer wording reads
  fine to Maka but is awaiting sign-off from institutional stakeholders.
  Do not push it live, and do not change the credit/license wording in the
  meantime — if it comes back with required edits, that is the version to
  apply.
- credit_hour_planner.html added July 27, 2026 and linked from index.html.
  Footer credit settled: "Adapted from the Planning Time Calculator,
  initially developed by Ruth Ronan at Rutgers University."
  **Still not cleared for publishing.** Since the October 21 rebuild it no
  longer links learning_activity_estimator.html, but it carries copies of
  the estimator's rate tables and credits the Workload Estimator authors,
  so it waits on the same CC BY-NC-SA sign-off. Ship the two together.
