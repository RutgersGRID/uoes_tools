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
- Content max-width: 750px on the objective builders, 900px on the planner.

## Accessibility conventions

- Every interactive element has a visible focus style:
  `outline: 2px solid #007FAC; outline-offset: 2px`.
- Generated inputs get `aria-label` (and `aria-description` for guidance
  text where used). Decorative hint labels under blanks are
  `aria-hidden="true"`.
- Result/output regions use `aria-live="polite"`; copy feedback uses a
  `role="status"` element with an `.sr-only` (visually hidden) class.
- Prefer real `<label for>` associations where a visible label exists
  (module cards in the planner do this).
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

## Testing

Changes were verified with headless Chromium (playwright-core) checks:
form rendering, live sync between steps, plan generation, localStorage
persistence/migration, and print-to-PDF output. Worth repeating for
anything touching the planner's state handling or print CSS.

## Current status (July 2026)

- v2 objective builder is in field testing; more feedback expected.
- course_planner.html's latest version (module-card Step 5) was delivered
  via chat during a session when the synced computer was offline — verify
  the repo copy includes the module cards before editing.
