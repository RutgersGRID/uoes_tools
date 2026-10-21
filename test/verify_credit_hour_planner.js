/* Verification harness for credit_hour_planner.html, the whole-course credit
 * hour planner (rebuilt October 21, 2026). The weekly-budget page it replaced
 * is old_credit_hour_planner.html, checked by verify_old_credit_hour_planner.js.
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
    /Does the course add up/.test(heads[2]), heads.join(" | "));
  ok("all three steps start open",
    await page.$$eval("details.step-body", ds => ds.length === 3 && ds.every(d => d.open)));
  ok("no weekly-budget leftovers",
    await page.evaluate(() => !document.getElementById("f2f") && !document.getElementById("study") &&
      !/acceleration|self-paced instructional/i.test(document.querySelector("main").innerText)));
  ok("no module-fit step", !(await page.evaluate(() => /Does the module fit/i.test(document.body.innerText))));
  const explainers = await page.$$eval(".explainers summary", s => s.map(x => x.textContent.trim()));
  ok("both explainers sit together in Course activities",
    explainers.length === 2 && /academic work/i.test(explainers[0]) && /out-of-class work/i.test(explainers[1]),
    explainers.join(" | "));
  ok("academic explainer keeps the monitored-async wording",
    await page.evaluate(() => /monitored and documented/.test(document.querySelector(".explainers").textContent)));
  ok("format card says what the choice sets up",
    /Class meetings/.test(await page.textContent(".format-effect")));
  ok("Learning Activity Estimator linked",
    (await page.$$('a[href="learning_activity_estimator.html"]')).length === 1);

  // ---------- minimums ----------
  let mt = await page.textContent("#minimums");
  ok("minimums: 3 credits -> 37h30 academic", /37 hours and 30 minutes of academic work/.test(mt), mt);
  ok("minimums: 75 hours out-of-class", /75 hours of out-of-class work/.test(mt), mt);
  ok("minimums: 112h30 in all", /112 hours and 30 minutes in all/.test(mt), mt);
  ok("minimums: weekly averages for 15 weeks",
    /2 hours and 30 minutes of academic work and 5 hours of out-of-class work a week/.test(mt), mt);
  await setNum("weeks", 7);
  mt = await page.textContent("#minimums");
  ok("short term keeps the same totals", /37 hours and 30 minutes of academic work and 75 hours/.test(mt), mt);
  ok("short term raises the weekly average", /5 hours and 21 minutes of academic work/.test(mt), mt);
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
  ok("meetings follow the credits", st.rows[0].each === "3.33", st.rows[0].each);
  await setNum("weeks", 10);
  st = await state();
  ok("meetings follow the length", st.rows[0].count === "10" && st.rows[0].each === "5", JSON.stringify(st.rows[0]));
  await setNum("credits", 3); await setNum("weeks", 15);

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
  ok("webinar defaults to academic work", st.rows[1].bucket === "acad");
  await row(1).locator('[data-field="each"]').fill("2");
  await row(1).locator('[data-field="type"]').selectOption("quiz");
  st = await state();
  ok("a time typed by hand survives a type change", st.rows[1].each === "2");
  await row(1).locator('[data-field="bucket"]').selectOption("acad");
  await row(1).locator('[data-field="type"]').selectOption("blog");
  st = await state();
  ok("a bucket chosen by hand survives a type change", st.rows[1].bucket === "acad");
  await row(1).locator('[data-field="type"]').selectOption("readings");
  ok("a type with no typical time points at the estimator",
    /Learning Activity Estimator/.test(await row(1).textContent()) || (await state()).rows[1].each !== "");

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
    r.status.some(x => x.cls === "warn" && /Academic work is 7 hours and 30 minutes short/.test(x.text)),
    JSON.stringify(r.status));
  ok("a short bar turns red", await page.$eval("#bar-acad", f => f.classList.contains("short")));

  /* October 21, 2026: the page no longer lets extra academic work cover an
     out-of-class shortfall (Maka: avoid making that call). Lots of academic
     work and too little out-of-class work is a warning, full stop. */
  await row(0).locator('[data-field="each"]').fill("4");
  await row(2).locator('[data-field="each"]').fill("4.5");
  r = await result();
  ok("extra academic work does not cover an out-of-class shortfall",
    r.status.length === 1 && r.status[0].cls === "warn" && /Out-of-class work is 7 hours and 30 minutes short/.test(r.status[0].text),
    JSON.stringify(r.status));
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
  ok("summary groups by bucket", /ACADEMIC WORK[\s\S]*Class meetings[\s\S]*OUT-OF-CLASS WORK[\s\S]*Discussion posts\s+14 x 1\.00\s+14\.00 hrs/.test(text), text);
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

  // ---------- backup page ----------
  const old = await browser.newPage();
  await old.goto("file://" + path.resolve(__dirname, "..", "old_credit_hour_planner.html"));
  ok("the old page is still there, on its own stylesheet",
    await old.$eval('link[href="css/old_credit_hour_planner.css"]', () => true).catch(() => false));
  await old.close();

  const real = errors.filter(e => !/ERR_TUNNEL_CONNECTION_FAILED|fonts\.g/.test(e));
  ok("no page errors", real.length === 0, real.join(" | "));
  ok("no page errors (including blocked fonts)", errors.length === 0, errors.slice(0, 2).join(" | "));

  await browser.close();
  console.log(`PASS ${pass}   FAIL ${fail}   (${pass + fail} checks)`);
  failures.forEach(f => console.log("  FAIL  " + f));
  process.exit(fail ? 1 : 0);
})();
