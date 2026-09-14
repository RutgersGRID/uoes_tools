/*
 * Verification harness for learning_activity_estimator.html.
 *
 * The page estimates one learning activity per section and totals the
 * sections; it has no course-level figures at all. These checks cover the
 * rate tables, each section's arithmetic, the manual overrides, the
 * words-to-pages conversion, the typical-time fill for "Projects & other
 * activities", the per-section heading readouts, the results table,
 * localStorage under the page's own key (and never the old estimator's),
 * "Start over", the report and copy text, print output, label/aria
 * coverage, the focus outline, and two scope guards: nothing on the page
 * speaks of hours per week or of independent/contact time, and every
 * activity on the Credit Hour Planner's lists has a home here.
 *
 *   node test/verify_activity_estimator.js
 */
const path = require("path");
const { chromium } = require("playwright-core");
const { chromePath } = require("./_chrome");

const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.join(ROOT, "learning_activity_estimator.html");

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail !== undefined ? "  [" + detail + "]" : "")); }
}
function near(name, got, exp, eps) {
  eps = eps === undefined ? 1e-9 : eps;
  ok(name, Math.abs(got - exp) <= eps, got + " vs " + exp);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: chromePath(),
    args: ["--allow-file-access-from-files"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(PAGE);
  await page.waitForTimeout(150);

  const calc = () => page.evaluate(() => window.__calc());
  const row = async (id) => (await calc()).rows.find((r) => r.id === id);
  const openAll = () => page.evaluate(() =>
    document.querySelectorAll("details.step-body").forEach((d) => { d.open = true; }));
  const set = async (id, v) => { await page.fill("#" + id, String(v)); await page.dispatchEvent("#" + id, "input"); };
  const pick = async (id, v) => { await page.selectOption("#" + id, String(v)); };
  const tick = async (id, on) => { await page.setChecked("#" + id, on); };
  const reset = async () => {
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
    await page.goto(PAGE); await page.waitForTimeout(150); await openAll();
  };

  /* ===== 1. Identity and scope =====
     Read before anything is opened: the default open state is part of it. */
  console.log("\n1. Identity and scope");
  {
    const t = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector("h1").textContent.trim(),
      text: document.querySelector("main").textContent.replace(/\s+/g, " "),
      classweeks: !!document.getElementById("classweeks"),
      ids: ["out-ind", "out-con", "syncsessions", "otherassign", "other_bucket", "weeklypages", "semesterpages"]
        .filter((id) => document.getElementById(id)),
      sections: Array.from(document.querySelectorAll("section.step > details.step-body > summary > h2"))
        .map((h) => h.textContent.trim()),
      open: Array.from(document.querySelectorAll("section.step > details.step-body")).map((d) => d.open),
    }));
    ok("title is Learning Activity Estimator", t.title === "Learning Activity Estimator", t.title);
    ok("h1 matches", t.h1 === "Learning Activity Estimator", t.h1);
    ok("no Course info section / class-weeks field", !t.classweeks && !/Course info/.test(t.text));
    ok("no course-level fields survive", t.ids.length === 0, t.ids.join(","));
    ok("nothing on the page says per week", !/per week|hrs\/wk|hours\/week|a week/i.test(t.text));
    ok("no independent/contact split", !/Independent|Contact time/.test(t.text));
    ok("six activity sections, each a collapsible step",
      t.sections.length === 6, t.sections.join(" | "));
    ok("Reading opens by default, the rest start closed",
      t.open[0] === true && t.open.slice(1).every((o) => o === false), t.open.join(","));

    // Every activity on the Credit Hour Planner's lists must be mentioned.
    const PLANNER = [
      "Blog", "Case stud", "Discussion post", "Experiential learning", "Journal",
      "Mini-lecture video", "other videos", "Podcast", "Reading", "Research activities",
      "Simulation", "eLearning tutorial", "Supplemental materials", "Webinar", "Wiki",
      "Peer review", "Pre-assessment", "Quiz", "Group assignment", "Individual assignment",
      "Project", "presentation", "Test", "Writing assignment", "preparation",
    ];
    const missing = PLANNER.filter((n) => !new RegExp(n, "i").test(t.text));
    ok("every Credit Hour Planner activity has a home on the page",
      missing.length === 0, "missing: " + missing.join(", "));
  }

  await openAll();

  /* ===== 2. Rate tables ===== */
  console.log("\n2. Rate tables");
  {
    // Corners of the published tables, reached through the UI.
    await set("pages", 67);
    await pick("readingdensity", 1); await pick("difficulty", 1); await pick("readingpurpose", 1);
    let r = await calc();
    ok("lightest reading is 67 pages/hour", r.readRate === 67, r.readRate);
    near("67 pages at 67/hour is one hour", (await row("reading")).hours, 1);

    await pick("readingdensity", 3); await pick("difficulty", 3); await pick("readingpurpose", 3);
    r = await calc();
    ok("densest reading is 5 pages/hour", r.readRate === 5, r.readRate);
    near("67 pages at 5/hour", (await row("reading")).hours, 67 / 5);

    await pick("readingdensity", 2); await pick("difficulty", 2); await pick("readingpurpose", 2);
    r = await calc();
    ok("middle of the reading table is 18 pages/hour", r.readRate === 18, r.readRate);

    // The rate must not increase with density, difficulty or purpose.
    const grid = [];
    for (const d of [1, 2, 3]) for (const f of [1, 2, 3]) for (const p of [1, 2, 3]) {
      await pick("readingdensity", d); await pick("difficulty", f); await pick("readingpurpose", p);
      grid.push({ d, f, p, rate: (await calc()).readRate });
    }
    const mono = grid.every((a) => grid.every((b) =>
      !(b.d >= a.d && b.f >= a.f && b.p >= a.p) || b.rate <= a.rate));
    ok("reading rate never rises with density, difficulty or purpose", mono);
    ok("27 reading cells, all positive", grid.length === 27 && grid.every((g) => g.rate > 0));

    await pick("readingdensity", 1); await pick("difficulty", 1); await pick("readingpurpose", 1);

    await set("length", 1);
    await pick("writingpurpose", 1); await pick("draftrevise", 1); await pick("writtendensity", 1);
    r = await calc();
    ok("lightest writing is 0.75 hours/page", r.writeRate === 0.75, r.writeRate);
    await pick("writingpurpose", 3); await pick("draftrevise", 3); await pick("writtendensity", 2);
    r = await calc();
    ok("heaviest writing is 10 hours/page", r.writeRate === 10, r.writeRate);
    await pick("writingpurpose", 2); await pick("draftrevise", 2); await pick("writtendensity", 1);
    r = await calc();
    ok("argument, minimal drafting, double-spaced is 2 hours/page", r.writeRate === 2, r.writeRate);
  }

  /* ===== 3. Reading ===== */
  console.log("\n3. Reading");
  {
    await reset();
    await set("pages", 30);
    await pick("readingdensity", 1); await pick("difficulty", 2); await pick("readingpurpose", 2);
    near("30 pages at 24/hour", (await row("reading")).hours, 30 / 24);
    const shown = await page.$eval("#out-reading", (e) => e.textContent);
    ok("section readout shows the hours", shown === (30 / 24).toFixed(2), shown);
    const rate = await page.$eval("#out-readrate", (e) => e.textContent);
    ok("rate line names the looked-up rate", /24 pages per hour/.test(rate), rate);

    await tick("setreadingrate", true);
    ok("manual rate field appears", await page.$eval("#wrap-overridepages", (e) => !e.hidden));
    await set("overridepagesperhour", 10);
    near("manual rate of 10 pages/hour", (await row("reading")).hours, 3);
    ok("detail says set manually", /set manually/.test((await row("reading")).detail));

    await set("overridepagesperhour", 0);
    const r = await calc();
    ok("zero manual rate warns", r.warnings.length === 1 && /greater than zero/.test(r.warnings[0]));
    near("and counts reading as 0", r.rows.find((x) => x.id === "reading").hours, 0);
    ok("warning renders", (await page.$$eval("#warnings .warn", (e) => e.length)) === 1);

    await tick("setreadingrate", false);
    ok("manual field hides again", await page.$eval("#wrap-overridepages", (e) => e.hidden));
    ok("no warning once the table rate is back", (await calc()).warnings.length === 0);
  }

  /* ===== 4. Writing ===== */
  console.log("\n4. Writing");
  {
    await reset();
    await set("length", 4);
    await pick("writingpurpose", 2); await pick("draftrevise", 2); await pick("writtendensity", 1);
    near("4 pages of argument at 2 hours/page", (await row("writing")).hours, 8);

    await pick("lengthunit", "words"); await set("length", 1000);
    let r = await calc();
    near("1000 words at 250/page is 4 pages", r.writtenPages, 4);
    near("and still 8 hours", r.rows.find((x) => x.id === "writing").hours, 8);
    ok("detail shows the page equivalent", /1000 words, about 4\.00 pages/.test(r.rows.find((x) => x.id === "writing").detail),
      r.rows.find((x) => x.id === "writing").detail);

    await pick("writtendensity", 2);
    r = await calc();
    near("1000 words at 500/page is 2 pages", r.writtenPages, 2);
    ok("single-spaced argument, minimal drafting is 4 hours/page", r.writeRate === 4, r.writeRate);
    near("2 pages at 4 hours/page", r.rows.find((x) => x.id === "writing").hours, 8);

    await pick("lengthunit", "pages"); await set("length", 3); await pick("writtendensity", 1);
    await tick("setwritingrate", true); await set("overridehoursperwriting", 1.5);
    near("manual rate of 1.5 hours/page", (await row("writing")).hours, 4.5);
    ok("manual field visible", await page.$eval("#wrap-overridewriting", (e) => !e.hidden));
    await tick("setwritingrate", false);
    near("table rate again", (await row("writing")).hours, 6);
  }

  /* ===== 5. Discussion & peer feedback ===== */
  console.log("\n5. Discussion & peer feedback");
  {
    await reset();
    await set("posts", 3); await pick("postformat", 1); await set("postlength_text", 250);
    near("3 text posts of 250 words", (await row("discussion")).hours, 3);
    ok("text length field shown, A/V hidden",
      await page.evaluate(() => !document.getElementById("wrap-posttext").hidden && document.getElementById("wrap-postav").hidden));

    await pick("postformat", 2); await set("postlength_av", 3); await set("posts", 2);
    near("2 audio/video posts of 3 minutes", (await row("discussion")).hours, 2);
    ok("A/V length field shown, text hidden",
      await page.evaluate(() => document.getElementById("wrap-posttext").hidden && !document.getElementById("wrap-postav").hidden));
    ok("detail names the format", /audio\/video posts/.test((await row("discussion")).detail));

    await tick("setdiscussion", true); await set("overridediscussion", 1.25);
    near("manual discussion hours", (await row("discussion")).hours, 1.25);
    ok("manual field visible", await page.$eval("#wrap-overridedisc", (e) => !e.hidden));
    await tick("setdiscussion", false);
  }

  /* ===== 6. Media, tests, projects ===== */
  console.log("\n6. Media & live sessions, Quizzes & tests, Projects & other");
  {
    await reset();
    await set("mediacount", 3); await set("medialength", 20);
    near("3 items of 20 minutes is one hour", (await row("media")).hours, 1);

    await set("testlength", 60); await set("testprep", 2);
    near("60-minute test plus 2 hours preparation", (await row("tests")).hours, 3);
    ok("test detail mentions preparation", /plus 2 hours of preparation/.test((await row("tests")).detail));
    await set("testprep", 0);
    near("quiz with no preparation is its time limit", (await row("tests")).hours, 1);
    ok("no preparation clause when it is zero", !/preparation/.test((await row("tests")).detail));

    await page.selectOption("#othertype", "group");
    let hrs = await page.$eval("#otherhours", (e) => e.value);
    ok("choosing Group assignment fills in the planner's 4 hours", hrs === "4", hrs);
    near("and the row carries it", (await row("other")).hours, 4);
    ok("row is named for the activity", (await row("other")).name === "Group assignment");
    await set("otherhours", 6);
    near("hours stay editable", (await row("other")).hours, 6);
    await page.selectOption("#othertype", "project");
    hrs = await page.$eval("#otherhours", (e) => e.value);
    ok("changing the activity refills the typical time", hrs === "1", hrs);
    await page.selectOption("#othertype", "other");
    hrs = await page.$eval("#otherhours", (e) => e.value);
    ok("Something else starts at zero", hrs === "0", hrs);
    ok("Something else names no typical time", /hours you entered/.test((await row("other")).detail));
  }

  /* ===== 7. Totals, table, readouts ===== */
  console.log("\n7. Totals, table, readouts");
  {
    await reset();
    let t = await page.evaluate(() => ({
      total: document.getElementById("out-total").textContent,
      rows: document.querySelectorAll("#breakdown tr").length,
      empty: document.querySelector("#breakdown td.empty") && document.querySelector("#breakdown td.empty").textContent,
      sums: Array.from(document.querySelectorAll("summary[data-sum]")).map((s) => s.getAttribute("data-sum")),
    }));
    ok("empty page totals 0.00", t.total === "0.00", t.total);
    ok("empty table says so", t.rows === 1 && /Nothing entered yet/.test(t.empty || ""));
    ok("no heading readouts when nothing is entered", t.sums.every((s) => s === ""), t.sums.join("|"));

    await set("pages", 24); await pick("readingdensity", 1); await pick("difficulty", 1); await pick("readingpurpose", 1); // 24/67
    await set("mediacount", 2); await set("medialength", 30);   // 1
    await set("testlength", 30);                                 // 0.5
    const r = await calc();
    near("total is the sum of the sections", r.total, 24 / 67 + 1 + 0.5);
    ok("count is the number of non-empty sections", r.count === 3, r.count);
    t = await page.evaluate(() => ({
      total: document.getElementById("out-total").textContent,
      foot: document.getElementById("foot-hours").textContent,
      names: Array.from(document.querySelectorAll("#breakdown tr td:first-child")).map((td) => td.textContent),
      sums: Array.from(document.querySelectorAll("summary[data-sum]")).map((s) => s.getAttribute("data-sum")),
      live: document.getElementById("live").textContent,
      readout: getComputedStyle(document.getElementById("sum-media"), "::after").content,
    }));
    ok("tile and footer agree", t.total === t.foot && t.total === (24 / 67 + 1.5).toFixed(2), t.total + " " + t.foot);
    ok("table lists only the sections with hours",
      t.names.join("|") === "Reading|Media & live sessions|Quizzes & tests", t.names.join("|"));
    ok("heading readouts carry each section's hours",
      t.sums[0] === (24 / 67).toFixed(2) + " hrs" && t.sums[3] === "1.00 hrs" && t.sums[4] === "0.50 hrs" &&
      t.sums[1] === "" && t.sums[2] === "" && t.sums[5] === "", t.sums.join("|"));
    ok("readout is drawn as generated content", /1\.00 hrs/.test(t.readout), t.readout);
    ok("live region announces the total", /Total 1\.86 hours across 3 activities/.test(t.live), t.live);
  }

  /* ===== 8. Persistence ===== */
  console.log("\n8. Persistence");
  {
    await reset();
    await set("pages", 12); await pick("readingpurpose", 3);
    await pick("lengthunit", "words"); await set("length", 750);
    await tick("setdiscussion", true); await set("overridediscussion", 2);
    await page.selectOption("#othertype", "research");
    await page.waitForTimeout(600);
    const keys = await page.evaluate(() => Object.keys(localStorage));
    ok("saves under uoes-activity-estimator", keys.includes("uoes-activity-estimator"), keys.join(","));
    ok("never writes the old estimator's key", !keys.includes("uoes-workload-estimator"), keys.join(","));
    const before = await calc();

    await page.goto(PAGE); await page.waitForTimeout(150); await openAll();
    const after = await calc();
    near("reading survives reload", after.rows[0].hours, before.rows[0].hours);
    near("writing (in words) survives reload", after.rows[1].hours, before.rows[1].hours);
    ok("word unit survives reload", (await page.$eval("#lengthunit", (e) => e.value)) === "words");
    ok("manual discussion checkbox survives reload", await page.$eval("#setdiscussion", (e) => e.checked));
    near("manual discussion hours survive reload", after.rows[2].hours, 2);
    ok("activity choice survives reload", (await page.$eval("#othertype", (e) => e.value)) === "research");
    near("its typical time survives reload", after.rows[5].hours, 2);

    // An old Course Workload Estimator save is ignored, not migrated.
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("uoes-workload-estimator", JSON.stringify({ classweeks: "15", weeklypages: "99" }));
    });
    await page.goto(PAGE); await page.waitForTimeout(150); await openAll();
    ok("an old estimator save is ignored", (await page.$eval("#pages", (e) => e.value)) === "0");

    await page.evaluate(() => localStorage.setItem("uoes-activity-estimator", "{not json"));
    await page.goto(PAGE); await page.waitForTimeout(150); await openAll();
    ok("a corrupt save falls back to defaults", (await page.$eval("#pages", (e) => e.value)) === "0");
    await page.evaluate(() => localStorage.setItem("uoes-activity-estimator", JSON.stringify({ pages: "5" })));
    await page.goto(PAGE); await page.waitForTimeout(150); await openAll();
    ok("a partial save fills what it has", (await page.$eval("#pages", (e) => e.value)) === "5");
    ok("and leaves the rest at defaults", (await page.$eval("#length", (e) => e.value)) === "0");

    page.once("dialog", (d) => d.accept());
    await page.click("#btn-reset");
    await page.waitForTimeout(100);
    ok("Start over clears the fields", (await page.$eval("#pages", (e) => e.value)) === "0");
    ok("Start over clears storage",
      await page.evaluate(() => localStorage.getItem("uoes-activity-estimator") === null));
  }

  /* ===== 9. Report, copy text, print ===== */
  console.log("\n9. Report, copy text, print");
  {
    await reset();
    await set("pages", 20); await set("mediacount", 1); await set("medialength", 45);
    await page.click("#btn-report");
    await page.waitForTimeout(100);
    const rep = await page.evaluate(() => ({
      hidden: document.getElementById("reportWrap").hidden,
      text: document.querySelector("#reportWrap pre").textContent,
      h2: document.querySelector("#reportWrap h2").textContent,
      inline: document.querySelector("#reportWrap pre").getAttribute("style"),
    }));
    ok("report appears", !rep.hidden);
    ok("report is headed as a learning activity estimate", /Learning activity estimate/.test(rep.h2), rep.h2);
    ok("report lists each activity with its basis", /Reading\s+0\.30 hrs\s+\(20 pages at 67 pages per hour\)/.test(rep.text), rep.text.slice(0, 200));
    ok("report totals in plain hours", /Total: 1\.05 hours for 2 activities/.test(rep.text), rep.text);
    ok("report never says per week", !/per week|hrs\/wk/i.test(rep.text));
    ok("report keeps the CC BY-NC-SA credit", /Barre[\s\S]*CC BY-NC-SA 4\.0/.test(rep.text));
    ok("report <pre> carries no inline styles", rep.inline === null, rep.inline);

    await page.emulateMedia({ media: "print" });
    const vis = await page.evaluate(() => ({
      report: getComputedStyle(document.getElementById("reportWrap")).display,
      form: getComputedStyle(document.getElementById("f")).display,
      header: getComputedStyle(document.querySelector("header")).display,
      h: document.getElementById("reportWrap").getBoundingClientRect().height,
    }));
    ok("print shows the report", vis.report !== "none", vis.report);
    ok("print hides the form and the site header", vis.form === "none" && vis.header === "none", vis.form + " " + vis.header);
    ok("print report has height", vis.h > 50, vis.h);
    const pdf = await page.pdf({ format: "Letter" });
    ok("print PDF is non-trivial", pdf.length > 5000, "bytes " + pdf.length);
    await page.emulateMedia({ media: "screen" });

    const printRule = await page.evaluate(() =>
      Array.from(document.styleSheets).some((s) => {
        let rules; try { rules = Array.from(s.cssRules); } catch (e) { return false; }
        return rules.some((r) => r.media && /print/.test(r.media.mediaText) &&
          Array.from(r.cssRules).some((x) => x.selectorText === "main > :not(#reportWrap)"));
      }));
    ok("print CSS uses the main > :not(#reportWrap) pattern", printRule);
  }

  /* ===== 10. Labels, aria, focus, links ===== */
  console.log("\n10. Labels, aria, focus, links");
  {
    await reset();
    const a11y = await page.evaluate(() => {
      const unlabelled = Array.from(document.querySelectorAll("input, select")).filter((el) =>
        !document.querySelector('label[for="' + el.id + '"]') && !el.getAttribute("aria-label"));
      const summaries = Array.from(document.querySelectorAll("details > summary"));
      const heads = summaries.filter((s) => s.querySelector("h2, h3, h4")).length;
      const names = summaries.map((s) => s.textContent.replace(/\s+/g, " ").trim());
      return {
        unlabelled: unlabelled.map((e) => e.id),
        summaries: summaries.length, heads,
        uniqueNames: new Set(names).size === names.length,
        live: !!document.querySelector('[aria-live="polite"]'),
        status: !!document.querySelector('[role="status"].sr-only'),
        sections: Array.from(document.querySelectorAll("section[aria-labelledby]")).every((s) =>
          document.getElementById(s.getAttribute("aria-labelledby"))),
      };
    });
    ok("every input and select has a label", a11y.unlabelled.length === 0, a11y.unlabelled.join(","));
    ok("every summary wraps a heading", a11y.summaries === 9 && a11y.heads === 9, a11y.summaries + "/" + a11y.heads);
    ok("no two disclosures share an accessible name", a11y.uniqueNames);
    ok("live region and copy status present", a11y.live && a11y.status);
    ok("every section's aria-labelledby resolves", a11y.sections);

    for (const sel of ["#pages", "#readingdensity", "#setreadingrate", "#btn-report", "summary#sum-writing"]) {
      await page.focus(sel);
      const o = await page.evaluate((s) => {
        const cs = getComputedStyle(document.querySelector(s));
        return { color: cs.outlineColor, width: cs.outlineWidth, style: cs.outlineStyle };
      }, sel);
      ok("focus outline is 2px solid Rutgers Blue on " + sel,
        o.color === "rgb(0, 127, 172)" && o.width === "2px" && o.style === "solid", JSON.stringify(o));
    }

    const links = await page.$$eval("a[href]", (els) => els.map((e) => e.getAttribute("href")));
    ok("links to the Credit Hour Planner", links.includes("credit_hour_planner.html"));
    ok("links the original methodology", links.some((h) => /cat\.wfu\.edu\/resources\/workload/.test(h)));
    ok("links the CC licence", links.some((h) => /creativecommons\.org\/licenses\/by-nc-sa\/4\.0/.test(h)));
    const footer = await page.$eval("footer", (e) => e.textContent.replace(/\s+/g, " "));
    ok("footer credits Barre, Brown and Esarey", /Betsy Barre, Allen Brown, and Justin Esarey/.test(footer));
    ok("footer keeps the same licence", /shared under the same license/.test(footer));
  }

  await browser.close();

  console.log("\n" + "=".repeat(60));
  console.log("PASS " + pass + "   FAIL " + fail + "   (" + (pass + fail) + " checks)");
  console.log("=".repeat(60));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
