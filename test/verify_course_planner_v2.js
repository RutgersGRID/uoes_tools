// Headless checks for course_planner_v2.html
const { chromium } = require("playwright-core");
const path = require("path");

const { chromePath } = require("./_chrome.js");
const EXEC = chromePath();
const URL = "file://" + path.resolve(__dirname, "..", "course_planner.html");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; }
  else { fail++; console.log("FAIL: " + name + (extra ? "  -> " + extra : "")); }
};

// The Word export writes its own store-only ZIP, so the harness reads one
// back independently rather than trusting the writer's arithmetic. Anything
// wrong with an offset, a length or a CRC shows up here rather than as a
// "Word cannot open this file" a designer reports three weeks later.
function crc32(bytes) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })());
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Reads the central directory, then each local header, and returns
// { name: text } plus whatever went wrong along the way.
function readZip(buf) {
  const problems = [];
  const files = {};
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return { files, problems: ["no end-of-central-directory record"] };
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) {
      problems.push("bad central header at entry " + n);
      break;
    }
    const method = buf.readUInt16LE(at + 10);
    const crc = buf.readUInt32LE(at + 16);
    const size = buf.readUInt32LE(at + 24);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const cmtLen = buf.readUInt16LE(at + 32);
    const offset = buf.readUInt32LE(at + 42);
    const name = buf.slice(at + 46, at + 46 + nameLen).toString("utf8");
    if (method !== 0) problems.push(name + ": not stored (method " + method + ")");
    if (buf.readUInt32LE(offset) !== 0x04034b50) {
      problems.push(name + ": local header missing at " + offset);
    } else {
      const lNameLen = buf.readUInt16LE(offset + 26);
      const lExtraLen = buf.readUInt16LE(offset + 28);
      const start = offset + 30 + lNameLen + lExtraLen;
      const data = buf.slice(start, start + size);
      if (crc32(data) !== crc) problems.push(name + ": CRC mismatch");
      files[name] = data.toString("utf8");
    }
    at += 46 + nameLen + extraLen + cmtLen;
  }
  return { files, problems };
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(URL);
  await page.waitForTimeout(200);

  // ---- structural / wording ----
  ok("no JS errors on load", errors.length === 0, errors.join(" | "));
  ok("title has no version suffix", (await page.title()) === "Course Content Planner",
    await page.title());

  // ---- steps collapse; basics and step 1 are the only ones open on load ----
  const openState = () => page.$$eval(".step-body", ns => ns.map(n => n.open));
  ok("every step is a collapsible <details>",
    (await page.$$eval("section.step > details.step-body", ns => ns.length)) === 4);
  ok("basics and step 1 open on load, steps 2 and 3 closed",
    JSON.stringify(await openState()) === JSON.stringify([true, true, false, false]),
    JSON.stringify(await openState()));
  ok("each step heading is the summary of its own step",
    (await page.$$eval("section.step > details.step-body > summary > h2",
      ns => ns.map(n => n.id))).join(",") ===
      "basicsHead,step1Head,step2Head,step3Head");
  ok("a closed step really hides its body",
    !(await page.isVisible("#evidenceList")) && !(await page.isVisible("#moduleCards")));
  ok("clicking a closed step heading opens it", await (async () => {
    await page.click("summary:has(> #step2Head)");
    const vis = await page.isVisible("#evidenceList");
    await page.click("summary:has(> #step2Head)");
    return vis && !(await page.isVisible("#evidenceList"));
  })());

  // ---- the course-objective key is a closed panel, not a standing block ----
  // Screen readers never needed it (every chip's aria-label carries
  // "CO1: <full text>"), but a touch user cannot read the chip tooltip
  // without ticking the box, so the key has to stay reachable by click.
  ok("the course-objective key sits inside a .guide panel",
    (await page.$$eval(".legend-panel > #goalLegend", ns => ns.length)) === 1 &&
    (await page.$$eval("details.legend-panel.guide", ns => ns.length)) === 1);
  ok("the key panel is closed on load", await (async () => {
    await page.evaluate(() => { document.querySelector("#step3Head")
      .closest("details").open = true; });
    return !(await page.isVisible("#goalLegend"));
  })());
  ok("clicking the key panel reveals the key", await (async () => {
    await page.click(".legend-panel > summary");
    const vis = await page.isVisible("#goalLegend");
    await page.click(".legend-panel > summary");
    return vis && !(await page.isVisible("#goalLegend"));
  })());
  ok("the key still updates while it is collapsed", await (async () => {
    await page.fill("#goal-first", "Analyze a food web");
    await page.waitForTimeout(150);
    // written with the panel shut; it must be right the moment it opens
    const hidden = await page.$eval("#goalLegend", n => n.textContent);
    await page.click(".legend-panel > summary");
    const shown = await page.$eval("#goalLegend", n => n.innerText);
    await page.click(".legend-panel > summary");
    await page.fill("#goal-first", "");
    await page.waitForTimeout(150);
    return /CO1 — Analyze a food web/.test(hidden) &&
      /CO1 — Analyze a food web/.test(shown);
  })());

  // Everything below drives the form, so open every step and every module
  // card and keep them open after each reload. These helpers are plumbing,
  // not assertions - a closed step or module hides its controls and
  // Playwright times out waiting for them to be visible.
  // The course-objective key is a closed .guide panel too, and several
  // checks read it with innerText, which is empty while it is hidden.
  const openSteps = () =>
    page.evaluate(() => document.querySelectorAll(".step-body, .legend-panel")
      .forEach(d => { d.open = true; }));
  // clicked rather than set, so the real handler updates aria-expanded
  const openModules = () =>
    page.evaluate(() => document.querySelectorAll(".mod-toggle[aria-expanded='false']")
      .forEach(b => b.click()));
  const openAll = async () => { await openSteps(); await openModules(); };
  // Set a module count the way a person does: type, then leave the field.
  // Blur is what fires the native change event - dispatching change by
  // hand leaves the field focused and it fires a second time later.
  const setCount = async (sel, v) => {
    await page.fill(sel, v);
    await page.locator(sel).blur();
    await page.waitForTimeout(150);
  };
  await openSteps();

  // ---- module cards collapse; module 1 is the only one open on load ----
  const modState = () => page.$$eval(".mod-toggle",
    ns => ns.map(n => n.getAttribute("aria-expanded")));
  ok("every module card has a disclosure button",
    (await page.$$eval(".mod-toggle", ns => ns.length)) === 16);
  ok("module 1 opens on load, the rest are closed",
    (await modState()).join(",") === ["true"].concat(Array(15).fill("false")).join(","),
    (await modState()).join(","));
  ok("each toggle points at its own card body", await page.evaluate(() =>
    [...document.querySelectorAll(".mod-toggle")].every((t, i) => {
      const body = document.getElementById(t.getAttribute("aria-controls"));
      return body && body.id === "mod" + i + "-body" &&
        body.hidden === (t.getAttribute("aria-expanded") === "false");
    })));
  ok("a closed module hides its fields but keeps its topic input visible",
    !(await page.isVisible("#mod1-materials")) &&
    (await page.isVisible(".mod-card:nth-child(2) header input")));
  ok("clicking a module name toggles it", await (async () => {
    await page.click(".mod-card:nth-child(2) .mod-toggle");
    const opened = await page.isVisible("#mod1-materials");
    await page.click(".mod-card:nth-child(2) .mod-toggle");
    return opened && !(await page.isVisible("#mod1-materials"));
  })());
  ok("module open state survives a re-render", await (async () => {
    await page.click(".mod-card:nth-child(3) .mod-toggle");   // open module 3
    await page.click("#addGoalBtn");                          // forces renderModules
    await page.waitForTimeout(100);
    const st = await modState();
    return st[2] === "true" && st[1] === "false" && st[0] === "true";
  })());

  // ---- the module count is editable in Course basics and in Step 3 ----
  ok("Step 3 has its own module-count field",
    (await page.$$eval("#moduleCountCards", ns => ns.length)) === 1);
  // Two module-count fields on one page. Each label's accessible name must
  // start with its own *visible* text (WCAG 2.5.3 Label in Name, so "click
  // Number of modules" works by voice), and the two names must differ from
  // each other (so a screen reader's form-field list can tell them apart).
  // The Step 3 label manages both by appending an .sr-only qualifier.
  const countLabels = await page.$$eval(
    "label[for='moduleCount'], label[for='moduleCountCards']",
    ns => ns.map(n => {
      const acc = n.textContent.replace(/\s+/g, " ").trim();
      const vis = Array.from(n.childNodes)
        .filter(c => !(c.nodeType === 1 && c.classList.contains("sr-only")))
        .map(c => c.textContent).join("").replace(/\s+/g, " ").trim();
      return { acc, vis };
    }));
  ok("both module-count labels exist", countLabels.length === 2,
    JSON.stringify(countLabels));
  ok("each module-count label's accessible name starts with its visible text",
    countLabels.every(l => l.vis.length > 0 && l.acc.startsWith(l.vis)),
    JSON.stringify(countLabels));
  ok("the two module-count labels have distinct accessible names",
    countLabels[0].acc !== countLabels[1].acc, JSON.stringify(countLabels));
  ok("both module-count labels read the same on screen",
    countLabels[0].vis === countLabels[1].vis, JSON.stringify(countLabels));
  ok("each module-count label carries an .sr-only qualifier",
    (await page.$$eval(
      "label[for='moduleCount'] .sr-only, label[for='moduleCountCards'] .sr-only",
      ns => ns.length)) === 2);

  // Step 3's count block is one row at reading width: label, box and hint
  // all sit on the same line. It stacks only when the row runs out of
  // width, which is checked with the rest of the narrow-screen layout.
  ok("Step 3's count label, field and hint share one row", await page.evaluate(() => {
    const mid = el => {
      const r = el.getBoundingClientRect();
      return r.y + r.height / 2;
    };
    const block = document.querySelector(".module-count");
    const l = mid(block.querySelector("label"));
    const i = mid(block.querySelector("input"));
    const h = mid(block.querySelector(".hint"));
    return Math.abs(l - i) < 6 && Math.abs(l - h) < 8;
  }));
  ok("editing the Step 3 count updates the basics field and the cards",
    await (async () => {
      await setCount("#moduleCountCards", "4");
      return (await page.inputValue("#moduleCount")) === "4" &&
        (await page.$$eval(".mod-card", ns => ns.length)) === 4;
    })());
  ok("editing the basics count updates the Step 3 field and the cards",
    await (async () => {
      await setCount("#moduleCount", "6");
      return (await page.inputValue("#moduleCountCards")) === "6" &&
        (await page.$$eval(".mod-card", ns => ns.length)) === 6;
    })());
  ok("an out-of-range count is clamped in both fields",
    await (async () => {
      await setCount("#moduleCountCards", "50");
      return (await page.inputValue("#moduleCountCards")) === "20" &&
        (await page.inputValue("#moduleCount")) === "20" &&
        (await page.$$eval(".mod-card", ns => ns.length)) === 20;
    })());
  ok("typed module text survives a count change", await (async () => {
    await openModules();
    await page.fill("#mod0-materials", "Chapter 3");
    await setCount("#moduleCount", "3");
    await openModules();
    return (await page.inputValue("#mod0-materials")) === "Chapter 3";
  })());

  // Two inputs feed the module count, so a change event can arrive carrying
  // a number the state already holds. Rebuilding then would discard and
  // recreate every card for nothing.
  ok("a change event with an unchanged count does not rebuild the cards",
    await (async () => {
      await openModules();
      await page.fill("#mod0-activities", "Intro video");
      await page.$eval("#mod0-activities", n => { n.dataset.mark = "1"; });
      await page.dispatchEvent("#moduleCount", "change");
      await page.waitForTimeout(150);
      // the very same DOM node must still be there, mark and text intact
      return (await page.$eval("#mod0-activities", n => n.dataset.mark === "1")) &&
        (await page.inputValue("#mod0-activities")) === "Intro video";
    })());

  // put the page back the way the rest of the harness expects it
  await page.evaluate(() => localStorage.removeItem("uoes-course-planner"));
  await page.reload();
  await openAll();

  const h2s = await page.$$eval("section.step h2", ns => ns.map(n => n.textContent.replace(/\s+/g, " ").trim()));
  ok("four section headings (basics + 3 steps)", h2s.length === 4, JSON.stringify(h2s));
  ok("step 1 heading reworded",
    h2s[1] === "1Decide what your students will take away from your course", h2s[1]);
  ok("step 2 heading reworded",
    h2s[2] === "2Decide how you'll assess each course objective", h2s[2]);
  ok("step 3 is module mapping",
    h2s[3] === "3Organize your course content into modules", h2s[3]);
  ok("the structure/teaching-strategy step is gone",
    !h2s.some(h => /structure and teaching strategy/i.test(h)), JSON.stringify(h2s));

  const nums = await page.$$eval("section.step .step-num", ns => ns.map(n => n.textContent.trim()));
  ok("step badges are 1-3 with no 4", JSON.stringify(nums) === JSON.stringify(["✎", "1", "2", "3"]), JSON.stringify(nums));

  const step1 = await page.$eval("section[aria-labelledby='step1Head']", n => n.innerHTML);
  // The Learning Objective Builder link now lives in Step 1's guidance
  // panel. It sat in the module step until September 2026, and was off the
  // page entirely for part of that day.
  ok("step 1's guide panel carries the Learning Objective Builder link",
    await page.$$eval("section[aria-labelledby='step1Head'] details.guide a[href='learning_objectives.html']",
      ns => ns.length) === 1);
  const goalLead = await page.$eval("section[aria-labelledby='step1Head'] h3 + p.step-lead",
    n => n.textContent.replace(/\s+/g, " ").trim());
  ok("goals lead-in updated",
    goalLead === "What should students be able to do by the end of the course.", goalLead);

  const lobCount = await page.$$eval("a[href='learning_objectives.html']", ns => ns.length);
  ok("exactly one Learning Objective Builder link on the page", lobCount === 1,
    "count=" + lobCount);
  ok("the builder link opens in a new tab, safely",
    await page.$eval("a[href='learning_objectives.html']",
      n => n.target === "_blank" && /noopener/.test(n.rel)));
  ok("the module step no longer carries the builder link",
    await page.$$eval("section[aria-labelledby='step3Head'] a[href='learning_objectives.html']",
      ns => ns.length) === 0);

  // the per-goal activities list is gone; activities live on the module cards
  ok("per-goal activities list removed",
    (await page.$$eval("#activitiesList", ns => ns.length)) === 0);
  ok("no leftover 'Assessed by:' rows outside Step 2",
    !/Assessed by:/.test(await page.evaluate(() => document.body.innerText)));
  ok("the goal key still sits above the module cards", await page.evaluate(() => {
    const s = document.querySelector("section[aria-labelledby='step3Head']");
    const a = s.querySelector("#goalLegend"), m = s.querySelector("#moduleCards");
    return !!(a && m) &&
      !!(a.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));
  ok("no orphaned step section ids (renumbered, not duplicated)",
    !/id="step(4|5)Head"/.test(await page.content()));
  ok("the organizing-principle and strategy controls are gone",
    (await page.$$eval("#principle, #strategy, #principleNote", ns => ns.length)) === 0);
  // the course-topic triage list was removed from Step 1
  ok("the course-topic controls are gone",
    (await page.$$eval("#topicsList, #addTopicBtn", ns => ns.length)) === 0);
  ok("no Course Topics heading in Step 1",
    !/course topics/i.test(step1), step1.slice(0, 200));

  // ---- module cards ----
  const cardOrder = await page.$eval("#moduleCards .mod-card:first-child .card-body", n =>
    Array.from(n.children).map(c =>
      c.classList.contains("obj-block") ? "Objectives"
        : c.classList.contains("two-col") ? "Assessments+Activities"
          : c.querySelector("label").textContent.trim()));
  ok("module card row order: Objectives, Materials, then Assessments+Activities",
    JSON.stringify(cardOrder) === JSON.stringify(["Objectives", "Materials & resources", "Assessments+Activities"]),
    JSON.stringify(cardOrder));
  const twoColLabels = await page.$$eval("#moduleCards .mod-card:first-child .two-col label",
    ns => ns.map(n => n.textContent.trim()));
  ok("Assessments is the left column, Activities the right",
    JSON.stringify(twoColLabels) === JSON.stringify(["Assessments", "Activities"]),
    JSON.stringify(twoColLabels));
  const headCells = await page.$$eval("#moduleCards .mod-card:first-child .obj-head span",
    ns => ns.map(n => n.textContent.trim()));
  ok("objectives block is headed Objectives | Alignment",
    JSON.stringify(headCells) === JSON.stringify(["Objectives", "Alignment", ""]), JSON.stringify(headCells));
  ok("Objectives no longer marked optional",
    (await page.$$eval("#moduleCards .opt", ns => ns.length)) === 0);
  const objCols = await page.$eval("#moduleCards .obj-row",
    n => getComputedStyle(n).gridTemplateColumns.split(" ").map(v => parseFloat(v)));
  ok("alignment column is much narrower than the objective field",
    objCols.length === 3 && objCols[1] < objCols[0] / 2,
    JSON.stringify(objCols));
  ok("no due-date inputs anywhere",
    (await page.$$eval("[id*='duedate']", ns => ns.length)) === 0);
  ok("no 'Due dates' text visible on the page",
    !/due date/i.test(await page.evaluate(() => document.body.innerText)));
  ok("two-column grid used, three-col gone",
    /class="two-col"/.test(await page.content()) && !/three-col/.test(await page.content()));
  const cols = await page.$eval("#moduleCards .two-col",
    n => getComputedStyle(n).gridTemplateColumns.split(" ").length);
  ok("grid renders two columns", cols === 2, "cols=" + cols);
  ok("16 module cards by default",
    (await page.$$eval("#moduleCards .mod-card", ns => ns.length)) === 16);

  // every module control has an accessible name
  const unnamed = await page.$$eval("#moduleCards input, #moduleCards textarea", ns =>
    ns.filter(n => {
      if (n.getAttribute("aria-label")) return false;
      return !(n.id && document.querySelector('label[for="' + n.id + '"]'));
    }).length);
  ok("every module control has a label or aria-label", unnamed === 0, "unnamed=" + unnamed);

  // focus outline still present
  await page.focus("#courseTitle");
  const outline = await page.$eval("#courseTitle", n => getComputedStyle(n).outlineColor);
  ok("focus outline is Rutgers Blue", /0,\s*127,\s*172/.test(outline), outline);

  // ---- live sync from goals into steps 2 and 4 ----
  await page.fill("#courseTitle", "Intro to Ecology");
  await page.fill("#goal-first", "Analyze a food web");
  await page.waitForTimeout(50);
  const ev2 = await page.$eval("#evidenceList .ev-goal", n => n.textContent);
  ok("goal text syncs into step 2", ev2 === "Analyze a food web", ev2);
  ok("objective text syncs into the step 4 course-objective key",
    /CO1 — Analyze a food web/.test(await page.$eval("#goalLegend", n => n.innerText)));

  await page.fill("#evidenceList input", "Case-analysis paper in Module 6");
  await page.waitForTimeout(50);

  await page.fill("#mod0-obj0", "Identify trophic levels");
  await page.check('#moduleCards .mod-card:first-child .obj-row:first-child .align-chip input');
  await page.fill("#mod0-materials", "Chapter 3; food-web dataset");
  await page.fill("#mod0-activities", "Watch intro video; discussion post");
  await page.fill("#mod0-assessments", "Practice quiz");
  await page.waitForTimeout(700);

  // ---- localStorage under the one planner key ----
  const keys = await page.evaluate(() => Object.keys(localStorage));
  ok("saves under uoes-course-planner", keys.includes("uoes-course-planner"), JSON.stringify(keys));
  // Guards a half-finished rename: the planner must not still be writing,
  // or leaving behind, the old -v2 key.
  ok("leaves no stale -v2 key behind",
    !keys.includes("uoes-course-planner-v2"), JSON.stringify(keys));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner")));
  ok("saved module has no duedates field", !("duedates" in saved.modules[0]), JSON.stringify(saved.modules[0]));
  ok("saved state carries no principle or strategy",
    !("principle" in saved) && !("strategy" in saved), JSON.stringify(Object.keys(saved)));
  ok("saved state carries no topics", !("topics" in saved), JSON.stringify(Object.keys(saved)));
  ok("saved module keeps materials", saved.modules[0].materials === "Chapter 3; food-web dataset");
  ok("saved objectives are a list of {text, align}",
    Array.isArray(saved.modules[0].objectives) &&
    saved.modules[0].objectives[0].text === "Identify trophic levels" &&
    saved.modules[0].objectives[0].align.length === 1,
    JSON.stringify(saved.modules[0].objectives));
  ok("goals no longer carry an activities field", !("activities" in saved.goals[0]),
    JSON.stringify(saved.goals[0]));

  // round-trip
  await page.reload();
  await openAll();
  await page.waitForTimeout(200);
  ok("course title round-trips", (await page.inputValue("#courseTitle")) === "Intro to Ecology");
  ok("goal round-trips", (await page.inputValue("#goal-first")) === "Analyze a food web");
  ok("module materials round-trip",
    (await page.inputValue("#mod0-materials")) === "Chapter 3; food-web dataset");
  ok("module objective round-trips",
    (await page.inputValue("#mod0-obj0")) === "Identify trophic levels");
  ok("alignment checkbox round-trips",
    await page.isChecked('#moduleCards .mod-card:first-child .obj-row:first-child .align-chip input'));

  // ---- migration: a v1-shaped save (with duedates) loaded under the planner key ----
  await page.evaluate(() => {
    localStorage.setItem("uoes-course-planner", JSON.stringify({
      course: "Legacy", moduleCount: 2,
      goals: [{ id: 0, text: "Old goal", evidence: "Old exam" }],
      topics: [{ id: 1, text: "Old topic", priority: "Essential" }],
      principle: "", strategy: "",
      modules: [{ topic: "Wk1", objectives: "Old objective", activities: "A", duedates: "Friday" },
      { topic: "Wk2" }]
    }));
  });
  await page.reload();
  await openAll();
  await page.waitForTimeout(200);
  ok("migration: no JS errors", errors.length === 0, errors.join(" | "));
  ok("migration: a legacy goal's activities field is dropped", await page.evaluate(() => {
    document.getElementById("courseTitle").value += "";
    return true;
  }));
  ok("migration: legacy module keeps activities",
    (await page.inputValue("#mod0-activities")) === "A");
  ok("migration: legacy module gains materials",
    (await page.inputValue("#mod0-materials")) === "");
  ok("migration: a legacy objectives string becomes one objective row",
    (await page.inputValue("#mod0-obj0")) === "Old objective" &&
    (await page.$$eval("#moduleCards .mod-card:first-child .obj-row", ns => ns.length)) === 1);
  ok("migration: a module with no objectives gets one blank row",
    (await page.inputValue("#mod1-obj0")) === "");
  await page.fill("#courseTitle", "Legacy edited");
  await page.waitForTimeout(700);
  const migrated = await page.evaluate(
    () => JSON.parse(localStorage.getItem("uoes-course-planner")));
  ok("migration: a legacy principle and strategy are discarded",
    !("principle" in migrated) && !("strategy" in migrated),
    JSON.stringify(Object.keys(migrated)));
  ok("migration: a legacy topic list is discarded",
    !("topics" in migrated), JSON.stringify(Object.keys(migrated)));
  ok("migration: duedates dropped from saved state",
    !("duedates" in migrated.modules[0]), JSON.stringify(migrated.modules[0]));
  ok("migration: objectives saved back as a list",
    Array.isArray(migrated.modules[0].objectives) &&
    migrated.modules[0].objectives[0].align.length === 0,
    JSON.stringify(migrated.modules[0].objectives));

  // corrupt save
  await page.evaluate(() => localStorage.setItem("uoes-course-planner", "{not json"));
  await page.reload();
  await openAll();
  await page.waitForTimeout(200);
  ok("corrupt save starts fresh without erroring", errors.length === 0, errors.join(" | "));
  ok("corrupt save still renders module cards",
    (await page.$$eval("#moduleCards .mod-card", ns => ns.length)) === 16);


  // ---- multiple objectives per module + goal alignment ----
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openAll();
  await page.waitForTimeout(200);

  const legendEmpty = await page.$eval("#goalLegend", n => n.innerText);
  ok("objective key prompts for objectives when none are written",
    /Write your course objectives in Step 1/.test(legendEmpty), legendEmpty);
  ok("alignment shows 'no goals yet' before any goal is written",
    (await page.$$eval("#moduleCards .align-none", ns => ns.length)) === 16);
  ok("each module starts with exactly one objective row",
    (await page.$$eval("#moduleCards .obj-row", ns => ns.length)) === 16);

  // write two goals
  await page.fill("#goal-first", "Analyze a food web");
  await page.waitForTimeout(80);
  ok("writing the first goal adds a checkbox to every objective row",
    (await page.$$eval("#moduleCards .align-chip", ns => ns.length)) === 16);
  await page.click("#addGoalBtn");
  const goalInputs = await page.$$("#goalsList input[type='text']");
  await goalInputs[1].fill("Model energy transfer");
  await page.waitForTimeout(80);
  ok("a second goal adds a second checkbox per row",
    (await page.$$eval("#moduleCards .align-chip", ns => ns.length)) === 32);

  const legend = await page.$eval("#goalLegend", n => n.innerText.replace(/\s+/g, " ").trim());
  ok("goal key numbers and lists both goals",
    legend === "Course objectives: CO1 — Analyze a food web CO2 — Model energy transfer", legend);
  ok("goal key puts each course objective on its own line",
    (await page.$$eval("#goalLegend ul.legend-list > li.legend-goal", ns => ns.length)) === 2 &&
    (await page.$$eval("#goalLegend li.legend-goal", ns => {
      // The key's panel may be closed here; measure with it open.
      const panel = ns[0].closest("details"), was = panel.open;
      panel.open = true;
      const tops = ns.map(n => n.getBoundingClientRect().top);
      panel.open = was;
      return tops[1] > tops[0] + 10;
    })));

  const chipText = await page.$$eval("#moduleCards .mod-card:first-child .align-chip",
    ns => ns.map(n => n.textContent.trim()));
  ok("checkbox chips are labelled CO1, CO2",
    JSON.stringify(chipText) === JSON.stringify(["CO1", "CO2"]), JSON.stringify(chipText));
  const chipNames = await page.$$eval("#moduleCards .mod-card:first-child .align-chip input",
    ns => ns.map(n => n.getAttribute("aria-label")));
  ok("each checkbox's accessible name carries the goal text and contains its visible label",
    JSON.stringify(chipNames) ===
    JSON.stringify(["CO1: Analyze a food web", "CO2: Model energy transfer"]),
    JSON.stringify(chipNames));
  // The full objective rides in a real tooltip element, not a `title`
  // attribute: the browser owns the type size of a native tooltip and the
  // page cannot enlarge it.
  const tipText = await page.$$eval("#moduleCards .mod-card:first-child .align-tip",
    ns => ns.map(n => n.textContent));
  ok("hovering a chip shows the full objective",
    tipText[1] === "CO2: Model energy transfer", JSON.stringify(tipText));
  ok("no leftover title attribute doubling the tooltip",
    (await page.$$eval("#moduleCards .align-chip, #moduleCards .align-chip-wrap",
      ns => ns.filter(n => n.getAttribute("title")).length)) === 0);
  ok("the tooltip is hidden from screen readers, which have it in the checkbox's name",
    (await page.$$eval("#moduleCards .align-tip",
      ns => ns.every(n => n.getAttribute("aria-hidden") === "true"))));

  // 20% larger than the chip label it explains
  const tipSize = await page.$eval("#moduleCards .mod-card:first-child .align-chip-wrap",
    w => {
      const px = el => parseFloat(getComputedStyle(el).fontSize);
      return { chip: px(w.querySelector(".align-chip")), tip: px(w.querySelector(".align-tip")) };
    });
  ok("tooltip text is 20% larger than the chip label",
    Math.abs(tipSize.tip / tipSize.chip - 1.2) < 0.01,
    JSON.stringify(tipSize));

  const wrap1 = page.locator("#moduleCards .mod-card:first-child .align-chip-wrap").first();
  const tip1 = wrap1.locator(".align-tip");
  const tipDisplay = () => tip1.evaluate(n => getComputedStyle(n).display);
  ok("the tooltip is hidden until hovered", (await tipDisplay()) === "none");

  await wrap1.hover();
  await page.waitForTimeout(60);
  ok("hovering the chip shows the tooltip", (await tipDisplay()) === "block");

  // It opens leftward for a reason: dropped below, it lands on top of the
  // next chip down and swallows clicks meant for it.
  const overlaps = await tip1.evaluate(tip => {
    const t = tip.getBoundingClientRect();
    return [...document.querySelectorAll("#moduleCards .align-chip")].filter(c => {
      const r = c.getBoundingClientRect();
      return t.left < r.right && r.left < t.right && t.top < r.bottom && r.top < t.bottom;
    }).length;
  });
  ok("the open tooltip covers no alignment chip", overlaps === 0, "overlaps " + overlaps);

  // Stacked, the row puts the chips at the left edge, so the tooltip has to
  // flip out from under the whole alignment box or the card clips it.
  ok("the tooltip stays inside the card on a narrow screen", await (async () => {
    const before = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 900 });
    await wrap1.hover();
    await page.waitForTimeout(80);
    const fits = await tip1.evaluate(t => {
      const r = t.getBoundingClientRect();
      const c = t.closest(".mod-card").getBoundingClientRect();
      return r.width > 0 && r.left >= c.left && r.right <= c.right;
    });
    await page.setViewportSize(before);
    await wrap1.hover();
    await page.waitForTimeout(80);
    return fits;
  })());

  // WCAG 2.1 1.4.13: dismissible without moving the pointer
  await page.keyboard.press("Escape");
  await page.waitForTimeout(60);
  ok("Escape dismisses the tooltip while still hovered", (await tipDisplay()) === "none");
  await page.mouse.move(2, 2);
  await page.waitForTimeout(60);
  ok("moving the pointer re-arms the tooltips",
    (await page.$eval("body", b => b.classList.contains("tips-off"))) === false);
  const groupName = await page.$eval("#moduleCards .align-box", n => n.getAttribute("aria-label"));
  ok("the alignment cluster is a labelled group",
    groupName === "Course objectives that objective 1 of module 1 aligns with", groupName);

  // rewording a goal relabels the checkboxes without a rebuild
  await page.fill("#goal-first", "Analyze a freshwater food web");
  await page.waitForTimeout(80);
  ok("rewording a goal updates the checkbox labels live",
    (await page.$eval("#moduleCards .mod-card:first-child .align-chip input",
      n => n.getAttribute("aria-label"))) === "CO1: Analyze a freshwater food web");
  ok("rewording a goal updates the key",
    /CO1 — Analyze a freshwater food web/.test(await page.$eval("#goalLegend", n => n.innerText)));

  // add objectives to module 1
  const addObj = await page.$("#moduleCards .mod-card:first-child .obj-block .add-btn");
  await page.fill("#mod0-obj0", "Identify trophic levels");
  await addObj.click();
  await page.fill("#mod0-obj1", "Trace energy through a web");
  await addObj.click();
  await page.fill("#mod0-obj2", "Predict effects of a removal");
  ok("module 1 now has three objective rows",
    (await page.$$eval("#moduleCards .mod-card:first-child .obj-row", ns => ns.length)) === 3);
  ok("other modules still have one objective row",
    (await page.$$eval("#moduleCards .mod-card:nth-child(2) .obj-row", ns => ns.length)) === 1);
  const objNames = await page.$$eval("#moduleCards .mod-card:first-child .obj-row input[type='text']",
    ns => ns.map(n => n.getAttribute("aria-label")));
  ok("objective inputs are individually labelled",
    JSON.stringify(objNames) === JSON.stringify(
      ["Objective 1 for module 1", "Objective 2 for module 1", "Objective 3 for module 1"]),
    JSON.stringify(objNames));

  // tick alignments: obj1 -> CO1, obj2 -> CO1+CO2, obj3 -> CO2
  const boxes = i => "#moduleCards .mod-card:first-child .obj-row:nth-child(" + i + ") .align-chip input";
  await page.check(boxes(1) + ":nth-of-type(1)");
  await page.locator(boxes(2)).nth(0).check();
  await page.locator(boxes(2)).nth(1).check();
  await page.locator(boxes(3)).nth(1).check();
  await page.waitForTimeout(700);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner")));
  const gIds = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("uoes-course-planner")).goals.map(g => g.id));
  ok("alignments saved per objective",
    JSON.stringify(st.modules[0].objectives.map(o => o.align)) ===
    JSON.stringify([[gIds[0]], [gIds[0], gIds[1]], [gIds[1]]]),
    JSON.stringify(st.modules[0].objectives));

  // unticking removes it
  await page.locator(boxes(2)).nth(0).uncheck();
  await page.waitForTimeout(700);
  const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner")));
  ok("unticking removes the alignment",
    JSON.stringify(st2.modules[0].objectives[1].align) === JSON.stringify([gIds[1]]),
    JSON.stringify(st2.modules[0].objectives[1].align));
  await page.locator(boxes(2)).nth(0).check();

  // deleting a goal prunes stale alignments and renumbers
  await page.click("#goalsList li:first-child .remove-btn");
  await page.waitForTimeout(700);
  const st3 = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner")));
  ok("deleting a goal drops its id from every objective",
    JSON.stringify(st3.modules[0].objectives.map(o => o.align)) ===
    JSON.stringify([[], [gIds[1]], [gIds[1]]]),
    JSON.stringify(st3.modules[0].objectives.map(o => o.align)));
  ok("the surviving objective renumbers to CO1",
    /Course objectives: CO1 — Model energy transfer/.test(
      (await page.$eval("#goalLegend", n => n.innerText)).replace(/\s+/g, " ")));
  ok("only one checkbox per row after the delete",
    (await page.$$eval("#moduleCards .mod-card:first-child .obj-row:first-child .align-chip",
      ns => ns.length)) === 1);
  ok("surviving alignments stay ticked after renumbering",
    await page.locator(boxes(2)).nth(0).isChecked());
  ok("multiple objectives survive a goal delete",
    (await page.inputValue("#mod0-obj2")) === "Predict effects of a removal");

  // removing an objective row
  await page.click("#moduleCards .mod-card:first-child .obj-row:nth-child(1) .remove-btn");
  await page.waitForTimeout(700);
  ok("removing an objective leaves the others intact",
    (await page.inputValue("#mod0-obj0")) === "Trace energy through a web" &&
    (await page.$$eval("#moduleCards .mod-card:first-child .obj-row", ns => ns.length)) === 2);
  const st4 = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner")));
  ok("removing an objective keeps the remaining alignments",
    JSON.stringify(st4.modules[0].objectives.map(o => o.align)) ===
    JSON.stringify([[gIds[1]], [gIds[1]]]),
    JSON.stringify(st4.modules[0].objectives.map(o => o.align)));

  // never leaves a module with zero rows
  await page.click("#moduleCards .mod-card:nth-child(2) .obj-row:first-child .remove-btn");
  ok("a module always keeps at least one objective row",
    (await page.$$eval("#moduleCards .mod-card:nth-child(2) .obj-row", ns => ns.length)) === 1);

  // every alignment control still has an accessible name
  const unnamedCbs = await page.$$eval("#moduleCards input[type='checkbox']",
    ns => ns.filter(n => !n.getAttribute("aria-label")).length);
  ok("every alignment checkbox has an accessible name", unnamedCbs === 0, "unnamed=" + unnamedCbs);
  ok("no JS errors through the alignment flow", errors.length === 0, errors.join(" | "));

  // the plan reflects several objectives with their tags
  await page.click("#generateBtn");
  await page.waitForTimeout(200);
  const planAlign = await page.$eval("#plan", n => n.innerText);
  ok("plan lists both objectives with their alignment tags",
    /Objectives: Trace energy through a web \[aligns with CO1\]; Predict effects of a removal \[aligns with CO1\]/
      .test(planAlign), planAlign.slice(0, 600));

  // ---- plan generation ----
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openAll();
  await page.waitForTimeout(200);
  await page.fill("#courseTitle", "Intro to Ecology");
  await page.fill("#goal-first", "Analyze a food web");
  await page.fill("#evidenceList input", "Case-analysis paper");
  await page.fill("#mod0-obj0", "Identify trophic levels");
  await page.check('#moduleCards .mod-card:first-child .obj-row:first-child .align-chip input');
  await page.fill("#mod0-materials", "Chapter 3");
  await page.fill("#mod0-activities", "Intro video");
  await page.fill("#mod0-assessments", "Quiz 1");
  await page.click("#generateBtn");
  await page.waitForTimeout(200);
  const planText = await page.$eval("#plan", n => n.innerText);
  ok("plan shows objective, numbered CO1", /CO1 — Analyze a food web/.test(planText));
  ok("plan shows assessment", /Case-analysis paper/.test(planText));
  const goalItems = await page.$$eval("#plan ul li", ns => ns.map(n => n.innerText));
  ok("plan goal entries show only the assessment, no activities line",
    goalItems.length === 1 && /Assessment: Case-analysis paper/.test(goalItems[0]) &&
    !/Activities/.test(goalItems[0]), JSON.stringify(goalItems));
  ok("plan goals heading drops activities",
    /Course objectives & assessments/i.test(planText) ||
    !/goals, assessments & activities/i.test(planText));
  ok("plan module order is Objectives, Materials, Assessments, Activities",
    /Objectives: Identify trophic levels \[aligns with CO1\][\s\S]*Materials: Chapter 3[\s\S]*Assessments: Quiz 1[\s\S]*Activities: Intro video/.test(planText),
    planText.slice(0, 400));
  ok("plan has no due dates row", !/Due dates/i.test(planText));
  ok("plan has no Topics section", !/^\s*Topics\s*$/m.test(planText), planText.slice(0, 400));
  ok("empty modules marked not planned", /\(not planned yet\)/.test(planText));
  ok("plan heading carries the course title",
    (await page.$eval("#planHead", n => n.textContent)) === "Intro to Ecology — Course Plan");


  // ---- Word export --------------------------------------------------
  // The plan generated just above is still on screen, so the export runs
  // against exactly the state those checks describe.
  ok("a Download as Word button sits with the other plan buttons",
    (await page.$$eval("#planWrap button.small-btn", ns => ns.map(n => n.id)))
      .indexOf("wordBtn") !== -1);
  ok("the Word button is named for what it produces",
    /word/i.test(await page.$eval("#wordBtn", n => n.textContent)),
    await page.$eval("#wordBtn", n => n.textContent));

  // The module cards have no topic yet; the export reads state, so filling
  // it here is enough without regenerating the on-page plan.
  await page.fill("[aria-label=\"Topic or theme for module 1\"]", "Food webs");
  await page.waitForTimeout(120);

  const docxBytes = Buffer.from(await page.evaluate(async () => {
    const buf = await zipStore(docxParts()).arrayBuffer();
    return Array.from(new Uint8Array(buf));
  }));
  ok("export starts with a local file header",
    docxBytes.slice(0, 4).toString("hex") === "504b0304",
    docxBytes.slice(0, 4).toString("hex"));
  const zip = readZip(docxBytes);
  ok("the archive reads back cleanly", zip.problems.length === 0,
    zip.problems.join(" | "));
  ok("archive holds the five parts a .docx needs",
    ["[Content_Types].xml", "_rels/.rels", "word/_rels/document.xml.rels",
      "word/styles.xml", "word/document.xml"]
      .every(n => typeof zip.files[n] === "string"),
    Object.keys(zip.files).join(", "));
  ok("the blob is typed as a Word document",
    (await page.evaluate(() => zipStore(docxParts()).type)) ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  const docXml = zip.files["word/document.xml"] || "";
  ok("document.xml parses as XML", await page.evaluate(xml => {
    const d = new DOMParser().parseFromString(xml, "application/xml");
    return !d.getElementsByTagName("parsererror").length;
  }, docXml));
  ok("styles.xml parses as XML", await page.evaluate(xml => {
    const d = new DOMParser().parseFromString(xml, "application/xml");
    return !d.getElementsByTagName("parsererror").length;
  }, zip.files["word/styles.xml"] || ""));

  // The whole point of the export: one table row per module.
  const rowCount = (docXml.match(/<w:tr>|<w:tr [^>]*>/g) || []).length;
  const modCount = await page.evaluate(() => state.modules.length);
  ok("exactly one table row per module, plus a header row",
    rowCount === modCount + 1, "rows=" + rowCount + " modules=" + modCount);
  ok("the table declares six columns",
    (docXml.match(/<w:gridCol /g) || []).length === 6);
  ok("column widths add up to the landscape content width",
    (docXml.match(/<w:gridCol w:w="(\d+)"/g) || [])
      .reduce((n, s) => n + parseInt(s.match(/\d+/)[0], 10), 0) === 12960);
  ok("the header row repeats across pages", /<w:tblHeader\/>/.test(docXml));
  ok("header cells name the module fields",
    ["Module", "Topic", "Objectives", "Materials", "Assessments", "Activities"]
      .every(h => docXml.indexOf(">" + h + "</w:t>") !== -1));
  ok("the page is landscape", /w:orient="landscape"/.test(docXml));
  ok("the export has no Topics section", docXml.indexOf(">Topics</w:t>") === -1);
  ok("a module row carries its topic and every field",
    ["Food webs", "Chapter 3", "Quiz 1", "Intro video"]
      .every(v => docXml.indexOf(">" + v + "</w:t>") !== -1));
  ok("module objectives keep their alignment tags",
    docXml.indexOf("Identify trophic levels [aligns with CO1]") !== -1);
  ok("course objectives are numbered in the export",
    docXml.indexOf("CO1 — Analyze a food web") !== -1);
  ok("the export carries the course title",
    docXml.indexOf("Intro to Ecology — Course Plan") !== -1);
  ok("headings come through as styled paragraphs",
    /w:val="Heading1"/.test(docXml) && /w:val="Title"/.test(docXml));
  ok("brand colour is read from the design token, not hardcoded twice",
    (zip.files["word/styles.xml"] || "").indexOf('w:color w:val="CC0033"') !== -1);
  ok("the header band uses the Light Blue token",
    /w:fill="DEF0F9"/.test(docXml));

  // A course title with XML metacharacters must not produce a broken part.
  await page.fill("#courseTitle", 'Ecology & <Field> "Methods"');
  await page.waitForTimeout(120);
  const escaped = await page.evaluate(() =>
    docxParts().filter(p => p.name === "word/document.xml")[0].text);
  ok("XML metacharacters in the course title are escaped",
    escaped.indexOf("Ecology &amp; &lt;Field&gt; &quot;Methods&quot;") !== -1);
  ok("the escaped document still parses", await page.evaluate(xml => {
    const d = new DOMParser().parseFromString(xml, "application/xml");
    return !d.getElementsByTagName("parsererror").length;
  }, escaped));
  ok("the filename drops characters a filesystem rejects",
    (await page.evaluate(() => docxFilename())) ===
    "Ecology & Field Methods - Course Plan.docx",
    await page.evaluate(() => docxFilename()));
  await page.fill("#courseTitle", "Intro to Ecology");
  await page.waitForTimeout(120);

  await page.emulateMedia({ media: "print" });
  ok("the Word button is hidden when printing",
    !(await page.isVisible("#wordBtn")));
  await page.emulateMedia({ media: "screen" });


  // ---- alignment ticks on a row whose objective is still unwritten ----
  // Ticking the chips is the quicker half of filling a row in, so a row with
  // alignments and no text is easy to arrive at. It used to be dropped from
  // the plan and the export without a word. Module 2 is used here because
  // module 1 already has text from the checks above.
  await page.check(
    "#moduleCards .mod-card:nth-child(2) .obj-row:first-child .align-chip input");
  await page.waitForTimeout(150);
  const mod2Objs = await page.evaluate(() => ({
    objectives: state.modules[1].objectives, firstGoal: state.goals[0].id }));
  ok("a tick on an unwritten objective is stored",
    mod2Objs.objectives.length === 1 && mod2Objs.objectives[0].text === "" &&
    JSON.stringify(mod2Objs.objectives[0].align) ===
      JSON.stringify([mod2Objs.firstGoal]),
    JSON.stringify(mod2Objs));
  await page.click("#generateBtn");
  await page.waitForTimeout(200);
  const gapPlan = await page.$eval("#plan", n => n.innerText);
  const mod2Block = gapPlan.split(/\n(?=Module )/)
    .filter(s => /^Module 2\b/.test(s))[0] || "";
  ok("the plan keeps the row and marks the missing objective",
    /Objectives: \(objective not written yet\) \[aligns with CO1\]/.test(mod2Block),
    JSON.stringify(mod2Block));
  ok("a module with an alignment is no longer called unplanned",
    !/\(not planned yet\)/.test(mod2Block), JSON.stringify(mod2Block));
  const gapDocx = await page.evaluate(() =>
    docxParts().filter(p => p.name === "word/document.xml")[0].text);
  ok("the Word export keeps it too",
    gapDocx.indexOf("(objective not written yet) [aligns with CO1]") !== -1);
  ok("a row with neither text nor alignment is still left out",
    (await page.evaluate(() => moduleObjectiveList(
      { objectives: [{ text: "", align: [] }] }, numberedGoals()).length)) === 0);
  ok("an alignment left pointing at a deleted course objective does not revive a row",
    (await page.evaluate(() => moduleObjectiveList(
      { objectives: [{ text: "", align: [9999] }] }, numberedGoals()).length)) === 0);
  // put module 2 back as it was, so the checks below see the original fixture
  await page.uncheck(
    "#moduleCards .mod-card:nth-child(2) .obj-row:first-child .align-chip input");
  await page.click("#generateBtn");
  await page.waitForTimeout(200);

  // print output is not blank
  const pdf = await page.pdf({ format: "Letter" });
  ok("print PDF is non-trivial in size", pdf.length > 8000, "bytes=" + pdf.length);
  await page.emulateMedia({ media: "print" });
  const printVisible = await page.evaluate(() => {
    const vis = el => getComputedStyle(el).display !== "none";
    return { plan: vis(document.getElementById("planWrap")), main: vis(document.querySelector("main")) };
  });
  ok("print CSS keeps <main> visible", printVisible.main);
  ok("print CSS keeps the plan visible", printVisible.plan);
  await page.emulateMedia({ media: "screen" });

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
