/* Verification harness for credit_hour_planner.html
 *
 * Run: node verify.js
 *
 * Checks the ported math against an independent reimplementation of the
 * original Excel formulas, plus guards, persistence, a11y and print output.
 */
const { chromium } = require("playwright-core");
const path = require("path");
const { chromePath } = require("./_chrome.js");

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? "  [" + detail + "]" : "")); }
}
function near(name, actual, expected, tol) {
  tol = tol === undefined ? 1e-9 : tol;
  const good = Math.abs(actual - expected) <= tol;
  ok(name, good, good ? "" : "got " + actual + ", expected " + expected);
}

/* ------------------------------------------------------------------
   Independent reimplementation of the original workbook formulas.
   Transcribed straight from the cell formulas in
   "Planning Time Calculator ... DIY Version.xlsx", blended block:

     F21 = IFERROR(15/B4, 0)                 acceleration
     H20 = 50*G20*F20   with G20=B19, F20=1  face-to-face weekly minutes
     H21 = (50*G21*F21) + (50*F21*G20 - H20) with G21 = B5-B19
     H22 = 50*G22*F22   with G22 = (G20+G21)*B6
     I   = H/60 ; J = H*B4 ; K = J/60

   The fully-online block (rows 11-12) is the same thing with B19 = 0.
------------------------------------------------------------------ */
/* October 14, 2026: H22 no longer carries the acceleration rate. The student-work
   field holds the minutes a week the instructor plans, not a per-credit rate the
   tool scales, so it is taken as entered -- the same treatment scheduled academic
   work has always had. Cases still give `study` in the workbook's per-credit hours;
   setup() converts, and this transcription applies the same conversion so the two
   agree about what a case means. */
function studyMinutes(credits, study, accel) { return 50 * credits * study * accel; }

function excelWeek(weeks, credits, study, f2f) {
  const accel = weeks === 0 ? 0 : 15 / weeks;
  const H20 = 50 * f2f * 1;
  const H21 = 50 * (credits - f2f) * accel + (50 * accel * f2f - H20);
  const H22 = studyMinutes(credits, study, accel);
  return {
    accel,
    f2fMin: H20, instrMin: H21, studyMin: H22,
    f2fHours: H20 / 60, instrHours: H21 / 60, studyHours: H22 / 60,
    selfPacedHours: (H21 + H22) / 60,
    totalHours: (H20 + H21 + H22) / 60,
    semesterHours: (H20 + H21 + H22) * weeks / 60
  };
}

/* Original fully-online block, rows 11-12, as its own transcription. */
function excelOnline(weeks, credits, study) {
  const accel = weeks === 0 ? 0 : 15 / weeks;
  const H11 = 50 * credits * accel;
  const H12 = studyMinutes(credits, study, accel);
  return {
    accel, instrMin: H11, studyMin: H12,
    instrHours: H11 / 60, studyHours: H12 / 60,
    selfPacedHours: (H11 + H12) / 60,
    totalHours: (H11 + H12) / 60,
    semesterHours: (H11 + H12) * weeks / 60
  };
}

(async () => {
  // --allow-file-access-from-files: the page's CSS now lives in external
  // files under css/, and Chromium otherwise refuses to expose cssRules for
  // a file:// stylesheet, which the print-CSS check below reads.
  const browser = await chromium.launch({
    executablePath: chromePath(),
    args: ["--allow-file-access-from-files"]
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", e => consoleErrors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });

  const file = "file://" + path.resolve(__dirname, "..", "credit_hour_planner.html");
  await page.goto(file);

  /* o.format is "sync" | "blended" | "async"; the older boolean o.blended is
     still accepted, and false maps to "async" — the merged fully-online block
     it used to mean computed no meeting time at all.

     Note the ordering: choosing a format fills the meeting-hours field, so f2f
     is set last and only when the case names it.

     Cases give f2f in 50-minute academic hours, matching the workbook's cell
     formulas. The field itself takes minutes per week (September 10, 2026), so
     setup() scales it.

     `study` is likewise given in the workbook's hours per credit per week. That
     field took minutes per week from October 14, 2026, and is no longer
     accelerated, so setup() converts with the acceleration rate baked in -- a
     case's `study: 2` at 7 weeks means the same weekly load it always did, and
     every expected figure in the matrices below still holds. A case that wants
     to set the field directly passes studyMin instead. */
  const setup = async (o) => page.evaluate((o) => {
    const set = (id, v) => {
      const e = document.getElementById(id);
      e.value = String(v);
      e.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const fmt = document.getElementById(
      { sync: "fmt-sync", blended: "fmt-blended", async: "fmt-async" }[o.format]);
    fmt.checked = true;
    fmt.dispatchEvent(new Event("change", { bubbles: true }));
    set("weeks", o.weeks); set("credits", o.credits);
    if (o.studyMin !== undefined) set("study", o.studyMin);
    else if (o.study !== undefined) {
      const a = o.weeks > 0 ? 15 / o.weeks : 0;
      set("study", 50 * o.credits * o.study * a);
    }
    if (o.f2f !== undefined) set("f2f", o.f2f * 50);
    if (o.reading !== undefined) set("rw_reading", o.reading);
    if (o.writing !== undefined) set("rw_writing", o.writing);
    if (o.activities) {
      Object.keys(o.activities).forEach(k => set(k, o.activities[k]));
    }
  }, { ...o, format: o.format || (o.blended ? "blended" : "async") });

  const week = () => page.evaluate(() => window.__calcWeek());
  const mod  = () => page.evaluate(() => window.__calcModule());

  /* ============ 1. No scheduled or monitored work (the old fully-online block) ============
     f2f is set to 0 explicitly. Until October 14, 2026 the asynchronous preset
     supplied the zero; it now fills the credit-hour minimum instead, so these
     cases have to say so. The arithmetic they check is unchanged: this is the
     branch where the whole instructional requirement is self-paced. */

  const onlineCases = [
    { weeks: 15, credits: 3, study: 2 },
    { weeks: 15, credits: 3, study: 3 },
    { weeks: 15, credits: 4, study: 2 },
    { weeks: 15, credits: 1, study: 2 },
    { weeks: 7,  credits: 3, study: 2 },
    { weeks: 8,  credits: 3, study: 3 },
    { weeks: 5,  credits: 4, study: 2.5 },
    { weeks: 10, credits: 3, study: 2 },
    { weeks: 16, credits: 3, study: 2 },
    { weeks: 12, credits: 0.5, study: 3 }
  ];

  for (const c of onlineCases) {
    await setup({ ...c, blended: false, f2f: 0 });
    const got = await week();
    const exp = excelOnline(c.weeks, c.credits, c.study);
    const tag = `async w${c.weeks} c${c.credits} s${c.study}`;
    near(tag + " accel",      got.accel,         exp.accel,         1e-9);
    near(tag + " instr hrs",  got.instrHours,    exp.instrHours,    1e-9);
    near(tag + " study hrs",  got.studyHours,    exp.studyHours,    1e-9);
    near(tag + " total hrs",  got.totalHours,    exp.totalHours,    1e-9);
    near(tag + " sem hrs",    got.semesterHours, exp.semesterHours, 1e-9);
    near(tag + " self-paced hrs", got.selfPacedHours, exp.selfPacedHours, 1e-9);
    // Credit-hour invariant: semester hours = 12.5 * credits * (1 + study)
    near(tag + " credit-hour invariant", got.semesterHours,
      12.5 * c.credits * (1 + c.study), 1e-9);
    // parts add to whole
    near(tag + " parts sum to total",
      got.instrHours + got.studyHours, got.totalHours, 1e-9);
  }

  /* ================= 2. Blended / hybrid ================= */

  const blendedCases = [
    { weeks: 15, credits: 3, study: 2, f2f: 1 },
    { weeks: 15, credits: 3, study: 2, f2f: 2 },
    { weeks: 15, credits: 3, study: 2, f2f: 3 },
    { weeks: 15, credits: 3, study: 2, f2f: 0 },
    { weeks: 7,  credits: 3, study: 2, f2f: 1 },
    { weeks: 7,  credits: 3, study: 3, f2f: 1.6 },
    { weeks: 10, credits: 4, study: 2, f2f: 2 },
    { weeks: 5,  credits: 3, study: 2, f2f: 1 }
  ];

  for (const c of blendedCases) {
    await setup({ ...c, blended: true });
    const got = await week();
    const exp = excelWeek(c.weeks, c.credits, c.study, c.f2f);
    const tag = `blended w${c.weeks} c${c.credits} s${c.study} f${c.f2f}`;
    near(tag + " accel",      got.accel,         exp.accel,         1e-9);
    near(tag + " f2f hrs",    got.f2fHours,      exp.f2fHours,      1e-9);
    near(tag + " instr hrs",  got.instrHours,    exp.instrHours,    1e-9);
    near(tag + " study hrs",  got.studyHours,    exp.studyHours,    1e-9);
    near(tag + " total hrs",  got.totalHours,    exp.totalHours,    1e-9);
    near(tag + " sem hrs",    got.semesterHours, exp.semesterHours, 1e-9);
    near(tag + " self-paced hrs", got.selfPacedHours, exp.selfPacedHours, 1e-9);
    near(tag + " credit-hour invariant", got.semesterHours,
      12.5 * c.credits * (1 + c.study), 1e-9);
    near(tag + " parts sum to total",
      got.f2fHours + got.instrHours + got.studyHours, got.totalHours, 1e-9);
    ok(tag + " no warnings", got.warnings.length === 0, got.warnings.join("; "));
    ok(tag + " no notes", got.notes.length === 0, got.notes.join("; "));
  }

  /* ===== 3. Blended with f2f = 0 must equal the fully-online block ===== */
  for (const c of [{ weeks: 15, credits: 3, study: 2 }, { weeks: 7, credits: 4, study: 3 }]) {
    await setup({ ...c, blended: true, f2f: 0 });
    const b = await week();
    await setup({ ...c, blended: false, f2f: 0 });
    const o = await week();
    near(`f2f=0 equivalence w${c.weeks} total`, b.totalHours, o.totalHours, 1e-9);
    near(`f2f=0 equivalence w${c.weeks} self-paced budget`, b.selfPacedHours, o.selfPacedHours, 1e-9);
    near(`f2f=0 equivalence w${c.weeks} study`, b.studyHours, o.studyHours, 1e-9);
  }

  /* ===== 4. Meetings never accelerate; the shortfall moves to self-paced ===== */
  {
    await setup({ blended: true, weeks: 7, credits: 3, study: 2, f2f: 1 });
    const g = await week();
    near("f2f stays at 50 min/wk in a 7-week term", g.f2fHours, 50 / 60, 1e-9);
    // accelerated instructional requirement minus what the meeting covers
    const accel = 15 / 7;
    near("shortfall pushed to self-paced instructional", g.instrHours,
      (50 * accel * 2 + (50 * accel * 1 - 50)) / 60, 1e-9);
  }

  /* ================= 5. Guards ================= */
  {
    await setup({ blended: false, weeks: 0, credits: 3, study: 2 });
    const g = await week();
    ok("weeks 0 warns", g.warnings.length === 1, JSON.stringify(g.warnings));
    near("weeks 0 total is 0", g.totalHours, 0);
    near("weeks 0 semester is 0", g.semesterHours, 0);
    ok("weeks 0 finite", isFinite(g.totalHours) && isFinite(g.semesterHours));

    const warnShown = await page.$$eval(".warn", els => els.length);
    ok("weeks 0 renders an inline warning", warnShown >= 1, "count " + warnShown);
  }
  /* Meetings above the credit hours: legitimate, not an error.
     34 CFR 600.2 makes the credit hour a minimum, and a lab or studio routinely
     meets for longer. This used to clamp the meeting hours to the credit hours,
     which put a hard 3-hour ceiling on a 3-credit course. Regression guard. */
  {
    await setup({ format: "blended", weeks: 15, credits: 3, study: 2, f2f: 5 });
    const g = await week();
    ok("meetings above the credit hours are not a warning",
      g.warnings.length === 0, JSON.stringify(g.warnings));
    ok("meetings above the credit hours carry a note",
      g.notes.length === 1, JSON.stringify(g.notes));
    ok("the note counts the meetings in minutes",
      /250 minutes a week/.test(g.notes[0]) && /150 minutes of instructional time/.test(g.notes[0]),
      g.notes[0]);
    near("meeting hours are not capped", g.f2fHours, 50 * 5 / 60, 1e-9);
    near("self-paced instructional floors at zero", g.instrHours, 0, 1e-9);
    near("study time still follows the credits", g.studyHours, 50 * 3 * 2 / 60, 1e-9);
    near("weekly total = meetings + study", g.totalHours, (50 * 5 + 50 * 3 * 2) / 60, 1e-9);
    near("semester total = weekly total x weeks",
      g.semesterHours, (50 * 5 + 50 * 3 * 2) / 60 * 15, 1e-9);
    ok("semester hours clear the credit-hour minimum",
      g.semesterHours > 12.5 * 3 * 3, "got " + g.semesterHours);

    const shown = await page.evaluate(() => ({
      notes: document.querySelectorAll("#warnings .note").length,
      warns: document.querySelectorAll("#warnings .warn").length,
      max: document.getElementById("f2f").getAttribute("max")
    }));
    ok("the note renders inline", shown.notes === 1, "count " + shown.notes);
    ok("no red warning for a lab-length week", shown.warns === 0, "count " + shown.warns);
    ok("the meeting-hours field carries no maximum", shown.max === null, shown.max);
  }
  {
    await setup({ blended: false, weeks: 15, credits: -2, study: -1 });
    const g = await week();
    ok("negative inputs produce no negative hours",
      g.totalHours >= 0 && g.instrHours >= 0 && g.studyHours >= 0,
      JSON.stringify(g));
  }

  /* ================= 6. Module planner ================= */
  {
    await setup({
      blended: false, weeks: 15, credits: 3, study: 2,
      reading: 3, writing: 2,
      activities: { l_blog: 1, l_discussion: 3, a_quiz: 0.5 }
    });
    const m = await mod();
    // documented departure: reading/writing enter at face value, not x50/60
    near("reading enters at face value", m.reading, 3, 1e-9);
    near("writing enters at face value", m.writing, 2, 1e-9);
    ok("reading is NOT scaled by 50/60", Math.abs(m.reading - 3 * 50 / 60) > 0.4);
    near("learning total = blog + discussion + readings", m.learn, 1 + 3 + 3, 1e-9);
    near("assessment total = quiz + writing", m.assess, 0.5 + 2, 1e-9);
    near("planned = learn + assess", m.planned, m.learn + m.assess, 1e-9);

    const w = await week();
    near("module budget = instructional + study", m.planned > 0 ? w.selfPacedHours : -1,
      w.instrHours + w.studyHours, 1e-9);

    const shown = await page.evaluate(() => ({
      budget: document.getElementById("out-budget").textContent,
      planned: document.getElementById("out-planned").textContent,
      diff: document.getElementById("out-diff").textContent,
      readingsRow: document.getElementById("l_readings").textContent,
      writingRow: document.getElementById("a_writing").textContent
    }));
    ok("budget tile matches calc", shown.budget === w.selfPacedHours.toFixed(2), shown.budget);
    ok("planned tile matches calc", shown.planned === m.planned.toFixed(2), shown.planned);
    ok("difference tile correct",
      shown.diff === (w.selfPacedHours - m.planned).toFixed(2), shown.diff);
    ok("derived readings row mirrors input", shown.readingsRow === "3.00", shown.readingsRow);
    ok("derived writing row mirrors input", shown.writingRow === "2.00", shown.writingRow);
  }

  /* ===== 7. Over-budget state ===== */
  {
    await setup({
      blended: false, weeks: 15, credits: 3, study: 2,
      reading: 0, writing: 0, activities: { l_blog: 20 }
    });
    const cls = await page.evaluate(() => document.getElementById("tile-diff").className);
    ok("over-budget tile flips to .over", /\bover\b/.test(cls), cls);
    ok("over-budget takes the loud solid-red treatment", /\bprimary\b/.test(cls), cls);
    const bg = await page.evaluate(() =>
      getComputedStyle(document.getElementById("tile-diff")).backgroundColor);
    ok("over-budget tile is solid Rutgers Red", bg === "rgb(204, 0, 51)", bg);
    const warned = await page.$$eval("#balance-msg .warn", e => e.length);
    ok("over-budget shows a warning", warned === 1, "count " + warned);
    const sub = await page.evaluate(() => document.getElementById("diff-sub").textContent);
    ok("over-budget subtitle reads 'over budget'", /over budget/.test(sub), sub);
  }
  {
    await setup({
      blended: false, weeks: 15, credits: 3, study: 2,
      reading: 0, writing: 0, activities: { l_blog: 1 }
    });
    const cls = await page.evaluate(() => document.getElementById("tile-diff").className);
    ok("under-budget tile is calm, not red", cls.trim() === "total", cls);
    const bg = await page.evaluate(() =>
      getComputedStyle(document.getElementById("tile-diff")).backgroundColor);
    ok("under-budget tile is Light Blue", bg === "rgb(222, 240, 249)", bg);
    const noted = await page.$$eval("#balance-msg .note", e => e.length);
    ok("under-budget shows a note", noted === 1, "count " + noted);
  }

  /* ===== 8. Where the fields live, and what the tiles show =====
     The academic-work field moved out of the format card (where it appeared only
     for a blended course) and is now always visible. October 14, 2026: credits
     and course length moved the other way, into the format card, leaving the
     right-hand card as Course structure — the standard's figures plus the two
     fields that describe the work. The tiles key off the number, not the format. */
  {
    await setup({ format: "async", weeks: 15, credits: 3, study: 2 });
    const place = await page.evaluate(() => {
      const credits = document.getElementById("credits");
      const weeks = document.getElementById("weeks");
      const f2f = document.getElementById("f2f");
      const card = f2f.closest("section");
      const fmtCard = credits.closest("section");
      return {
        oldWrapper: !!document.getElementById("wrap-f2f"),
        visible: !!f2f.offsetParent,
        sameCard: card === fmtCard,
        heading: card.querySelector("h3").textContent,
        fmtHeading: fmtCard.querySelector("h3").textContent,
        weeksWithCredits: weeks.closest("section") === fmtCard,
        creditsBeforeFormat: !!(credits.compareDocumentPosition(
          document.getElementById("fmt-sync")) & Node.DOCUMENT_POSITION_FOLLOWING),
        creditsFirst: !!(credits.compareDocumentPosition(f2f) &
          Node.DOCUMENT_POSITION_FOLLOWING),
        label: document.querySelector('label[for="f2f"]').textContent,
        weeksLabel: document.querySelector('label[for="weeks"]').textContent
      };
    });
    ok("the blended-only wrapper is gone", place.oldWrapper === false);
    ok("the academic-work field is visible in an asynchronous course", place.visible === true);
    // October 15, 2026: the format choices moved to their own full-width card
    // below the pair, so the card holding credits and length is Course basics.
    ok("credits sit in the Course basics card",
      /Course basics/.test(place.fmtHeading), place.fmtHeading);
    ok("course length sits with the credits", place.weeksWithCredits === true);
    ok("the length field is labelled course length", /Course length/.test(place.weeksLabel),
      place.weeksLabel);
    ok("credits and length come before the format choices", place.creditsBeforeFormat === true);
    /* October 15, 2026: Course format and Course structure swapped places.
       Format pairs with Course basics at the top -- what the course is -- and
       Course structure runs full width below it, holding the two work fields. */
    const cards = await page.evaluate(() => {
      const pair = document.querySelector(".two-col");
      const fmt = document.getElementById("fmt-sync").closest("section");
      const struct = document.getElementById("f2f").closest("section");
      return {
        fmtHeading: fmt.querySelector("h3").textContent,
        structHeading: struct.querySelector("h3").textContent,
        fmtInPair: pair.contains(fmt),
        fmtFullWidth: fmt.classList.contains("card-full"),
        structInPair: pair.contains(struct),
        structFullWidth: struct.classList.contains("card-full"),
        structBelowPair: !!(pair.compareDocumentPosition(struct) &
          Node.DOCUMENT_POSITION_FOLLOWING),
        structAboveHow: !!(struct.compareDocumentPosition(document.getElementById("s-how")) &
          Node.DOCUMENT_POSITION_FOLLOWING)
      };
    });
    ok("the format choices have their own card", /Course format/.test(cards.fmtHeading),
      cards.fmtHeading);
    ok("the format card pairs with Course basics", cards.fmtInPair === true);
    ok("and is not full width", cards.fmtFullWidth === false);
    ok("Course structure holds the work fields", /Course structure/.test(cards.structHeading),
      cards.structHeading);
    ok("it sits outside the two-column pair", cards.structInPair === false);
    ok("it runs full width", cards.structFullWidth === true);
    ok("below both of the paired cards", cards.structBelowPair === true);
    ok("and above How this is calculated", cards.structAboveHow === true);
    ok("the academic-work field sits in the Course structure card",
      !place.sameCard && /Course structure/.test(place.heading), place.heading);
    ok("the academic-work field still follows the credits", place.creditsFirst === true);
    ok("meeting hours are not labelled face-to-face",
      !/face-to-face/i.test(place.label), place.label);
    ok("the field is labelled in minutes",
      /minutes per week/.test(place.label), place.label);
    // Renamed October 14, 2026: the field covers monitored asynchronous work as
    // well as meetings, so neither the label nor the vocabulary on the tile may
    // narrow back to meetings only.
    ok("the field is labelled Academic Work",
      /\bAcademic Work\b/.test(place.label), place.label);
    await setup({ format: "blended", weeks: 15, credits: 3, study: 2, f2f: 3 });
    const echo = await page.evaluate(() => ({
      field: document.getElementById("f2f").value,
      tile: document.querySelector("#tile-f2f .desc").textContent,
      lab: document.querySelector("#tile-f2f .lab").textContent,
      hours: document.getElementById("f2f-hours") === null
    }));
    ok("the field's own hours echo is gone", echo.hours === true);
    ok("the tile repeats the minutes entered",
      echo.field === "150" && /150 minutes a week/.test(echo.tile), JSON.stringify(echo));
    ok("the tile says scheduled or monitored", /scheduled or monitored/.test(echo.tile), echo.tile);
    ok("the tile is labelled planned academic work",
      /Planned academic work/.test(echo.lab), echo.lab);

    /* The panel explaining where the minimums come from. It printed a live
       sentence of its own until October 16, 2026, saying the same thing as the
       #minimums line below the fields, so Maka dropped it; what the figures must
       be is checked against #minimums instead, further down. The panel is still
       the page's only account of the arithmetic and of the three sources it
       rests on. */
    const minPanel = await page.evaluate(() => {
      const d = Array.from(document.querySelectorAll("details.guide"))
        .find(x => /minimums are calculated/i.test(x.querySelector("summary").textContent));
      const card = d && d.closest("section");
      return {
        inGuide: !!(d && d.classList.contains("guide")),
        summary: d && d.querySelector("summary").textContent.trim(),
        open: d && d.open,
        inBasicsCard: !!(card && /Course basics/.test(card.querySelector("h3").textContent)),
        lastInCard: d === card.querySelector(".card-body").lastElementChild,
        afterGuidance: !!(card.querySelector(".card-guidance").compareDocumentPosition(d) &
          Node.DOCUMENT_POSITION_FOLLOWING),
        headed: !!(d && d.querySelector("summary > h4"))
      };
    });
    ok("the worked example sits in a .guide panel", minPanel.inGuide === true);
    ok("the panel is named for what it explains",
      minPanel.summary === "How these minimums are calculated.", minPanel.summary);
    ok("the panel starts collapsed", minPanel.open === false);
    /* October 16, 2026: the panel closes the Course basics card, under the
       minimums it explains, rather than sitting in How this is calculated. */
    ok("the panel closes the Course basics card", minPanel.inBasicsCard === true);
    ok("it is the last thing in that card", minPanel.lastInCard === true);
    ok("and sits below the minimums it explains", minPanel.afterGuidance === true);
    ok("the panel's summary wraps a heading", minPanel.headed === true);
    ok("the panel no longer prints a live figure of its own",
      (await page.evaluate(() => document.getElementById("course-hours") === null)) === true);
    /* The panel is where the three sources are cited. Losing them would leave
       the page asserting a legal minimum with nothing behind it. */
    const sources = await page.evaluate(() => {
      const d = Array.from(document.querySelectorAll("details.guide"))
        .find(x => /minimums are calculated/i.test(x.querySelector("summary").textContent));
      return Array.from(d.querySelectorAll("a")).map(a => a.href);
    });
    ok("it cites the federal rule", sources.some(h => /ecfr\.gov/.test(h)), sources.join(" "));
    ok("it cites the New Jersey code", sources.some(h => /nj\.gov/.test(h)), sources.join(" "));
    ok("it cites the Rutgers policy", sources.some(h => /senate\.rutgers\.edu/.test(h)),
      sources.join(" "));
    /* The block closing the Course basics card: the live minimums for the course
       as set up, then a standing caveat that these are floors a department may
       raise, pointing at the panel that shows the arithmetic. The fixed
       one-credit sentence was dropped from it on October 16, 2026 -- the panel
       carries that. */
    const rateLine = await page.evaluate(() => {
      const el = document.querySelector(".card-guidance");
      return {
        text: el.textContent.replace(/\s+/g, " ").trim(),
        card: el.closest("section").querySelector("h3").textContent,
        paras: el.querySelectorAll("p").length,
        belowFields: !!(document.getElementById("weeks").compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING),
        holdsLive: el.contains(document.getElementById("minimums"))
      };
    });
    ok("the closing block is in the Course basics card",
      /Course basics/.test(rateLine.card), rateLine.card);
    ok("and sits below the two fields", rateLine.belowFields === true);
    ok("it holds the live minimums line", rateLine.holdsLive === true);
    ok("it opens with the minimums, not a fixed rate",
      /^Based on the entered credits \(/.test(rateLine.text), rateLine.text);
    /* The caveat has to keep pointing somewhere real: it names the panel by
       title, so a rename of that panel must break this. */
    /* Matched on the idea, not the sentence: the caveat has to say the figures
       are a floor a department may raise. Its exact wording is Maka's and has
       changed more than once, so pinning the phrasing only produces failures
       that mean nothing. */
    ok("it carries the departmental caveat",
      /federal and state/i.test(rateLine.text) &&
      /department.{0,40}additional requirements/i.test(rateLine.text), rateLine.text);
    /* The caveat pointed the reader at a panel by title until October 16, 2026,
       when the panel moved directly underneath it and the cross-reference came
       out. A reference that names a panel has to name one that exists, so if a
       quoted title comes back here it must match a real summary. */
    const caveatTarget = await page.evaluate(() => {
      const names = Array.from(document.querySelectorAll("details.guide summary"))
        .map(x => x.textContent.trim().replace(/\.$/, ""));
      const txt = document.querySelector(".card-guidance").textContent;
      const quoted = (txt.match(/"([^"]+)"/) || [])[1] || null;
      return { quoted, names };
    });
    ok("the caveat does not send the reader elsewhere",
      caveatTarget.quoted === null ||
      caveatTarget.names.indexOf(caveatTarget.quoted.replace(/\.$/, "")) !== -1,
      String(caveatTarget.quoted) + " vs " + caveatTarget.names.join(" | "));
    ok("the rest of the old intro is not back with it",
      !/multiply those minimums/.test(rateLine.text) && !/For shorter terms/.test(rateLine.text),
      rateLine.text);
    ok("the block is the two paragraphs and no more", rateLine.paras === 2,
      "n " + rateLine.paras);

    /* The old per-field echoes are gone with the restructure. */
    const goneIds = await page.evaluate(() => ({
      creditDef: document.getElementById("credit-def") === null,
      weeksAccel: document.getElementById("weeks-accel") === null
    }));
    ok("the per-field credit echo is gone", goneIds.creditDef === true);
    ok("the per-field semester echo is gone", goneIds.weeksAccel === true);

    /* October 15, 2026: both minimums are stated in one sentence closing the
       Course basics card, under the credits and length that produce them. Each
       field then carries only its own notice, which names the gap in minutes, so
       no figure is printed twice. The minimum is credits x the statutory rate x
       the acceleration rate, so a short term raises it. */
    const minimum = (noticeId) => page.evaluate((n) => {
      const line = document.getElementById("minimums");
      const notice = document.getElementById(n);
      return {
        lineHidden: line.hidden,
        text: line.textContent.replace(/\s+/g, " ").trim(),
        shown: notice.hidden === false,
        // .warn is the red shortfall; .note is the calm over-minimum message.
        under: notice.hidden === false && notice.className === "warn",
        over: notice.hidden === false && notice.className === "note",
        noticeText: notice.textContent.replace(/\s+/g, " ").trim()
      };
    }, noticeId);
    const work = () => minimum("f2f-min");
    const extra = () => minimum("study-min");

    await setup({ format: "blended", weeks: 15, credits: 3, study: 2, f2f: 3 });
    const atMin = await work();
    ok("one sentence states both minimums and both course totals",
      atMin.text === "Based on the entered credits (3) and course length (15 weeks), the minimum " +
      "required academic work is 150 minutes (2 hours and 30 minutes) per week and the minimum " +
      "additional student work is 300 minutes (5 hours) per week, for a total of 37 hours and " +
      "30 minutes of academic work and 75 hours of additional student work across the entire " +
      "course.", atMin.text);
    ok("the sentence closes the Course basics card",
      (await page.evaluate(() => document.getElementById("minimums")
        .closest("section").querySelector("h3").textContent)) === "Course basics");
    ok("the per-field minimum lines are gone",
      (await page.evaluate(() => document.getElementById("f2f-req") === null &&
        document.getElementById("study-req") === null)) === true);
    ok("at the minimum, no shortfall notice", atMin.under === false);
    ok("at the minimum, no student-work shortfall", (await extra()).under === false);
    ok("at the minimum, nothing is shown at all", atMin.shown === false);

    // Over the minimum: a note, not a warning, naming the gap.
    /* The stated minimum is the statute's 100 minutes per credit, not the study
       field, which is what this course expects rather than what is required.
       This was guarded on the panel's own line until that line went. */
    await setup({ format: "blended", weeks: 15, credits: 3, study: 3, f2f: 3 });
    ok("the study field does not move the stated minimum",
      /additional student work is 300 minutes \(5 hours\) per week/.test((await work()).text),
      (await work()).text);
    await setup({ format: "blended", weeks: 15, credits: 0.5, study: 2, f2f: 1 });
    ok("a half credit halves both minimums",
      /credits \(0\.5\)/.test((await work()).text) &&
      /academic work is 25 minutes per week and the minimum additional student work is 50 minutes/
        .test((await work()).text), (await work()).text);
    ok("and halves both course totals",
      /total of 6 hours and 15 minutes of academic work and 12 hours and 30 minutes of additional student work/
        .test((await work()).text), (await work()).text);
    // A one-week term reads in the singular.
    await setup({ format: "blended", weeks: 1, credits: 3, study: 2, f2f: 45 });
    ok("a one-week term reads in the singular",
      /course length \(1 week\),/.test((await work()).text), (await work()).text);

    await setup({ format: "blended", weeks: 15, credits: 3, study: 2, f2f: 4 });
    const over = await work();
    ok("above the minimum, no shortfall warning", over.under === false);
    ok("above the minimum, a calm note instead", over.over === true);
    ok("the note names the surplus and says it is allowed",
      over.noticeText === "You have entered 50 minutes more than is required. You may wish to " +
      "reduce the academic work, but this is not required.", over.noticeText);

    // Under the minimum: the red warning, naming what is still owed.
    await setup({ format: "blended", weeks: 15, credits: 3, study: 2, f2f: 2 });
    const under = await work();
    ok("below the minimum, the shortfall warning appears", under.under === true);
    ok("the warning names the minutes still owed",
      under.noticeText === "You will need to provide an additional 50 minutes to meet the " +
      "required minimums.", under.noticeText);

    // The student-work notices are the same two messages, naming their own field.
    await setup({ format: "blended", weeks: 15, credits: 3, f2f: 3, studyMin: 200 });
    ok("student work short gets the warning",
      (await extra()).under === true && (await extra()).noticeText ===
      "You will need to provide an additional 100 minutes to meet the required minimums.",
      (await extra()).noticeText);
    await setup({ format: "blended", weeks: 15, credits: 3, f2f: 3, studyMin: 360 });
    ok("student work over gets the note",
      (await extra()).over === true && (await extra()).noticeText ===
      "You have entered 60 minutes more than is required. You may wish to reduce the " +
      "additional student work, but this is not required.", (await extra()).noticeText);

    /* The two fields are judged independently: extra academic work neither
       cancels a student-work shortfall nor creates one. */
    await setup({ format: "blended", weeks: 15, credits: 3, f2f: 20, studyMin: 200 });
    const lopsided = { work: await work(), extra: await extra() };
    ok("a big academic-work surplus leaves the student-work warning standing",
      lopsided.extra.under === true &&
      /additional 100 minutes/.test(lopsided.extra.noticeText), lopsided.extra.noticeText);
    ok("and the academic-work note is about academic work alone",
      lopsided.work.over === true && /reduce the academic work/.test(lopsided.work.noticeText),
      lopsided.work.noticeText);
    await setup({ format: "blended", weeks: 15, credits: 3, f2f: 1, studyMin: 300 });
    ok("an academic-work shortfall does not disturb student work at its minimum",
      (await extra()).shown === false && (await work()).under === true);

    // A one-minute gap reads in the singular.
    await setup({ format: "blended", weeks: 15, credits: 3, f2f: 3, studyMin: 299 });
    ok("one minute short reads in the singular",
      /an additional 1 minute to meet/.test((await extra()).noticeText), (await extra()).noticeText);
    await setup({ format: "blended", weeks: 15, credits: 3, f2f: 3, studyMin: 301 });
    ok("one minute over reads in the singular",
      /entered 1 minute more than is required/.test((await extra()).noticeText),
      (await extra()).noticeText);

    // A 5-week 3-credit course: 150 x (15/5) = 450 minutes a week of academic
    // work, and 300 x 3 = 900 of student work.
    await setup({ format: "blended", weeks: 5, credits: 3, study: 2, f2f: 3.6 });
    const short5 = await work();
    ok("an accelerated term raises the stated minimum",
      short5.under === true &&
      /academic work is 450 minutes \(7 hours and 30 minutes\) per week/.test(short5.text),
      short5.text);
    ok("the student-work minimum accelerates too",
      /additional student work is 900 minutes \(15 hours\) per week,/.test(short5.text),
      short5.text);
    ok("the entered setup is echoed in the sentence",
      /^Based on the entered credits \(3\) and course length \(5 weeks\),/.test(short5.text),
      short5.text);
    /* The course totals are what the credits are worth: a 5-week term carries
       the same 37:30 and 75 hours as a 15-week one, in fewer weeks. If these
       ever track the length field the sentence starts contradicting itself. */
    ok("but the course totals do not",
      /total of 37 hours and 30 minutes of academic work and 75 hours of additional student work across the entire course\.$/
        .test(short5.text), short5.text);
    /* Minutes are what the box takes, so they lead; a fractional rate is rounded
       to the nearest whole minute. A 7-week 3-credit course owes 321.43. */
    await setup({ format: "blended", weeks: 7, credits: 3, study: 2, f2f: 3 });
    ok("a fractional rate rounds to whole minutes",
      /academic work is 321 minutes \(5 hours and 21 minutes\) per week/.test((await work()).text),
      (await work()).text);
    /* Under an hour the bracket would only repeat the minutes, so it is dropped. */
    await setup({ format: "blended", weeks: 15, credits: 1, study: 2, f2f: 1 });
    ok("under an hour the minimum is minutes alone",
      /academic work is 50 minutes per week and/.test((await work()).text), (await work()).text);
    await setup({ format: "blended", weeks: 5, credits: 3, study: 2, f2f: 9 });
    ok("meeting the accelerated minimum clears the notice", (await work()).shown === false);

    // The student-work field is taken as entered, so a flat weekly figure in a
    // short term falls short and must be flagged.
    await setup({ format: "blended", weeks: 5, credits: 3, f2f: 9, studyMin: 300 });
    const flat = await extra();
    ok("a flat weekly figure falls short in a 5-week term", flat.under === true);
    ok("entered student work is not accelerated",
      (await week()).studyHours === 5, String((await week()).studyHours));
    await setup({ format: "blended", weeks: 5, credits: 3, f2f: 9, studyMin: 900 });
    ok("meeting the accelerated student-work minimum clears it", (await extra()).shown === false);

    // Below 1 week nothing is calculated and the warnings block says so; neither
    // the line nor the notice may add a figure derived from a zero rate.
    await setup({ format: "blended", weeks: 0, credits: 3, study: 2, f2f: 1 });
    const none = await work();
    ok("no shortfall notice below 1 week", none.shown === false);
    ok("no minimum stated below 1 week", none.lineHidden === true);

    // The explanatory paragraph became its own panel.
    const workPanel = await page.evaluate(() => {
      const d = Array.from(document.querySelectorAll("details.guide"))
        .find(x => /What counts as Academic Work/.test(x.querySelector("summary").textContent));
      return d ? {
        headed: !!d.querySelector("summary > h4"),
        open: d.open,
        inField: !!d.closest(".field"),
        inHowSection: /How this is calculated/.test(d.closest("section").querySelector("h3").textContent),
        text: d.textContent.replace(/\s+/g, " ")
      } : null;
    });
    ok("the academic-work paragraph has its own panel", workPanel !== null);
    ok("that panel's summary wraps a heading", workPanel && workPanel.headed === true);
    ok("that panel starts collapsed", workPanel && workPanel.open === false);
    ok("that panel is no longer inside the academic-work field",
      workPanel && workPanel.inField === false);
    ok("that panel keeps the WeVideo example",
      workPanel && /1 hour WeVideo lecture/.test(workPanel.text));
    ok("that panel moved to the How this is calculated section",
      workPanel && workPanel.inHowSection === true);
    /* Course basics and Course format each close with exactly one panel --
       the minimums, and what counts as instructional time. Course structure
       carries none. More than one in any of them means a panel landed in the
       wrong card. */
    const cardGuides = await page.evaluate(() => ({
      structure: Array.from(document.querySelectorAll(
        'section[aria-labelledby="s-structure"] details.guide summary')).map(x => x.textContent.trim()),
      format: Array.from(document.querySelectorAll(
        'section[aria-labelledby="s-format"] details.guide summary')).map(x => x.textContent.trim()),
      basics: Array.from(document.querySelectorAll(
        'section[aria-labelledby="s-basics"] details.guide summary')).map(x => x.textContent.trim())
    }));
    ok("Course format carries just the instructional-time panel",
      cardGuides.format.length === 1 && /instructional time/i.test(cardGuides.format[0]),
      cardGuides.format.join(" | "));
    ok("Course basics carries just the minimums panel",
      cardGuides.basics.length === 1 && /minimums are calculated/i.test(cardGuides.basics[0]),
      cardGuides.basics.join(" | "));
    ok("Course structure carries none", cardGuides.structure.length === 0,
      cardGuides.structure.join(" | "));

    // The tiles key off the number, not the format, so the no-work case is the
    // field at zero rather than a format choice.
    await setup({ format: "async", weeks: 15, credits: 3, study: 2, f2f: 0 });
    let v = await page.evaluate(() => ({
      f2fTile: document.getElementById("tile-f2f").hidden,
      onlineTile: document.getElementById("tile-online").hidden,
      label: document.getElementById("lab-instr").textContent
    }));
    ok("no planned work: academic-work tile hidden", v.f2fTile === true);
    ok("no planned work: self-paced-total tile hidden", v.onlineTile === true);
    ok("no planned work: instructional label", v.label === "Instructional activities", v.label);
    let d = await page.evaluate(() => document.getElementById("desc-instr").textContent);
    ok("no planned work: instructional described as academic work or its equivalent",
      /planned academic work, or its self-paced equivalent/.test(d), d);

    await setup({ format: "blended", weeks: 15, credits: 3, study: 2, f2f: 1 });
    v = await page.evaluate(() => ({
      f2fTile: document.getElementById("tile-f2f").hidden,
      onlineTile: document.getElementById("tile-online").hidden,
      label: document.getElementById("lab-instr").textContent
    }));
    ok("meetings: meetings tile shown", v.f2fTile === false);
    ok("meetings: self-paced-total tile shown", v.onlineTile === false);
    ok("meetings: label switches", v.label === "Self-paced instructional", v.label);
    d = await page.evaluate(() => document.getElementById("desc-instr").textContent);
    ok("meetings: instructional described as uncovered seat time",
      /seat time your planned work/.test(d), d);
    const f2fDesc = await page.evaluate(() =>
      document.querySelector("#tile-f2f .desc").textContent);
    ok("the academic-work tile names both kinds of time",
      /50 minutes a week, scheduled or monitored/.test(f2fDesc), f2fDesc);

    // the explainer card must say what instructional time is, and that it isn't homework
    const card = await page.evaluate(() => {
      const s = Array.from(document.querySelectorAll("details summary"))
        .find(x => /instructional time/i.test(x.textContent));
      if (!s) return null;
      const d = s.parentElement;
      const sec = d.closest("section");
      const body = sec.querySelector(".card-body");
      return {
        open: d.open,
        text: d.textContent.replace(/\s+/g, " "),
        card: sec.querySelector("h3").textContent,
        last: !!(body && d === body.lastElementChild)
      };
    });
    ok("explainer panel for instructional time exists", !!card);
    /* October 16, 2026: moved from How this is calculated to the foot of the
       Course format card, under the three delivery choices. */
    ok("the explainer closes the Course format card",
      card && /Course format/.test(card.card), card && card.card);
    ok("it is the last thing in that card", card && card.last === true);
    // Collapsed by default as of August 12, 2026 (Maka's call). The panel
    // itself must stay — without it nothing on the page says the
    // instructional row means seat time — but whether it starts open is a
    // presentation choice, so this no longer asserts a state.
    ok("explainer says seat time", card && /seat time/.test(card.text));
    ok("explainer covers the self-paced case", card && /asynchronous equivalent/.test(card.text));
    ok("explainer says planned academic work covers seat time directly",
      card && /planned academic work covers it directly/.test(card.text));
    ok("explainer counts monitored asynchronous material",
      card && /monitored and documented/.test(card.text));
    ok("explainer counts a live online meeting the same as a room",
      card && /live online meeting counts the same/.test(card.text));
    ok("explainer says the credit hour is a minimum, not a ceiling",
      card && /minimum rather than a ceiling/.test(card.text));
    ok("explainer rules out homework", card && /not.{0,3} homework/.test(card.text), card && card.text.slice(-90));

    const rowNames = await page.$$eval("#weekrows tr td:first-child", e => e.map(x => x.textContent));
    ok("blended table has 4 rows incl. total", rowNames.length === 4, rowNames.join("|"));
    ok("blended table lists the academic-work row",
      rowNames[0] === "Planned academic work", rowNames[0]);
    ok("blended table lists the self-paced row",
      rowNames[1] === "Self-paced instructional", rowNames[1]);
    ok("blended table ends with Total", rowNames[3] === "Total", rowNames[3]);
  }

  /* ===== 8b. Choosing a format fills the meeting hours ===== */
  {
    await page.evaluate(() => localStorage.removeItem("uoes-credit-hour-planner"));
    await page.reload();
    const d = await page.evaluate(() => ({
      sync: document.getElementById("fmt-sync").checked,
      f2f: document.getElementById("f2f").value,
      credits: document.getElementById("credits").value,
      options: Array.from(document.querySelectorAll('input[name="format"]')).map(r => r.value)
    }));
    ok("three formats on the synchronous axis",
      d.options.join(",") === "sync,blended,async", d.options.join(","));
    ok("default format is synchronous", d.sync === true);
    ok("academic-work minutes default to the credit hours x 50", d.f2f === String(Number(d.credits) * 50),
      d.f2f + " vs " + d.credits);

    const pick = (id) => page.evaluate((id) => {
      const r = document.getElementById(id);
      r.checked = true;
      r.dispatchEvent(new Event("change", { bubbles: true }));
      return document.getElementById("f2f").value;
    }, id);
    const type = (id, v) => page.evaluate(([id, v]) => {
      const e = document.getElementById(id);
      e.value = v;
      e.dispatchEvent(new Event("input", { bubbles: true }));
      return document.getElementById("f2f").value;
    }, [id, v]);

    /* October 15, 2026: the format choice writes nothing at all. It briefly
       preset the academic-work field to the minimum, which trackSetup already
       maintains, so the only thing the preset could still do was discard a number
       the user had entered deliberately. All three formats owe the same minimum;
       what differs is how the work is delivered, which is the business of the
       text beside each choice. */
    await type("f2f", "275");
    await type("study", "410");
    for (const id of ["fmt-async", "fmt-blended", "fmt-sync", "fmt-async"]) {
      ok("choosing " + id + " leaves the academic-work field alone",
        (await pick(id)) === "275");
    }
    ok("and leaves the student-work field alone",
      (await page.evaluate(() => document.getElementById("study").value)) === "410");
    /* Nothing below reads the format except the saved plan and the report, so the
       weekly figures must not move either. */
    const beforeFmt = await week();
    await pick("fmt-blended");
    const afterFmt = await week();
    near("the weekly total does not move with the format",
      afterFmt.totalHours, beforeFmt.totalHours, 1e-9);
    await type("f2f", "150");
    await type("study", "300");

    const followed = await type("credits", "4");
    ok("academic-work minutes follow the credits while untouched", followed === "200", followed);
    await type("f2f", "300");
    const left = await type("credits", "5");
    ok("a hand-set academic-work number is left alone", left === "300", left);
    const g = await week();
    near("a 5-credit course can meet for 6 hours", g.f2fHours, 50 * 6 / 60, 1e-9);

    /* Both work fields follow the course setup while they still hold the minimum
       for it (October 14, 2026). Course length drives them as well as credits:
       entering a 5-week term on a 3-credit course must put 450 and 900 in the
       boxes, matching the two readouts above them. */
    const fields = () => page.evaluate(() => ({
      f2f: document.getElementById("f2f").value,
      study: document.getElementById("study").value
    }));
    const typeIn = (id, v) => page.evaluate(([id, v]) => {
      const e = document.getElementById(id);
      e.value = v;
      e.dispatchEvent(new Event("input", { bubbles: true }));
    }, [id, v]);

    await page.evaluate(() => localStorage.removeItem("uoes-credit-hour-planner"));
    await page.reload();
    const fresh = await fields();
    ok("a fresh page starts both fields at the 15-week minimum",
      fresh.f2f === "150" && fresh.study === "300", JSON.stringify(fresh));
    await typeIn("weeks", "5");
    const five = await fields();
    ok("a 5-week term fills in 450 minutes of academic work", five.f2f === "450", five.f2f);
    ok("and 900 minutes of student work", five.study === "900", five.study);
    await typeIn("credits", "4");
    const four = await fields();
    ok("credits move both fields too",
      four.f2f === "600" && four.study === "1200", JSON.stringify(four));
    /* A fractional rate is written as the whole minutes the readout states. */
    await typeIn("credits", "3");
    await typeIn("weeks", "7");
    const seven = await fields();
    ok("a 7-week term rounds to whole minutes", seven.f2f === "321", seven.f2f);
    const req = () => page.evaluate(() => ({
      text: document.getElementById("minimums").textContent.replace(/\s+/g, " ").trim(),
      under: document.getElementById("f2f-min").className === "warn" &&
        document.getElementById("f2f-min").hidden === false
    }));
    ok("the field matches the figure stated for it",
      /academic work is 321 minutes/.test((await req()).text), (await req()).text);
    ok("no shortfall when the field holds the rounded minimum", (await req()).under === false);

    /* Once a field holds something that is not the minimum it is the user's. */
    await typeIn("f2f", "400");
    await typeIn("weeks", "15");
    const held = await fields();
    ok("a hand-set academic-work field stops following", held.f2f === "400", held.f2f);
    ok("the untouched student-work field keeps following", held.study === "300", held.study);

    /* A trip through an unusable length must not strand the fields. */
    await typeIn("weeks", "0");
    await typeIn("weeks", "5");
    ok("the still-tracking field survives a pass through 0 weeks",
      (await fields()).study === "900", (await fields()).study);

    await page.evaluate(() => localStorage.removeItem("uoes-credit-hour-planner"));
    await page.reload();
  }

  /* ===== 9. Suggested times are per-activity guidance, never bulk-applied =====
     Regression guard. A bulk-fill control totals every suggestion at once
     (32.8 hrs against a 7.5 hr budget), which misrepresents what the original
     workbook's per-cell tooltips meant. It must not come back. */
  {
    const bulk = await page.evaluate(() => ({
      byId: !!document.getElementById("btn-suggest"),
      byText: Array.from(document.querySelectorAll("button"))
        .filter(b => /fill|suggest|apply all/i.test(b.textContent)).map(b => b.textContent)
    }));
    ok("no bulk fill-with-suggestions button", bulk.byId === false);
    ok("no button offers to apply suggestions wholesale",
      bulk.byText.length === 0, bulk.byText.join(" | "));
    const dead = await page.$$eval("[data-suggest]", e => e.length);
    ok("no leftover data-suggest attributes", dead === 0, "n " + dead);

    // the suggestions themselves must still be visible on every row that has one
    const hints = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#learn-rows .sug, #assess-rows .sug"))
        .map(e => e.textContent));
    // 25 rows total (15 learning + 10 assessment), each with a suggestion or a note
    ok("per-row hints still shown on every row", hints.length === 25, "n " + hints.length);
    ok("suggestions read as per-activity guidance",
      hints.filter(h => /hours? suggested/.test(h)).length === 21,
      "n " + hints.filter(h => /hours? suggested/.test(h)).length);
    const podcastLabel = await page.evaluate(() =>
      document.querySelector('label[for="l_podcast"]').textContent);
    ok("Podcast typo from the workbook is fixed",
      /Podcast/.test(podcastLabel) && !/Poscast/.test(podcastLabel), podcastLabel);

    const guidance = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".lede")).map(e => e.textContent.replace(/\s+/g, " ")));
    ok("page says suggestions are not a checklist",
      guidance.some(g => /not a checklist/.test(g)), guidance.join(" || ").slice(0, 160));
    ok("page says a module combines a handful",
      guidance.some(g => /handful of these, not all of them/.test(g)));
  }

  /* ===== 10. localStorage round-trip and migration ===== */
  {
    await setup({ blended: true, weeks: 8, credits: 4, study: 3, f2f: 2,
                  reading: 1.5, writing: 2.25, activities: { l_wiki: 2, a_test: 1 } });
    await page.waitForTimeout(600);
    const stored = await page.evaluate(() => localStorage.getItem("uoes-credit-hour-planner"));
    ok("saves to the documented key", !!stored);
    const parsed = JSON.parse(stored);
    ok("stores the format choice", parsed.format === "blended", parsed.format);
    ok("stores f2f in minutes", parsed.f2f === "100", parsed.f2f);
    ok("stores the unit marker", parsed.f2fUnit === "min", parsed.f2fUnit);
    ok("stores activity rows", parsed.l_wiki === "2" && parsed.a_test === "1");

    const before = await week();
    await page.reload();
    const after = await week();
    near("weeks survive reload", after.totalHours, before.totalHours, 1e-9);
    const restored = await page.evaluate(() => ({
      blended: document.getElementById("fmt-blended").checked,
      f2f: document.getElementById("f2f").value,
      wiki: document.getElementById("l_wiki").value,
      reading: document.getElementById("rw_reading").value
    }));
    ok("format restored", restored.blended === true);
    ok("f2f restored", restored.f2f === "100", restored.f2f);
    ok("activity restored", restored.wiki === "2", restored.wiki);
    ok("reading restored", restored.reading === "1.5", restored.reading);

    // migration: a partial save from an older layout must not throw
    await page.evaluate(() => {
      localStorage.setItem("uoes-credit-hour-planner",
        JSON.stringify({ weeks: "12", credits: "3" }));
    });
    await page.reload();
    const partial = await page.evaluate(() => ({
      weeks: document.getElementById("weeks").value,
      study: document.getElementById("study").value,
      blended: document.getElementById("fmt-blended").checked,
      sync: document.getElementById("fmt-sync").checked
    }));
    ok("partial save loads", partial.weeks === "12", partial.weeks);
    ok("missing fields keep defaults", partial.study === "300", partial.study);

    /* Student-work unit migration (October 14, 2026). A save in the old
       hours-per-credit-per-week unit converts with the credits from that same
       save; one that already holds minutes but carries no marker must be left
       alone, or the conversion multiplies it by 50 x credits. */
    const reloadWith = async (obj) => {
      await page.evaluate((o) => {
        localStorage.setItem("uoes-credit-hour-planner", JSON.stringify(o));
      }, obj);
      await page.reload();
      return page.evaluate(() => document.getElementById("study").value);
    };
    ok("an old per-credit save converts to minutes",
      (await reloadWith({ weeks: "15", credits: "3", study: "2" })) === "300");
    ok("a half-credit old save converts too",
      (await reloadWith({ weeks: "15", credits: "0.5", study: "3" })) === "75");
    ok("a markerless save already in minutes is left alone",
      (await reloadWith({ weeks: "15", credits: "3", study: "300" })) === "300");
    ok("a marked save is taken as it stands",
      (await reloadWith({ weeks: "15", credits: "3", study: "450", studyUnit: "min" })) === "450");
    /* A week holds 10,080 minutes; anything above that is corrupt, including a
       value an older copy of this page wrote after converting twice. */
    ok("an impossible weekly figure resets to the default",
      (await reloadWith({ weeks: "15", credits: "3", study: "45000", studyUnit: "min" })) === "300");
    const bigF2f = await page.evaluate(async () => {
      localStorage.setItem("uoes-credit-hour-planner",
        JSON.stringify({ weeks: "15", credits: "3", f2f: "99999", f2fUnit: "min" }));
      return null;
    });
    await page.reload();
    ok("the same clamp covers the academic-work field",
      (await page.evaluate(() => document.getElementById("f2f").value)) === "150",
      await page.evaluate(() => document.getElementById("f2f").value), bigF2f);
    await page.evaluate(() => localStorage.removeItem("uoes-credit-hour-planner"));
    await page.reload();
    ok("missing format defaults to synchronous", partial.sync === true && partial.blended === false);

    // migration: "online" was the merged fully-online-or-traditional format,
    // which computed no meeting time at all. It becomes asynchronous, and any
    // meeting hours left over from a spell in blended are dropped rather than
    // silently switched on.
    await page.evaluate(() => {
      localStorage.setItem("uoes-credit-hour-planner",
        JSON.stringify({ format: "online", weeks: "15", credits: "3", study: "2", f2f: "2" }));
    });
    await page.reload();
    const migrated = await page.evaluate(() => ({
      async: document.getElementById("fmt-async").checked,
      f2f: document.getElementById("f2f").value
    }));
    ok("an old fully-online save becomes asynchronous", migrated.async === true);

    // migration: before September 10, 2026 f2f was saved in 50-minute academic
    // hours with no unit marker. Such a save is scaled to minutes on load; one
    // that already carries f2fUnit "min" is left exactly as saved.
    await page.evaluate(() => {
      localStorage.setItem("uoes-credit-hour-planner",
        JSON.stringify({ format: "blended", weeks: "15", credits: "3", study: "2", f2f: "1.6" }));
    });
    await page.reload();
    const scaled = await page.evaluate(() => document.getElementById("f2f").value);
    ok("an hours-based save is scaled to minutes", scaled === "80", scaled);
    near("and computes the same meeting time it always did", (await week()).f2fHours, 80 / 60, 1e-9);
    await page.evaluate(() => {
      localStorage.setItem("uoes-credit-hour-planner",
        JSON.stringify({ format: "blended", f2fUnit: "min", weeks: "15", credits: "3", study: "2", f2f: "160" }));
    });
    await page.reload();
    const kept = await page.evaluate(() => document.getElementById("f2f").value);
    ok("a minutes-based save is left alone", kept === "160", kept);
    await page.evaluate(() => {
      localStorage.setItem("uoes-credit-hour-planner",
        JSON.stringify({ format: "online", weeks: "15", credits: "3", study: "2", f2f: "2" }));
    });
    await page.reload();
    ok("its leftover meeting hours are dropped", migrated.f2f === "0", migrated.f2f);
    const mg = await week();
    near("the migrated save keeps its old numbers", mg.totalHours, 7.5, 1e-9);

    // corrupt save must not throw
    await page.evaluate(() => localStorage.setItem("uoes-credit-hour-planner", "{not json"));
    await page.reload();
    const survived = await page.evaluate(() => document.getElementById("weeks").value);
    ok("corrupt save is ignored", survived === "15", survived);
    await page.evaluate(() => localStorage.removeItem("uoes-credit-hour-planner"));
    await page.reload();
  }

  /* ===== 11. Start over ===== */
  {
    await setup({ blended: true, weeks: 6, credits: 4, study: 3, f2f: 1,
                  activities: { l_blog: 5 } });
    page.once("dialog", d => d.accept());
    await page.click("#btn-reset");
    const v = await page.evaluate(() => ({
      weeks: document.getElementById("weeks").value,
      blog: document.getElementById("l_blog").value,
      stored: localStorage.getItem("uoes-credit-hour-planner")
    }));
    ok("start over restores default weeks", v.weeks === "15", v.weeks);
    ok("start over clears activities", v.blog === "0", v.blog);
    ok("start over clears storage", v.stored === null || v.stored === undefined ||
       JSON.parse(v.stored).l_blog === "0", String(v.stored).slice(0, 40));
  }

  /* ===== 12. Report + copy text ===== */
  {
    await setup({ blended: true, weeks: 7, credits: 3, study: 2, f2f: 1,
                  reading: 2, writing: 1, activities: { l_blog: 1, a_quiz: 0.5 } });
    await page.click("#btn-report");
    const rep = await page.evaluate(() => {
      const w = document.getElementById("reportWrap");
      return { hidden: w.hidden, text: w.textContent };
    });
    ok("report becomes visible", rep.hidden === false);
    ok("report is not empty", rep.text.length > 300, "len " + rep.text.length);
    ok("report names the format", /Blended \/ hybrid/.test(rep.text));
    ok("report states the academic-work minutes and hours",
      /Academic work: +50 minutes per week \(0\.83 hours\)/.test(rep.text));
    ok("report labels the academic-work row", /Planned academic work/.test(rep.text));
    ok("report labels the self-paced budget",
      /Weekly self-paced hours available/.test(rep.text));
    ok("report shows the acceleration rate", /Acceleration rate: 2\.14/.test(rep.text));
    ok("report lists an entered activity", /Blog/.test(rep.text));
    ok("report lists readings from the reading input", /Readings/.test(rep.text));
    ok("report has the fit section", /DOES IT FIT\?/.test(rep.text));
    ok("report carries the license", /CC BY-NC-SA 4\.0/.test(rep.text));
    ok("report credits Ruth Ronan", /Ruth\s+Ronan at Rutgers University/.test(rep.text.replace(/\s+/g, " ")));

    const txt = await page.evaluate(() => window.__asText());
    ok("copy text matches report body", rep.text.indexOf(txt) !== -1);
    ok("copy text omits unentered activities", txt.indexOf("Wiki") === -1);
  }

  /* ===== 13. Print output is not blank ===== */
  {
    await page.click("#btn-report");
    await page.emulateMedia({ media: "print" });
    const vis = await page.evaluate(() => {
      const r = document.getElementById("reportWrap");
      const h = document.querySelector("header");
      return {
        report: getComputedStyle(r).display,
        header: getComputedStyle(h).display,
        reportH: r.getBoundingClientRect().height
      };
    });
    ok("print shows the report", vis.report !== "none", vis.report);
    ok("print hides the form chrome", vis.header === "none", vis.header);
    ok("print report has height", vis.reportH > 50, "h " + vis.reportH);

    const pdf = await page.pdf({ format: "Letter" });
    ok("print PDF is non-trivial", pdf.length > 5000, "bytes " + pdf.length);
    await page.emulateMedia({ media: "screen" });
  }

  /* ===== 14. Labels and ARIA ===== */
  {
    const a11y = await page.evaluate(() => {
      const problems = [];
      document.querySelectorAll("input, select").forEach(el => {
        if (el.type === "hidden") return;
        const hasLabel = !!document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
        if (!el.id) problems.push("input with no id");
        else if (!hasLabel && !aria) problems.push("no label: " + el.id);
      });
      const outputs = document.querySelectorAll("output").length;
      const liveRegions = document.querySelectorAll("[aria-live]").length;
      const status = document.querySelectorAll('[role="status"]').length;
      const sections = document.querySelectorAll("section[aria-labelledby]").length;
      const legend = document.querySelectorAll("fieldset legend").length;
      const inputCount = document.querySelectorAll("input, select").length;
      return { problems, outputs, liveRegions, status, sections, legend, inputCount };
    });
    ok("every input has a label", a11y.problems.length === 0, a11y.problems.join(", "));
    ok("has enough inputs to be the real page", a11y.inputCount >= 28, "n " + a11y.inputCount);
    ok("derived rows use <output>", a11y.outputs === 2, "n " + a11y.outputs);
    ok("has aria-live regions", a11y.liveRegions >= 2, "n " + a11y.liveRegions);
    ok("has a role=status for copy feedback", a11y.status === 1, "n " + a11y.status);
    ok("sections are labelled", a11y.sections >= 6, "n " + a11y.sections);
    ok("radio group has a legend", a11y.legend === 1, "n " + a11y.legend);
    /* Every id on the page must be unique. getElementById silently returns the
       first match, so a duplicate makes the render write to one element while
       the other keeps whatever static text it was authored with -- which is
       exactly how a caveat paragraph came to share the live minimums line's id
       on October 16, 2026, and neither harness noticed. */
    const dupeIds = await page.evaluate(() => {
      const seen = Object.create(null);
      const dupes = [];
      document.querySelectorAll("[id]").forEach((el) => {
        if (seen[el.id]) dupes.push(el.id);
        else seen[el.id] = true;
      });
      return dupes;
    });
    ok("every id on the page is unique", dupeIds.length === 0, dupeIds.join(", "));

    // computed, not textual: focus real elements and read the resolved outline
    for (const sel of ["#weeks", "#l_blog", "#btn-report", "#fmt-blended"]) {
      await page.focus(sel);
      const o = await page.evaluate((s) => {
        const cs = getComputedStyle(document.querySelector(s));
        return { color: cs.outlineColor, width: cs.outlineWidth, style: cs.outlineStyle };
      }, sel);
      ok("focus outline is Rutgers Blue on " + sel,
        o.color === "rgb(0, 127, 172)", o.color);
      ok("focus outline is 2px solid on " + sel,
        o.width === "2px" && o.style === "solid", o.width + " " + o.style);
    }

    // Scan every stylesheet: the print block lives in the page's own
    // sheet, which is not the first sheet the page links.
    const printRule = await page.evaluate(() =>
      Array.from(document.styleSheets)
        // Cross-origin sheets (the Google Fonts link in the site header)
        // throw on .cssRules however the browser is launched; skip them.
        .flatMap(s => { try { return Array.from(s.cssRules); } catch (e) { return []; } })
        .filter(r => r.media)
        .some(r => Array.from(r.cssRules)
          .some(x => x.selectorText === "main > :not(#reportWrap)")));
    ok("print CSS uses the main > :not(#reportWrap) pattern", printRule);
  }

  /* ===== 15. Design system ===== */
  {
    const design = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      const root = getComputedStyle(document.documentElement);
      // The measure is on <body>, as on the course planner (document.css).
      const step = getComputedStyle(document.querySelector("section.step"));
      const card = getComputedStyle(document.querySelector(".card"));
      const h1 = getComputedStyle(document.querySelector("h1"));
      return {
        font: cs.fontFamily, bg: cs.backgroundColor, color: cs.color,
        red: root.getPropertyValue("--red").trim(),
        blue: root.getPropertyValue("--blue").trim(),
        blueLight: root.getPropertyValue("--blue-light").trim(),
        maxWidth: cs.maxWidth,
        stepBorder: step.borderTopWidth + " " + step.borderTopStyle + " " + step.borderTopColor,
        stepRadius: step.borderTopLeftRadius,
        cardBorder: card.borderTopWidth + " " + card.borderTopStyle + " " + card.borderTopColor,
        cardRadius: card.borderTopLeftRadius,
        h1Align: h1.textAlign, h1Color: h1.color
      };
    });
    ok("Georgia serif", /Georgia/.test(design.font), design.font);
    ok("page background #f4f7f9", design.bg === "rgb(244, 247, 249)", design.bg);
    ok("body text #333", design.color === "rgb(51, 51, 51)", design.color);
    ok("Rutgers Red token", design.red === "#CC0033", design.red);
    ok("Rutgers Blue token", design.blue === "#007FAC", design.blue);
    ok("Light Blue token", design.blueLight === "#DEF0F9", design.blueLight);
    // Layout matches the course planner (September 11, 2026): a 900px
    // column of numbered white step cards with a 2px Rutgers Blue frame,
    // inner cards taking the planner's module-card treatment (a thin Mid
    // Blue border under a Light Blue header band), and a centred black h1.
    ok("900px measure like the course planner", design.maxWidth === "900px", design.maxWidth);
    ok("step cards 2px solid Rutgers Blue", design.stepBorder === "2px solid rgb(0, 127, 172)", design.stepBorder);
    ok("step cards 8px radius", design.stepRadius === "8px", design.stepRadius);
    ok("inner cards 1px solid Mid Blue", design.cardBorder === "1px solid rgb(125, 191, 214)", design.cardBorder);
    ok("inner cards 8px radius", design.cardRadius === "8px", design.cardRadius);
    ok("h1 is centred and black like the planner's",
      design.h1Align === "center" && design.h1Color === "rgb(51, 51, 51)",
      design.h1Align + " " + design.h1Color);

    const steps = await page.evaluate(() => ({
      count: document.querySelectorAll("section.step > details.step-body > summary > h2").length,
      open: Array.from(document.querySelectorAll("section.step > details.step-body")).map(d => d.open),
      nums: Array.from(document.querySelectorAll("section.step .step-num")).map(s => s.textContent.trim()),
      guides: document.querySelectorAll("details.guide").length
    }));
    ok("four numbered step cards, each heading its own disclosure",
      steps.count === 4 && steps.nums.join(",") === "1,2,3,4", steps.count + " " + steps.nums.join(","));
    ok("every step starts open", steps.open.every(Boolean), steps.open.join(","));
    // 5 panels: the two above the form ("Hints on how to use this tool." and
    // "Why we built this tool:") plus the three inside section 1 — what counts
    // as instructional time, the acceleration rate, and the note on the two
    // reading/writing numbers.
    // Two intro panels, the two in "How this is calculated", the Reading & writing
    // panel, and "How these minimums are calculated." in the Course structure card.
    // Two intro panels, the two in "How this is calculated", the Reading & writing
    // panel, and two in the Course structure card: "What counts as Academic Work"
    // and "How these minimums are calculated."
    ok("explanatory panels use the planner's .guide treatment", steps.guides === 7, "count " + steps.guides);

    // Repo convention: Mid Blue (#7DBFD6 = rgb(125,191,214)) fails the 3:1
    // non-text contrast requirement, so it must never carry an input border.
    // The inputs are boxed like the planner's since September 11, 2026 (a
    // 1px --rule border); before that they were underlined in Rutgers Blue.
    const underlines = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll("input, select").forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.borderBottomStyle === "none" || cs.borderBottomWidth === "0px") return;
        if (cs.borderBottomColor === "rgb(125, 191, 214)") bad.push(el.id + ":" + cs.borderBottomColor);
      });
      return bad;
    });
    ok("no input border uses Mid Blue", underlines.length === 0, underlines.join(", "));

    const derived = await page.evaluate(() => {
      const cs = getComputedStyle(document.getElementById("l_readings"));
      return { border: cs.borderBottomStyle, width: cs.borderBottomWidth };
    });
    ok("read-only rows are not styled like inputs",
      derived.border === "none" || derived.width === "0px",
      derived.border + " " + derived.width);
  }

  /* ===== 16. Links out ===== */
  {
    const links = await page.$$eval("a[href]", els => els.map(e => e.getAttribute("href")));
    ok("links to the local Learning Activity Estimator",
      links.includes("learning_activity_estimator.html"), links.join(" "));
    ok("credits the Rice original",
      links.some(h => /cte\.rice\.edu\/workload/.test(h)), links.join(" "));
    ok("links the CC licence",
      links.some(h => /creativecommons\.org\/licenses\/by-nc-sa\/4\.0/.test(h)));
    const ext = await page.$$eval('a[target="_blank"]', els =>
      els.every(e => /noopener/.test(e.getAttribute("rel") || "")));
    ok("external links carry rel=noopener", ext);

    const footer = await page.$eval("footer", e => e.textContent.replace(/\s+/g, " "));
    ok("footer credits Ruth Ronan",
      /Adapted from the Planning Time Calculator, initially developed by Ruth Ronan at Rutgers University\./.test(footer),
      footer.slice(0, 120));
    ok("footer keeps the workload estimator authors",
      /Betsy Barre, Allen Brown, and Justin Esarey/.test(footer));
    ok("footer keeps the license", /CC BY-NC-SA 4\.0/.test(footer));
  }

  /* ===== 17. No console errors ===== */
  ok("no page errors", consoleErrors.length === 0, consoleErrors.join(" | "));

  await browser.close();

  console.log("\n" + "=".repeat(60));
  console.log(`PASS ${pass}   FAIL ${fail}   (${pass + fail} checks)`);
  if (failures.length) {
    console.log("-".repeat(60));
    failures.forEach(f => console.log("  FAIL  " + f));
  }
  console.log("=".repeat(60));
  process.exit(fail ? 1 : 0);
})();
