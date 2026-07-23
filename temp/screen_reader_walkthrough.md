# Screen Reader Walkthrough — Learning Objective Builder

A step-by-step test script with the announcements you should expect to hear.
Written for **NVDA** (free, [nvaccess.org](https://www.nvaccess.org/download/)) on Windows;
notes for **Narrator** (built in, `Ctrl + Win + Enter` to toggle) where they differ.

## Setup

1. Install and start NVDA (or start Narrator). NVDA speaks immediately; keep the voice rate comfortable (`NVDA key (Insert) + Ctrl + Up/Down arrows` adjusts it).
2. Open the live page in your browser.
3. Test with **only the keyboard** — put the mouse out of reach. This tests keyboard access and screen reader behavior at the same time.

## Key commands you'll need

| Action | NVDA | Narrator |
|---|---|---|
| Next element (reading order) | `Down arrow` | `Caps Lock + Right arrow` |
| Next focusable control | `Tab` | `Tab` |
| Next heading | `H` | `Caps Lock + H` |
| Activate button/expand | `Enter` or `Space` | `Enter` |
| Change dropdown choice | `Up/Down arrows` | `Up/Down arrows` |
| Stop speech | `Ctrl` | `Ctrl` |

## The walkthrough

Each step lists what to do and roughly what you should hear. Exact wording
varies between screen readers — what matters is that the *information* is announced.

**1. Load the page.**
Expect: *"Learning Objective Builder"* (the page title), and the page's h1.
Press `H` — it should jump to the one heading: *"Learning Objective Builder, heading level 1."*

**2. `Tab` to the guide.**
Expect: *"What goes in each blank?, summary/button, collapsed."*
Press `Enter`. Expect: *"expanded."*

**3. Arrow (`Down`) through the opened guide.**
Expect: the four terms and definitions read in order — *"Condition… Audience… Behavior… Degree…"* — followed by the example, which should read as a **clean sentence**: *"Example: Given a blank map of the US, students will label all fifty states with 90% accuracy."*
🚩 Red flag: hearing *"a blank map of the US **condition** students **audience**…"* — labels interleaved mid-sentence.

**4. `Tab` to the dropdown.**
Expect: *"opener, combo box, After."*
Press `Down arrow` a few times: each choice (At, Given, Upon, Without) is announced. Also confirm you can *see* the focus outline on the dropdown. Set it back to Given for the classic example.

**5. `Tab` to the first blank.**
Expect: *"condition, edit, blank"* — and after a brief pause, NVDA reads the description: *"The circumstances of the demonstration: what learners will have, be denied, or the setting/timing…"*
🚩 Red flag: hearing only *"edit, blank"* with no name — that's the unlabeled-input failure we fixed; it should not happen.
Type `a blank map of the US`.

**6. `Tab` through the remaining blanks.**
Expect each to announce its name first: *"audience, edit"* → type `students`; *"behavior, edit"* → type `label all fifty states`; *"degree, edit"* → type `with 90% accuracy`.
Confirm the visible focus outline follows you the whole way.

**7. `Tab` to "Create Objective" and press `Enter`.**
Expect: *"Create Objective, button"*, then after activating — **without moving focus** — the result is announced automatically: *"Given a blank map of the US, students will label all fifty states with 90% accuracy."*
🚩 Red flag: silence after pressing the button (a broken live region), or the annotation labels read mid-sentence.

**8. `Tab` to "Copy" and press `Enter`.**
Expect: *"Copy, button"*, then *"Objective copied to clipboard."*
Paste somewhere to confirm the clipboard really has the clean sentence.

**9. Leave a blank empty and press "Create Objective" again.**
Expect: the sentence reads with a gap — you'll hear *"underscore underscore…"* or *"blank"* for the missing word. Not ideal prose, but understandable. (If this bothers you, we can announce something friendlier like "blank" — ask Claude.)

## Pass criteria

You're done and passing if: every control announces a meaningful name; the
guide's example and the generated result both read as clean sentences; the
result announces itself without focus moving; the copy confirmation is spoken;
and you could see where keyboard focus was at every step.
