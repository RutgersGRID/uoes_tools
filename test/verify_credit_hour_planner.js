/* Verification harness for credit_hour_planner.html, the whole-course credit
 * hour planner (rebuilt October 21, 2026). The weekly-budget page it replaced,
 * kept for a day as old_credit_hour_planner.html, is in git history.
 *
 * Run: node test/verify_credit_hour_planner.js
 */
const { chromium } = require("playwright-core");
const path = require("path");
const { chromePath } = require("./_chrome.js");

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) pass++;
  else { fail++; failures.push(name + (detail !== undefined ? "  [" + detail + "]" : "")); }
}
const near = (a, b) => Math.abs(a - b) < 0.006;

const FILE = "file://" + path.resolve(__dirname, "..", "credit_hour_planner.html");
const KEY = "uoes-credit-hour-course";

(async () => {
  const browser = await chromium.launch({
    executablePath: chromePath(),
    args: ["--allow-file-access-from-files"]
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", d => d.accept());

  async function fresh() {
    await page.goto(FILE);
    await page.evaluate(() => localStorage.clear());
    await page.goto(FILE);
  }
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__state())));
  const result = () => page.evaluate(() => window.__update());
  const rowsLoc = () => page.locator(".inv-row");
  const row = i => page.locator(".inv-row").nth(i);
  async function setNum(id, v) { await page.fill("#" + id, String(v)); }
  async function addRow(name, type, count, each) {
    await page.click("#btn-add");
    const n = await rowsLoc().count();
    await row(n - 1).locator('[data-field="name"]').fill(name);
    if (type) await row(n - 1).locator('[data-field="type"]').selectOption(type);
    if (count != null) await row(n - 1).locator('[data-field="count"]').fill(String(count));
    if (each != null) await row(n - 1).locator('[data-field="each"]').fill(String(each));
  }

  await fresh();

  // ---------- structure ----------
  ok("title", (await page.title()) === "Credit Hour Planner");
  const heads = await page.$$eval("section.step h2", hs => hs.map(h => h.textContent.trim()));
  ok("three steps, in order",
    heads.length === 3 && /Your course/.test(heads[0]) && /Course activities/.test(heads[1]) &&
    /Course totals/.test(heads[2]), heads.join(" | "));
  ok("all three steps start open",
    await page.$$eval("details.step-body", ds => ds.length === 3 && ds.every(d => d.open)));
  ok("no weekly-budget leftovers",
    await page.evaluate(() => !document.getElementById("f2f") && !document.getElementById("study") &&
      !/acceleration|self-paced instructional/i.test(document.querySelector("main").innerText)));
  ok("no module-fit step", !(await page.evaluate(() => /Does the module fit/i.test(document.body.innerText))));
  /* October 21, 2026: the out-of-class explainer merged into the
     instructional-time one, which then moved back to the foot of the
     Course format card (Maka). */
  const explainers = await page.$$eval("details.guide summary", s => s.map(x => x.textContent.trim()).filter(t => /instructional time|out-of-class/i.test(t)));
  ok("one explainer covers both kinds of work",
    explainers.length === 1 && /What is, and isn't, instructional time/.test(explainers[0]), explainers.join(" | "));
  const exInfo = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll("details.guide summary")).find(x => /What is, and isn't, instructional time/.test(x.textContent));
    const d = s.parentElement, body = d.closest(".card-body");
    return { text: d.textContent.replace(/\s+/g, " "), card: d.closest("section").getAttribute("aria-labelledby"), last: !!body && body.lastElementChild === d };
  });
  const ex = exInfo.text;
  ok("explainer closes the Course format card", exInfo.card === "s-format" && exInfo.last, JSON.stringify(exInfo).slice(0, 120));
  ok("explainer keeps the monitored-async wording", /monitored and documented/.test(ex));
  ok("explainer defines out-of-class work", /Out-of-class work is distinct from instructional time/.test(ex) && /twice as much out-of-class work/.test(ex));
  ok("explainer says one activity can go either way", /can land on either side/.test(ex));
  ok("format card says what the choice sets up",
    /Class meetings/.test(await page.textContent(".format-effect")));
  /* October 21, 2026: the instructor-led bucket is "instructional time".
     "Academic work" means the whole credit hour in the NJ and Rutgers texts,
     so the page must not use it for the part. */
  ok("the page says instructional time, not academic work",
    await page.evaluate(() => !/academic work/i.test(document.querySelector("main").innerText) &&
      /Instructional time/.test(document.querySelector(".inv-row select[data-field=bucket]").innerText)));
  /* October 21, 2026: a "Next Steps" panel under the buttons points the
     finished plan at the Course Map Builder (Maka). The breaking-down
     hints panel came and went the same day. */
  const next = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll("details.guide summary")).find(x => /Next Steps/.test(x.textContent));
    if (!s) return null;
    const d = s.parentElement, actions = document.querySelector(".actions");
    const a = d.querySelector('a[href="course_planner.html"]');
    return {
      afterButtons: !!(actions.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING),
      inTotals: d.closest("section").getAttribute("aria-labelledby") === "h-check",
      link: !!a, newTab: a && a.target === "_blank" && /noopener/.test(a.rel),
      text: d.textContent.replace(/\s+/g, " ")
    };
  });
  ok("Next Steps panel sits under the buttons in Course totals", next && next.afterButtons && next.inTotals, JSON.stringify(next));
  ok("Next Steps links the Course Map Builder in a new tab", next && next.link && next.newTab);
  ok("Next Steps names the two save buttons", next && /Create printable summary/.test(next.text) && /Copy as text/.test(next.text));

  // ---------- minimums ----------
  let mt = await page.textContent("#minimums");
  ok("minimums: 3 credits -> 37h30 academic", /37 hours and 30 minutes of instructional time/.test(mt), mt);
  ok("minimums: 75 hours out-of-class", /75 hours of out-of-class work/.test(mt), mt);
  ok("minimums: 112h30 in all", /112 hours and 30 minutes in all/.test(mt), mt);
  ok("minimums: weekly averages for 15 weeks",
    /2 hours and 30 minutes of instructional time and 5 hours of out-of-class work a week/.test(mt), mt);
  await setNum("weeks", 7);
  mt = await page.textContent("#minimums");
  ok("short term keeps the same totals", /37 hours and 30 minutes of instructional time and 75 hours/.test(mt), mt);
  ok("short term raises the weekly average", /5 hours and 21 minutes of instructional time/.test(mt), mt);
  await setNum("weeks", 15);

  // ---------- the format's meetings line ----------
  let st = await state();
  ok("synchronous default sets up a meetings line",
    st.rows[0].auto && st.rows[0].type === "meetings" && st.rows[0].bucket === "acad" &&
    st.rows[0].count === "15" && st.rows[0].each === "2.5", JSON.stringify(st.rows[0]));
  ok("and one blank row to start", st.rows.length === 2 && st.rows[1].name === "");
  let r = await result();
  ok("meetings meet the academic minimum exactly", near(r.totals.acad, 37.5), r.totals.acad);

  await page.check("#fmt-blended");
  st = await state();
  ok("blended halves the meetings", st.rows[0].auto && st.rows[0].each === "1.25", JSON.stringify(st.rows[0]));
  await page.check("#fmt-async");
  st = await state();
  ok("asynchronous removes the meetings line", !st.rows.some(x => x.type === "meetings"));
  await page.check("#fmt-sync");
  st = await state();
  ok("back to synchronous brings it back", st.rows[0].auto && st.rows[0].each === "2.5");

  await setNum("credits", 4);
  st = await state();
  /* 4 credits: 50 / 15 = 3.333…, rounded UP so the line meets the minimum
     (October 22, 2026; it was 3.33, which fell 3 minutes short). */
  ok("meetings follow the credits", st.rows[0].each === "3.34", st.rows[0].each);
  r = await result();
  ok("4 credits x 15 weeks: the meetings line is not short", !r.status.some(x => x.cls === "warn" && /Instructional/.test(x.text)) && r.totals.acad >= 50,
    r.totals.acad);
  await setNum("weeks", 10);
  st = await state();
  ok("meetings follow the length", st.rows[0].count === "10" && st.rows[0].each === "5", JSON.stringify(st.rows[0]));
  await setNum("credits", 3); await setNum("weeks", 15);

  /* The rounding regression, across the shapes a course takes: the
     synchronous line never falls short of the instructional minimum and
     never overshoots it by 10 minutes or more; the blended line likewise
     against half of it. */
  const sweep = await page.evaluate(() => {
    const bad = [];
    const set = (id, v) => { const el = document.getElementById(id); el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); };
    for (const fmt of ["sync", "blended"]) {
      const radio = document.getElementById("fmt-" + fmt);
      radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true }));
      for (let c = 0.5; c <= 6; c += 0.5) for (let w = 1; w <= 16; w++) {
        set("credits", c); set("weeks", w);
        const line = window.__state().rows.find(x => x.auto);
        const got = parseFloat(line.count) * parseFloat(line.each);
        const need = c * 50 * 15 / 60 * (fmt === "blended" ? 0.5 : 1);
        if (got + 1e-9 < need || (got - need) * 60 >= 10) bad.push(fmt + " " + c + "cr " + w + "wk: " + line.count + " x " + line.each + " vs " + need);
      }
    }
    const s = document.getElementById("fmt-sync"); s.checked = true; s.dispatchEvent(new Event("change", { bubbles: true }));
    set("credits", 3); set("weeks", 15);
    return bad;
  });
  ok("meetings line meets the minimum, within 10 minutes, for 0.5-6 credits x 1-16 weeks", sweep.length === 0, sweep.slice(0, 5).join("; "));
  st = await state();
  ok("and the sweep leaves the line at 3 x 15", st.rows[0].auto && st.rows[0].each === "2.5", JSON.stringify(st.rows[0]));

  await row(0).locator('[data-field="each"]').fill("3");
  st = await state();
  ok("editing the meetings line makes it yours", !st.rows[0].auto && st.rows[0].each === "3");
  await setNum("credits", 4);
  st = await state();
  ok("an edited meetings line no longer follows the credits", st.rows[0].each === "3");
  ok("and no second meetings line appears", st.rows.filter(x => x.type === "meetings").length === 1);
  await setNum("credits", 3);

  await fresh();
  await row(0).locator('[data-field="remove"]').click();
  st = await state();
  ok("removing the meetings line removes it", !st.rows.some(x => x.type === "meetings"));
  await setNum("credits", 4);
  st = await state();
  ok("it stays removed while the setup changes", !st.rows.some(x => x.type === "meetings"));
  await page.check("#fmt-blended");
  st = await state();
  ok("choosing a format again sets it up again", st.rows.some(x => x.auto && x.type === "meetings"));

  // ---------- rows ----------
  await fresh();
  await row(1).locator('[data-field="type"]').selectOption("quiz");
  st = await state();
  ok("choosing a type fills its typical time", st.rows[1].each === "0.5", st.rows[1].each);
  ok("and names an unnamed row after it", st.rows[1].name === "Quiz");
  ok("and sets its default bucket", st.rows[1].bucket === "ooc");
  await row(1).locator('[data-field="type"]').selectOption("webinar");
  st = await state();
  ok("changing type replaces an untouched typical time", st.rows[1].each === "1.5", st.rows[1].each);
  ok("webinar defaults to instructional time", st.rows[1].bucket === "acad");
  await row(1).locator('[data-field="each"]').fill("2");
  await row(1).locator('[data-field="type"]').selectOption("quiz");
  st = await state();
  ok("a time typed by hand survives a type change", st.rows[1].each === "2");
  await row(1).locator('[data-field="bucket"]').selectOption("acad");
  await row(1).locator('[data-field="type"]').selectOption("blog");
  st = await state();
  ok("a bucket chosen by hand survives a type change", st.rows[1].bucket === "acad");
  await row(1).locator('[data-field="type"]').selectOption("readings");

  await row(1).locator('[data-field="count"]').fill("4");
  await row(1).locator('[data-field="each"]').fill("2.5");
  ok("row total is count x each", (await row(1).locator(".row-total").textContent()) === "10.00");
  const focused = await page.evaluate(() => document.activeElement.dataset.field);
  ok("typing keeps focus in the row", focused === "each", focused);

  const before = await rowsLoc().count();
  await page.click("#btn-add");
  ok("+ Add an activity adds a row", (await rowsLoc().count()) === before + 1);
  ok("and focuses its name", await page.evaluate(() => document.activeElement.dataset.field === "name"));
  await row(before).locator('[data-field="remove"]').click();
  ok("remove takes a row away", (await rowsLoc().count()) === before);

  await fresh();
  await page.check("#fmt-async");
  await row(0).locator('[data-field="remove"]').click();
  ok("the list never drops to zero rows", (await rowsLoc().count()) === 1);

  // ---------- estimates borrowed from the Learning Activity Estimator ----------
  /* October 21, 2026: each row whose type has one of the estimator's
     methods gets an Estimate link that opens that method's inputs. */
  await fresh();
  const units = await page.evaluate(() => {
    const out = {};
    ["readings", "discussion", "quiz", "meetings", "other"].forEach(t => {
      const r = document.querySelector(".inv-row:nth-child(2) [data-field=type]");
      r.value = t; r.dispatchEvent(new Event("change", { bubbles: true }));
      const row = document.querySelector(".inv-row:nth-child(2)");
      row.querySelector("[data-field=count]").value = "2";
      row.querySelector("[data-field=count]").dispatchEvent(new Event("input", { bubbles: true }));
      out[t] = { unit: row.querySelector(".unit").textContent, est: !!row.querySelector(".est-btn") };
    });
    return out;
  });
  ok("how many shows its unit", units.readings.unit === "readings" && units.discussion.unit === "posts" && units.quiz.unit === "quizzes", JSON.stringify(units));
  ok("meetings and something else have no unit", units.meetings.unit === "" && units.other.unit === "");
  ok("only typed rows with a method get an Estimate link",
    units.readings.est && units.discussion.est && units.quiz.est && !units.meetings.est && !units.other.est);
  ok("a discussion post starts at the estimator's 1 hour",
    await page.evaluate(() => document.querySelector(".inv-row:nth-child(2)") && true) &&
    (await (async () => { await row(1).locator('[data-field="type"]').selectOption("discussion"); return (await state()).rows[1].each; })()) === "1");

  await fresh();
  await row(1).locator('[data-field="name"]').fill("Textbook chapters");
  await row(1).locator('[data-field="type"]').selectOption("readings");
  ok("unit is singular for one", (await row(1).locator(".unit").textContent()) === "reading");
  ok("the estimate panel starts closed", await row(1).locator(".est-panel").isHidden());
  const eb = row(1).locator('[data-field="estimate"]');
  ok("Estimate is a button that controls its panel",
    (await eb.getAttribute("aria-expanded")) === "false" && (await eb.getAttribute("aria-controls")) === (await row(1).locator(".est-panel").getAttribute("id")));
  await eb.click();
  ok("Estimate opens the panel", (await eb.getAttribute("aria-expanded")) === "true" && await row(1).locator(".est-panel").isVisible());
  ok("and focuses its first field", await page.evaluate(() => document.activeElement.dataset.est === "pages"));
  ok("panel says what to fill in", /Enter the pages/.test(await row(1).locator(".est-result").textContent()));
  await row(1).locator('[data-est="pages"]').fill("30");
  st = await state();
  ok("30 pages at the defaults (67 an hour) gives 0.45 h", st.rows[1].each === "0.45" && st.rows[1].estUsed, st.rows[1].each);
  await row(1).locator('[data-est="density"]').selectOption("3");
  await row(1).locator('[data-est="difficulty"]').selectOption("3");
  await row(1).locator('[data-est="purpose"]').selectOption("3");
  st = await state();
  ok("dense, many new concepts, engage: 5 pages an hour, 6 h", st.rows[1].each === "6", st.rows[1].each);
  ok("hours each box follows", (await row(1).locator('[data-field="each"]').inputValue()) === "6");
  ok("result line states the rate", /At 5 pages an hour, that is 6\.00 hours for each reading/.test(await row(1).locator(".est-result").textContent()));
  await row(1).locator('[data-field="each"]').fill("4");
  st = await state();
  ok("typing hours each by hand takes over", st.rows[1].each === "4" && !st.rows[1].estUsed);
  ok("and the panel says so", /typed by hand/.test(await row(1).locator(".est-result").textContent()));
  await row(1).locator('[data-est="pages"]').fill("20");
  st = await state();
  ok("changing a setting uses the estimate again", st.rows[1].each === "4" && st.rows[1].estUsed);
  await row(1).locator('[data-est="pages"]').fill("40");
  st = await state();
  ok("40 dense pages at 5 an hour: 8 h", st.rows[1].each === "8");

  // writing in words
  await page.click("#btn-add");
  await row(2).locator('[data-field="type"]').selectOption("writing");
  await row(2).locator('[data-field="estimate"]').click();
  await row(2).locator('[data-est="length"]').fill("1000");
  await row(2).locator('[data-est="lengthUnit"]').selectOption("words");
  st = await state();
  ok("1000 words double-spaced reflection, no drafting: 4 pages x 0.75 = 3 h", st.rows[2].each === "3", st.rows[2].each);
  await row(2).locator('[data-est="density"]').selectOption("2");
  await row(2).locator('[data-est="genre"]').selectOption("3");
  await row(2).locator('[data-est="drafting"]').selectOption("3");
  st = await state();
  ok("1000 words single-spaced research, extensive drafting: 2 pages x 10 = 20 h", st.rows[2].each === "20", st.rows[2].each);

  // discussion audio/video swaps its field
  await page.click("#btn-add");
  await row(3).locator('[data-field="type"]').selectOption("discussion");
  await row(3).locator('[data-field="estimate"]').click();
  ok("text discussion shows words, not minutes",
    await row(3).locator('[data-est="words"]').isVisible() && await row(3).locator('[data-est="minutes"]').isHidden());
  await row(3).locator('[data-est="format"]').selectOption("av");
  ok("audio/video shows minutes instead",
    await row(3).locator('[data-est="minutes"]').isVisible() && await row(3).locator('[data-est="words"]').isHidden());
  st = await state();
  ok("3 finished minutes at 3 an hour: 1 h", st.rows[3].each === "1");
  await row(3).locator('[data-est="minutes"]').fill("5");
  st = await state();
  ok("5 finished minutes: 1.67 h", st.rows[3].each === "1.67", st.rows[3].each);

  // media and tests
  await page.click("#btn-add");
  await row(4).locator('[data-field="type"]').selectOption("minilecture");
  await row(4).locator('[data-field="estimate"]').click();
  await row(4).locator('[data-est="minutes"]').fill("12");
  ok("a 12-minute video: 0.2 h", (await state()).rows[4].each === "0.2");
  await page.click("#btn-add");
  await row(5).locator('[data-field="type"]').selectOption("test");
  await row(5).locator('[data-field="estimate"]').click();
  await row(5).locator('[data-est="limit"]').fill("90");
  await row(5).locator('[data-est="prep"]').fill("3");
  ok("90-minute exam with 3 h preparation: 4.5 h", (await state()).rows[5].each === "4.5");

  // changing type to another method resets the settings
  await row(5).locator('[data-field="type"]').selectOption("blog");
  st = await state();
  ok("a new method starts from its defaults", st.rows[5].est && st.rows[5].est.genre === "1" && !("limit" in st.rows[5].est));
  await row(5).locator('[data-field="type"]').selectOption("case");
  ok("a type without a method has no panel", (await row(5).locator(".est-panel").count()) === 0);

  // estimate labels and the summary
  const estUnlabelled = await page.$$eval(".est-panel input, .est-panel select",
    els => els.filter(e => !document.querySelector('label[for="' + e.id + '"]')).length);
  ok("every estimate field has a label", estUnlabelled === 0, estUnlabelled);
  ok("estimate field ids are unique", await page.$$eval(".est-panel [id]", els => new Set(els.map(e => e.id)).size === els.length));
  const sum = await page.evaluate(() => window.__asText());
  ok("summary says where an estimate came from",
    /each estimated from 40 pages, 750 words per page, many new concepts, engage/.test(sum), sum);
  /* Density is words per page; the summary does not talk about spacing or
     book type (October 22, 2026). The dropdown labels still do. */
  ok("summary gives writing density as words per page",
    /each estimated from 1000 words, 500 words per page, research, extensive drafting/.test(sum), sum);
  ok("summary never mentions spacing or book type",
    // only the "estimated from" lines: a row in this run is named "Textbook chapters"
    !sum.split("\n").filter(l => /estimated from/.test(l)).some(l => /spaced|textbook|monograph|paperback/i.test(l)), sum);
  ok("the density dropdown still names the spacing",
    await page.$$eval('.est-panel select[data-est="density"] option', os => os.some(o => o.textContent === "250 words (double-spaced)")));
  ok("summary gives the unit", /1 reading;/.test(sum));

  await page.waitForTimeout(600);
  await page.reload();
  st = await state();
  ok("estimate settings survive a reload", st.rows[1].est && st.rows[1].est.pages === "40" && st.rows[1].estUsed && st.rows[1].each === "8");
  ok("panels start closed after a reload", await row(1).locator(".est-panel").isHidden());

  // the copied rate tables match the estimator's
  const tables = await page.evaluate(async () => {
    const grab = (src, name) => {
      const m = src.match(new RegExp("var " + name + " = (\\{[\\s\\S]*?\\});"));
      return m ? m[1].replace(/\s+/g, "") : null;
    };
    const mine = document.documentElement.outerHTML;
    const theirs = await (await fetch("learning_activity_estimator.html")).text();
    return ["PAGES_PER_HOUR", "HOURS_PER_PAGE", "WORDS_PER_PAGE"].map(n => [n, grab(mine, n), grab(theirs, n)]);
  }).catch(e => String(e));
  ok("rate tables match the Learning Activity Estimator's",
    Array.isArray(tables) && tables.every(t => t[1] && t[1] === t[2]), JSON.stringify(tables).slice(0, 300));

  // ---------- accessibility of rows ----------
  await fresh();
  await row(1).locator('[data-field="name"]').fill("Weekly discussion");
  const names = await page.$$eval(".inv-row input, .inv-row select, .inv-row button, .inv-row output",
    els => els.map(e => e.getAttribute("aria-label") || ""));
  ok("every row control has an accessible name", names.every(n => n.length > 0), names.filter(n => !n).length);
  ok("labels name the activity",
    names.some(n => n === "How many Weekly discussion") && names.some(n => n === "Remove Weekly discussion"),
    names.join(" | "));
  ok("each row is a labelled group",
    await page.$$eval(".inv-row", rs => rs.every(r => r.getAttribute("role") === "group" && r.getAttribute("aria-label"))));
  ok("the column header row is hidden from assistive tech",
    (await page.getAttribute(".inv-head", "aria-hidden")) === "true");
  const summaries = await page.$$eval("summary", ss => ss.map(s => ({
    headings: s.querySelectorAll("h1,h2,h3,h4,h5,h6").length, text: s.textContent.trim()
  })));
  ok("every summary wraps exactly one heading", summaries.every(s => s.headings === 1));
  ok("no two disclosures share a name", new Set(summaries.map(s => s.text)).size === summaries.length);
  ok("meters are decorative", await page.$$eval(".meter", ms => ms.length === 3 && ms.every(m => m.getAttribute("aria-hidden") === "true")));
  ok("status has a live region", (await page.getAttribute("#live-status", "aria-live")) === "polite");

  // ---------- the check ----------
  // Rows: 0 the meetings line, 1 the starting blank row, 2 the readings.
  await fresh();
  r = await result();
  ok("nothing planned beyond meetings: out-of-class short",
    r.status.length === 1 && r.status[0].cls === "warn" && /Out-of-class work is 75 hours short/.test(r.status[0].text),
    JSON.stringify(r.status));
  await addRow("Readings", "readings", 15, 5);
  r = await result();
  ok("meetings + 75h out-of-class meets the minimums",
    r.status.length === 1 && /meets the credit-hour minimums/.test(r.status[0].text), JSON.stringify(r.status));
  ok("totals by bucket", near(r.totals.acad, 37.5) && near(r.totals.ooc, 75) && near(r.totals.total, 112.5));
  ok("tiles show the totals",
    (await page.textContent("#out-acad")) === "37.50" && (await page.textContent("#out-ooc")) === "75.00" &&
    (await page.textContent("#out-total")) === "112.50");
  ok("tiles show the minimums", /37\.50-hour minimum/.test(await page.textContent("#min-acad")) &&
    /112\.50-hour minimum/.test(await page.textContent("#min-total")));
  ok("bars full when met", await page.$$eval(".meter .fill", fs => fs.every(f => f.style.width === "100%" && !f.classList.contains("short"))));
  ok("weekly average line", /7 hours and 30 minutes in all/.test(await page.textContent("#weekly")),
    await page.textContent("#weekly"));

  await row(0).locator('[data-field="each"]').fill("2");
  r = await result();
  ok("academic short is a warning",
    r.status.some(x => x.cls === "warn" && /Instructional time is 7 hours and 30 minutes short/.test(x.text)),
    JSON.stringify(r.status));
  ok("a short bar turns red", await page.$eval("#bar-acad", f => f.classList.contains("short")));
  /* The warnings name the course shape the minimum comes from (October 22,
     2026), not "this course". */
  ok("instructional warning names the course shape",
    r.status.some(x => x.cls === "warn" && /short of the 37 hours and 30 minutes a 3 credit, 15 week course needs\./.test(x.text)),
    JSON.stringify(r.status));
  ok("no warning says 'this course needs'", !r.status.some(x => /this course needs/.test(x.text)));
  await setNum("credits", 8); await setNum("weeks", 7);
  r = await result();
  ok("the shape follows the inputs, with 'an' before 8",
    r.status.some(x => x.cls === "warn" && /short of the 100 hours an 8 credit, 7 week course needs\./.test(x.text)),
    JSON.stringify(r.status));
  await setNum("weeks", 0);
  r = await result();
  ok("with no valid length the shape drops the weeks",
    r.status.some(x => /an 8 credit course needs/.test(x.text)), JSON.stringify(r.status));
  await setNum("credits", 3); await setNum("weeks", 15);
  await row(0).locator('[data-field="each"]').fill("2");
  r = await result();

  /* October 21, 2026: the page no longer lets extra academic work cover an
     out-of-class shortfall (Maka: avoid making that call). Lots of academic
     work and too little out-of-class work is a warning, full stop. */
  await row(0).locator('[data-field="each"]').fill("4");
  await row(2).locator('[data-field="each"]').fill("4.5");
  r = await result();
  ok("extra academic work does not cover an out-of-class shortfall",
    r.status.length === 1 && r.status[0].cls === "warn" && /Out-of-class work is 7 hours and 30 minutes short/.test(r.status[0].text),
    JSON.stringify(r.status));
  ok("out-of-class warning names the course shape",
    /short of the 75 hours a 3 credit, 15 week course needs\.$/.test(r.status[0].text), r.status[0].text);
  ok("and the page never says it does",
    !(await page.evaluate(() => /covers it|can be deducted|stand in for/i.test(document.querySelector("main").innerText))));

  await row(0).locator('[data-field="each"]').fill("2");
  r = await result();
  ok("both short: two warnings", r.status.filter(x => x.cls === "warn").length === 2, JSON.stringify(r.status));

  await row(2).locator('[data-field="bucket"]').selectOption("acad");
  r = await result();
  ok("switching a row's bucket moves its hours", near(r.totals.acad, 97.5) && near(r.totals.ooc, 0), JSON.stringify(r.totals));

  // ---------- persistence ----------
  await fresh();
  await row(1).locator('[data-field="name"]').fill("Papers");
  await row(1).locator('[data-field="type"]').selectOption("writing");
  await row(1).locator('[data-field="count"]').fill("3");
  await row(1).locator('[data-field="each"]').fill("6");
  await page.check("#fmt-blended");
  await page.waitForTimeout(600);
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  ok("saves under its own key", saved && saved.format === "blended" && saved.rows.length === 2, JSON.stringify(saved));
  await page.reload();
  st = await state();
  ok("reload keeps the rows",
    st.rows.length === 2 && st.rows[1].name === "Papers" && st.rows[1].count === "3" && st.rows[1].each === "6");
  ok("reload keeps the format", await page.isChecked("#fmt-blended"));
  ok("reload keeps the meetings line following", st.rows[0].auto && st.rows[0].each === "1.25");

  await page.evaluate(k => localStorage.setItem(k, "{not json"), KEY);
  await page.reload();
  st = await state();
  ok("a corrupt save starts fresh", st.rows.length === 2 && st.rows[0].auto);
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ credits: "2", rows: [{ name: "X", type: "nope", count: 2, each: 1 }, null] })), KEY);
  await page.reload();
  st = await state();
  ok("a partial save loads what it can",
    (await page.inputValue("#credits")) === "2" && st.rows.some(x => x.name === "X" && x.type === "" && x.count === "2"));

  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("uoes-credit-hour-planner", JSON.stringify({ credits: "9" })); });
  await page.reload();
  ok("the old page's save is ignored", (await page.inputValue("#credits")) === "3");

  await row(1).locator('[data-field="name"]').fill("Temp");
  await page.click("#btn-reset");
  st = await state();
  ok("Start over clears the rows", st.rows.length === 2 && st.rows[1].name === "");

  // ---------- summary ----------
  await fresh();
  await addRow("Discussion posts", "discussion", 14, 1);
  const text = await page.evaluate(() => window.__asText());
  ok("summary lists the course", /Credits:\s+3/.test(text) && /15 weeks/.test(text) && /Synchronous/.test(text));
  ok("summary groups by bucket", /INSTRUCTIONAL TIME[\s\S]*Class meetings[\s\S]*OUT-OF-CLASS WORK[\s\S]*Discussion posts\s+14 x 1\.00\s+14\.00 hrs/.test(text), text);
  ok("summary states minimums", /minimum 37\.50/.test(text) && /minimum 112\.50/.test(text));
  ok("summary carries the credit line", /Ruth/.test(text) && /CC BY-NC-SA 4\.0/.test(text));
  await page.click("#btn-report");
  ok("printable summary appears", await page.isVisible("#reportWrap pre"));

  // ---------- phone width ----------
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await phone.goto(FILE);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("no horizontal scroll at 390px", overflow <= 0, overflow);
  ok("column header hidden on a phone", !(await phone.isVisible(".inv-head")));
  ok("cells carry their own labels on a phone", await phone.isVisible(".inv-row .inv-mini >> nth=0"));
  await phone.close();


  const real = errors.filter(e => !/ERR_TUNNEL_CONNECTION_FAILED|fonts\.g/.test(e));
  ok("no page errors", real.length === 0, real.join(" | "));
  ok("no page errors (including blocked fonts)", errors.length === 0, errors.slice(0, 2).join(" | "));

  await browser.close();
  console.log(`PASS ${pass}   FAIL ${fail}   (${pass + fail} checks)`);
  failures.forEach(f => console.log("  FAIL  " + f));
  process.exit(fail ? 1 : 0);
})();
