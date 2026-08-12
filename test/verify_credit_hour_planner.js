/* Verification harness for credit_hour_planner.html
 *
 * Run: node verify.js
 *
 * Checks the ported math against an independent reimplementation of the
 * original Excel formulas, plus guards, persistence, a11y and print output.
 */
const { chromium } = require("playwright-core");
const path = require("path");

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
function excelWeek(weeks, credits, study, f2f) {
  const accel = weeks === 0 ? 0 : 15 / weeks;
  const H20 = 50 * f2f * 1;
  const H21 = 50 * (credits - f2f) * accel + (50 * accel * f2f - H20);
  const H22 = 50 * ((f2f + (credits - f2f)) * study) * accel;
  return {
    accel,
    f2fMin: H20, instrMin: H21, studyMin: H22,
    f2fHours: H20 / 60, instrHours: H21 / 60, studyHours: H22 / 60,
    onlineHours: (H21 + H22) / 60,
    totalHours: (H20 + H21 + H22) / 60,
    semesterHours: (H20 + H21 + H22) * weeks / 60
  };
}

/* Original fully-online block, rows 11-12, as its own transcription. */
function excelOnline(weeks, credits, study) {
  const accel = weeks === 0 ? 0 : 15 / weeks;
  const H11 = 50 * credits * accel;
  const H12 = 50 * (credits * study) * accel;
  return {
    accel, instrMin: H11, studyMin: H12,
    instrHours: H11 / 60, studyHours: H12 / 60,
    onlineHours: (H11 + H12) / 60,
    totalHours: (H11 + H12) / 60,
    semesterHours: (H11 + H12) * weeks / 60
  };
}

(async () => {
  // --allow-file-access-from-files: the page's CSS now lives in external
  // files under css/, and Chromium otherwise refuses to expose cssRules for
  // a file:// stylesheet, which the print-CSS check below reads.
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--allow-file-access-from-files"]
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", e => consoleErrors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });

  const file = "file://" + path.resolve(__dirname, "credit_hour_planner.html");
  await page.goto(file);

  const setup = async (o) => page.evaluate((o) => {
    const set = (id, v) => {
      const e = document.getElementById(id);
      e.value = String(v);
      e.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const fmt = document.getElementById(o.blended ? "fmt-blended" : "fmt-online");
    fmt.checked = true;
    fmt.dispatchEvent(new Event("change", { bubbles: true }));
    set("weeks", o.weeks); set("credits", o.credits); set("study", o.study);
    set("f2f", o.f2f === undefined ? 0 : o.f2f);
    if (o.reading !== undefined) set("rw_reading", o.reading);
    if (o.writing !== undefined) set("rw_writing", o.writing);
    if (o.activities) {
      Object.keys(o.activities).forEach(k => set(k, o.activities[k]));
    }
  }, o);

  const week = () => page.evaluate(() => window.__calcWeek());
  const mod  = () => page.evaluate(() => window.__calcModule());

  /* ================= 1. Fully online / traditional ================= */

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
    await setup({ ...c, blended: false });
    const got = await week();
    const exp = excelOnline(c.weeks, c.credits, c.study);
    const tag = `online w${c.weeks} c${c.credits} s${c.study}`;
    near(tag + " accel",      got.accel,         exp.accel,         1e-9);
    near(tag + " instr hrs",  got.instrHours,    exp.instrHours,    1e-9);
    near(tag + " study hrs",  got.studyHours,    exp.studyHours,    1e-9);
    near(tag + " total hrs",  got.totalHours,    exp.totalHours,    1e-9);
    near(tag + " sem hrs",    got.semesterHours, exp.semesterHours, 1e-9);
    near(tag + " online hrs", got.onlineHours,   exp.onlineHours,   1e-9);
    // Carnegie invariant: semester hours = 12.5 * credits * (1 + study)
    near(tag + " carnegie invariant", got.semesterHours,
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
    near(tag + " online hrs", got.onlineHours,   exp.onlineHours,   1e-9);
    near(tag + " carnegie invariant", got.semesterHours,
      12.5 * c.credits * (1 + c.study), 1e-9);
    near(tag + " parts sum to total",
      got.f2fHours + got.instrHours + got.studyHours, got.totalHours, 1e-9);
    ok(tag + " no warnings", got.warnings.length === 0, got.warnings.join("; "));
  }

  /* ===== 3. Blended with f2f = 0 must equal the fully-online block ===== */
  for (const c of [{ weeks: 15, credits: 3, study: 2 }, { weeks: 7, credits: 4, study: 3 }]) {
    await setup({ ...c, blended: true, f2f: 0 });
    const b = await week();
    await setup({ ...c, blended: false });
    const o = await week();
    near(`f2f=0 equivalence w${c.weeks} total`, b.totalHours, o.totalHours, 1e-9);
    near(`f2f=0 equivalence w${c.weeks} online budget`, b.onlineHours, o.onlineHours, 1e-9);
    near(`f2f=0 equivalence w${c.weeks} study`, b.studyHours, o.studyHours, 1e-9);
  }

  /* ===== 4. Face-to-face never accelerates; the shortfall moves online ===== */
  {
    await setup({ blended: true, weeks: 7, credits: 3, study: 2, f2f: 1 });
    const g = await week();
    near("f2f stays at 50 min/wk in a 7-week term", g.f2fHours, 50 / 60, 1e-9);
    // accelerated instructional requirement minus what the meeting covers
    const accel = 15 / 7;
    near("shortfall pushed to online instructional", g.instrHours,
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
  {
    await setup({ blended: true, weeks: 15, credits: 3, study: 2, f2f: 5 });
    const g = await week();
    ok("f2f > credits warns", g.warnings.length === 1, JSON.stringify(g.warnings));
    ok("f2f clamped, no negative instructional", g.instrHours >= 0, "got " + g.instrHours);
    near("f2f clamped to credit hours", g.f2fHours, 50 * 3 / 60, 1e-9);
    near("clamped total still Carnegie", g.semesterHours, 12.5 * 3 * 3, 1e-9);
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
    near("module budget = instructional + study", m.planned > 0 ? w.onlineHours : -1,
      w.instrHours + w.studyHours, 1e-9);

    const shown = await page.evaluate(() => ({
      budget: document.getElementById("out-budget").textContent,
      planned: document.getElementById("out-planned").textContent,
      diff: document.getElementById("out-diff").textContent,
      readingsRow: document.getElementById("l_readings").textContent,
      writingRow: document.getElementById("a_writing").textContent
    }));
    ok("budget tile matches calc", shown.budget === w.onlineHours.toFixed(2), shown.budget);
    ok("planned tile matches calc", shown.planned === m.planned.toFixed(2), shown.planned);
    ok("difference tile correct",
      shown.diff === (w.onlineHours - m.planned).toFixed(2), shown.diff);
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

  /* ===== 8. Conditional visibility ===== */
  {
    await setup({ blended: false, weeks: 15, credits: 3, study: 2 });
    let v = await page.evaluate(() => ({
      f2fField: document.getElementById("wrap-f2f").hidden,
      f2fTile: document.getElementById("tile-f2f").hidden,
      onlineTile: document.getElementById("tile-online").hidden,
      label: document.getElementById("lab-instr").textContent
    }));
    ok("online: f2f field hidden", v.f2fField === true);
    ok("online: f2f tile hidden", v.f2fTile === true);
    ok("online: online-total tile hidden", v.onlineTile === true);
    ok("online: instructional label", v.label === "Instructional activities", v.label);
    let d = await page.evaluate(() => document.getElementById("desc-instr").textContent);
    ok("online: instructional described as class time or its equivalent",
      /class time, or its online equivalent/.test(d), d);

    await setup({ blended: true, weeks: 15, credits: 3, study: 2, f2f: 1 });
    v = await page.evaluate(() => ({
      f2fField: document.getElementById("wrap-f2f").hidden,
      f2fTile: document.getElementById("tile-f2f").hidden,
      onlineTile: document.getElementById("tile-online").hidden,
      label: document.getElementById("lab-instr").textContent
    }));
    ok("blended: f2f field shown", v.f2fField === false);
    ok("blended: f2f tile shown", v.f2fTile === false);
    ok("blended: online-total tile shown", v.onlineTile === false);
    ok("blended: label switches", v.label === "Online instructional", v.label);
    d = await page.evaluate(() => document.getElementById("desc-instr").textContent);
    ok("blended: instructional described as uncovered seat time",
      /seat time your meetings/.test(d), d);
    const f2fDesc = await page.evaluate(() =>
      document.querySelector("#tile-f2f .desc").textContent);
    ok("blended: face-to-face described as scheduled meetings",
      /scheduled class meetings/.test(f2fDesc), f2fDesc);

    // the explainer card must say what instructional time is, and that it isn't homework
    const card = await page.evaluate(() => {
      const s = Array.from(document.querySelectorAll("details summary"))
        .find(x => /instructional time/i.test(x.textContent));
      return s ? { open: s.parentElement.open, text: s.parentElement.textContent.replace(/\s+/g, " ") } : null;
    });
    ok("explainer panel for instructional time exists", !!card);
    // Collapsed by default as of August 12, 2026 (Maka's call). The panel
    // itself must stay — without it nothing on the page says the
    // instructional row means seat time — but whether it starts open is a
    // presentation choice, so this no longer asserts a state.
    ok("explainer says seat time", card && /seat time/.test(card.text));
    ok("explainer covers the online case", card && /asynchronous equivalent/.test(card.text));
    ok("explainer covers the blended split", card && /face-to-face row is what you actually meet for/.test(card.text));
    ok("explainer rules out homework", card && /not.{0,3} homework/.test(card.text), card && card.text.slice(-90));

    const rowNames = await page.$$eval("#weekrows tr td:first-child", e => e.map(x => x.textContent));
    ok("blended table has 4 rows incl. total", rowNames.length === 4, rowNames.join("|"));
    ok("blended table lists face-to-face", rowNames[0] === "Face-to-face", rowNames[0]);
    ok("blended table ends with Total", rowNames[3] === "Total", rowNames[3]);
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
    ok("stores f2f", parsed.f2f === "2", parsed.f2f);
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
    ok("f2f restored", restored.f2f === "2", restored.f2f);
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
      blended: document.getElementById("fmt-blended").checked
    }));
    ok("partial save loads", partial.weeks === "12", partial.weeks);
    ok("missing fields keep defaults", partial.study === "2", partial.study);
    ok("missing format defaults to online", partial.blended === false);

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

    // Scan every stylesheet: the print block lives in css/calculator.css,
    // which is not necessarily the first sheet the page links.
    const printRule = await page.evaluate(() =>
      Array.from(document.styleSheets)
        .flatMap(s => Array.from(s.cssRules))
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
      const main = getComputedStyle(document.querySelector("main"));
      const card = getComputedStyle(document.querySelector(".card"));
      return {
        font: cs.fontFamily, bg: cs.backgroundColor, color: cs.color,
        red: root.getPropertyValue("--red").trim(),
        blue: root.getPropertyValue("--blue").trim(),
        blueLight: root.getPropertyValue("--blue-light").trim(),
        maxWidth: main.maxWidth,
        cardBorder: card.borderTopWidth + " " + card.borderTopStyle,
        cardRadius: card.borderTopLeftRadius
      };
    });
    ok("Georgia serif", /Georgia/.test(design.font), design.font);
    ok("page background #f4f7f9", design.bg === "rgb(244, 247, 249)", design.bg);
    ok("body text #333", design.color === "rgb(51, 51, 51)", design.color);
    ok("Rutgers Red token", design.red === "#CC0033", design.red);
    ok("Rutgers Blue token", design.blue === "#007FAC", design.blue);
    ok("Light Blue token", design.blueLight === "#DEF0F9", design.blueLight);
    ok("1080px max width like the estimator", design.maxWidth === "1080px", design.maxWidth);
    ok("cards 2px solid", design.cardBorder === "2px solid", design.cardBorder);
    ok("cards 8px radius", design.cardRadius === "8px", design.cardRadius);

    // Repo convention: Mid Blue (#7DBFD6 = rgb(125,191,214)) fails the 3:1
    // non-text contrast requirement, so it must never carry an input underline.
    const underlines = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll("input, select").forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.borderBottomStyle === "none" || cs.borderBottomWidth === "0px") return;
        if (cs.borderBottomColor !== "rgb(0, 127, 172)") bad.push(el.id + ":" + cs.borderBottomColor);
      });
      return bad;
    });
    ok("no input underline uses Mid Blue", underlines.length === 0, underlines.join(", "));

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
    ok("links to the local workload estimator",
      links.includes("workload_estimator.html"), links.join(" "));
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
