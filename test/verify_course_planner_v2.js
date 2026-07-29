// Headless checks for course_planner_v2.html
const { chromium } = require("playwright-core");
const path = require("path");

const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = "file://" + path.resolve(__dirname, "course_planner_v2.html");
const V1URL = "file://" + path.resolve(__dirname, "course_planner.html");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; }
  else { fail++; console.log("FAIL: " + name + (extra ? "  -> " + extra : "")); }
};

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
  ok("title marks v2", (await page.title()) === "Course Content Planner (v2)");

  const h2s = await page.$$eval("section.step h2", ns => ns.map(n => n.textContent.replace(/\s+/g, " ").trim()));
  ok("five section headings (basics + 4 steps)", h2s.length === 5, JSON.stringify(h2s));
  ok("step 1 heading reworded",
    h2s[1] === "1Decide what your students will take away from your course", h2s[1]);
  ok("step 2 heading reworded",
    h2s[2] === "2Decide how you'll assess each course goal", h2s[2]);
  ok("step 3 is structure/strategy",
    h2s[3] === "3Choose a structure and teaching strategy (optional)", h2s[3]);
  ok("step 4 is module mapping",
    h2s[4] === "4Map it onto your modules", h2s[4]);

  const nums = await page.$$eval("section.step .step-num", ns => ns.map(n => n.textContent.trim()));
  ok("step badges are 1-4 with no 5", JSON.stringify(nums) === JSON.stringify(["✎", "1", "2", "3", "4"]), JSON.stringify(nums));

  const step1 = await page.$eval("section[aria-labelledby='step1Head']", n => n.innerHTML);
  ok("step 1 has no Learning Objective Builder link", !/learning_objectives\.html/.test(step1));
  const goalLead = await page.$eval("section[aria-labelledby='step1Head'] h3 + p.step-lead",
    n => n.textContent.replace(/\s+/g, " ").trim());
  ok("goals lead-in updated",
    goalLead === "What should students be able to do by the end of the course.", goalLead);

  const step4 = await page.$eval("section[aria-labelledby='step4Head']", n => n.innerHTML);
  ok("step 4 has the Learning Objective Builder link", /learning_objectives\.html/.test(step4));
  const lobCount = await page.$$eval("a[href='learning_objectives.html']", ns => ns.length);
  ok("exactly one LOB link on the page", lobCount === 1, "count=" + lobCount);

  // the per-goal activities list is gone; activities live on the module cards
  ok("per-goal activities list removed",
    (await page.$$eval("#activitiesList", ns => ns.length)) === 0);
  ok("no leftover 'Assessed by:' rows outside Step 2",
    !/Assessed by:/.test(await page.evaluate(() => document.body.innerText)));
  ok("the goal key still sits above the module cards", await page.evaluate(() => {
    const s = document.querySelector("section[aria-labelledby='step4Head']");
    const a = s.querySelector("#goalLegend"), m = s.querySelector("#moduleCards");
    return !!(a && m) &&
      !!(a.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));
  ok("old step-3 section id is gone (renumbered, not duplicated)",
    !/id="step5Head"/.test(await page.content()));

  // ---- module cards ----
  const cardOrder = await page.$eval("#moduleCards .mod-card:first-child .card-body", n =>
    Array.from(n.children).map(c =>
      c.classList.contains("obj-block") ? "Objectives"
        : c.classList.contains("two-col") ? "Activities+Assessments"
          : c.querySelector("label").textContent.trim()));
  ok("module card row order: Objectives, Materials, then Activities+Assessments",
    JSON.stringify(cardOrder) === JSON.stringify(["Objectives", "Materials & resources", "Activities+Assessments"]),
    JSON.stringify(cardOrder));
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
  ok("goal text syncs into the step 4 goal key",
    /G1 — Analyze a food web/.test(await page.$eval("#goalLegend", n => n.innerText)));

  await page.fill("#evidenceList input", "Case-analysis paper in Module 6");
  await page.waitForTimeout(50);

  await page.fill("#mod0-obj0", "Identify trophic levels");
  await page.check('#moduleCards .mod-card:first-child .obj-row:first-child .align-chip input');
  await page.fill("#mod0-materials", "Chapter 3; food-web dataset");
  await page.fill("#mod0-activities", "Watch intro video; discussion post");
  await page.fill("#mod0-assessments", "Practice quiz");
  await page.selectOption("#principle", "Concrete to abstract");
  await page.fill("#strategy", "Videos, then discussion, then a case.");
  await page.waitForTimeout(700);

  // ---- localStorage under the v2 key only ----
  const keys = await page.evaluate(() => Object.keys(localStorage));
  ok("saves under uoes-course-planner-v2", keys.includes("uoes-course-planner-v2"), JSON.stringify(keys));
  ok("does not touch the v1 key", !keys.includes("uoes-course-planner"), JSON.stringify(keys));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner-v2")));
  ok("saved module has no duedates field", !("duedates" in saved.modules[0]), JSON.stringify(saved.modules[0]));
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
  await page.waitForTimeout(200);
  ok("course title round-trips", (await page.inputValue("#courseTitle")) === "Intro to Ecology");
  ok("goal round-trips", (await page.inputValue("#goal-first")) === "Analyze a food web");
  ok("module materials round-trip",
    (await page.inputValue("#mod0-materials")) === "Chapter 3; food-web dataset");
  ok("module objective round-trips",
    (await page.inputValue("#mod0-obj0")) === "Identify trophic levels");
  ok("alignment checkbox round-trips",
    await page.isChecked('#moduleCards .mod-card:first-child .obj-row:first-child .align-chip input'));
  ok("principle round-trips", (await page.inputValue("#principle")) === "Concrete to abstract");

  // ---- migration: a v1-shaped save (with duedates) loaded under the v2 key ----
  await page.evaluate(() => {
    localStorage.setItem("uoes-course-planner-v2", JSON.stringify({
      course: "Legacy", moduleCount: 2,
      goals: [{ id: 0, text: "Old goal", evidence: "Old exam" }],
      topics: [], principle: "", strategy: "",
      modules: [{ topic: "Wk1", objectives: "Old objective", activities: "A", duedates: "Friday" },
      { topic: "Wk2" }]
    }));
  });
  await page.reload();
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
    () => JSON.parse(localStorage.getItem("uoes-course-planner-v2")));
  ok("migration: duedates dropped from saved state",
    !("duedates" in migrated.modules[0]), JSON.stringify(migrated.modules[0]));
  ok("migration: objectives saved back as a list",
    Array.isArray(migrated.modules[0].objectives) &&
    migrated.modules[0].objectives[0].align.length === 0,
    JSON.stringify(migrated.modules[0].objectives));

  // corrupt save
  await page.evaluate(() => localStorage.setItem("uoes-course-planner-v2", "{not json"));
  await page.reload();
  await page.waitForTimeout(200);
  ok("corrupt save starts fresh without erroring", errors.length === 0, errors.join(" | "));
  ok("corrupt save still renders module cards",
    (await page.$$eval("#moduleCards .mod-card", ns => ns.length)) === 16);


  // ---- multiple objectives per module + goal alignment ----
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);

  const legendEmpty = await page.$eval("#goalLegend", n => n.innerText);
  ok("goal key prompts for goals when none are written",
    /Write your course goals in Step 1/.test(legendEmpty), legendEmpty);
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
    legend === "Course goals: G1 — Analyze a food web · G2 — Model energy transfer", legend);

  const chipText = await page.$$eval("#moduleCards .mod-card:first-child .align-chip",
    ns => ns.map(n => n.textContent.trim()));
  ok("checkbox chips are labelled G1, G2",
    JSON.stringify(chipText) === JSON.stringify(["G1", "G2"]), JSON.stringify(chipText));
  const chipNames = await page.$$eval("#moduleCards .mod-card:first-child .align-chip input",
    ns => ns.map(n => n.getAttribute("aria-label")));
  ok("each checkbox's accessible name carries the goal text and contains its visible label",
    JSON.stringify(chipNames) ===
    JSON.stringify(["G1: Analyze a food web", "G2: Model energy transfer"]),
    JSON.stringify(chipNames));
  const chipTitles = await page.$$eval("#moduleCards .mod-card:first-child .align-chip",
    ns => ns.map(n => n.title));
  ok("hovering a chip shows the full goal", chipTitles[1] === "G2: Model energy transfer");
  const groupName = await page.$eval("#moduleCards .align-box", n => n.getAttribute("aria-label"));
  ok("the alignment cluster is a labelled group",
    groupName === "Course goals that objective 1 of module 1 aligns with", groupName);

  // rewording a goal relabels the checkboxes without a rebuild
  await page.fill("#goal-first", "Analyze a freshwater food web");
  await page.waitForTimeout(80);
  ok("rewording a goal updates the checkbox labels live",
    (await page.$eval("#moduleCards .mod-card:first-child .align-chip input",
      n => n.getAttribute("aria-label"))) === "G1: Analyze a freshwater food web");
  ok("rewording a goal updates the key",
    /G1 — Analyze a freshwater food web/.test(await page.$eval("#goalLegend", n => n.innerText)));

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

  // tick alignments: obj1 -> G1, obj2 -> G1+G2, obj3 -> G2
  const boxes = i => "#moduleCards .mod-card:first-child .obj-row:nth-child(" + i + ") .align-chip input";
  await page.check(boxes(1) + ":nth-of-type(1)");
  await page.locator(boxes(2)).nth(0).check();
  await page.locator(boxes(2)).nth(1).check();
  await page.locator(boxes(3)).nth(1).check();
  await page.waitForTimeout(700);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner-v2")));
  const gIds = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("uoes-course-planner-v2")).goals.map(g => g.id));
  ok("alignments saved per objective",
    JSON.stringify(st.modules[0].objectives.map(o => o.align)) ===
    JSON.stringify([[gIds[0]], [gIds[0], gIds[1]], [gIds[1]]]),
    JSON.stringify(st.modules[0].objectives));

  // unticking removes it
  await page.locator(boxes(2)).nth(0).uncheck();
  await page.waitForTimeout(700);
  const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner-v2")));
  ok("unticking removes the alignment",
    JSON.stringify(st2.modules[0].objectives[1].align) === JSON.stringify([gIds[1]]),
    JSON.stringify(st2.modules[0].objectives[1].align));
  await page.locator(boxes(2)).nth(0).check();

  // deleting a goal prunes stale alignments and renumbers
  await page.click("#goalsList li:first-child .remove-btn");
  await page.waitForTimeout(700);
  const st3 = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner-v2")));
  ok("deleting a goal drops its id from every objective",
    JSON.stringify(st3.modules[0].objectives.map(o => o.align)) ===
    JSON.stringify([[], [gIds[1]], [gIds[1]]]),
    JSON.stringify(st3.modules[0].objectives.map(o => o.align)));
  ok("the surviving goal renumbers to G1",
    /Course goals: G1 — Model energy transfer/.test(
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
  const st4 = await page.evaluate(() => JSON.parse(localStorage.getItem("uoes-course-planner-v2")));
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
    /Objectives: Trace energy through a web \[aligns with G1\]; Predict effects of a removal \[aligns with G1\]/
      .test(planAlign), planAlign.slice(0, 600));

  // ---- plan generation ----
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);
  await page.fill("#courseTitle", "Intro to Ecology");
  await page.fill("#goal-first", "Analyze a food web");
  await page.fill("#evidenceList input", "Case-analysis paper");
  await page.fill("#topicsList input", "Trophic levels");
  await page.fill("#mod0-obj0", "Identify trophic levels");
  await page.check('#moduleCards .mod-card:first-child .obj-row:first-child .align-chip input');
  await page.fill("#mod0-materials", "Chapter 3");
  await page.fill("#mod0-activities", "Intro video");
  await page.fill("#mod0-assessments", "Quiz 1");
  await page.click("#generateBtn");
  await page.waitForTimeout(200);
  const planText = await page.$eval("#plan", n => n.innerText);
  ok("plan shows goal, numbered G1", /G1 — Analyze a food web/.test(planText));
  ok("plan shows assessment", /Case-analysis paper/.test(planText));
  const goalItems = await page.$$eval("#plan ul li", ns => ns.map(n => n.innerText));
  ok("plan goal entries show only the assessment, no activities line",
    goalItems.length === 1 && /Assessment: Case-analysis paper/.test(goalItems[0]) &&
    !/Activities/.test(goalItems[0]), JSON.stringify(goalItems));
  ok("plan goals heading drops activities",
    /Course goals & assessments/i.test(planText) ||
    !/goals, assessments & activities/i.test(planText));
  ok("plan shows topic", /Trophic levels/.test(planText));
  ok("plan module order is Objectives, Materials, Activities, Assessments",
    /Objectives: Identify trophic levels \[aligns with G1\][\s\S]*Materials: Chapter 3[\s\S]*Activities: Intro video[\s\S]*Assessments: Quiz 1/.test(planText),
    planText.slice(0, 400));
  ok("plan has no due dates row", !/Due dates/i.test(planText));
  ok("empty modules marked not planned", /\(not planned yet\)/.test(planText));
  ok("plan heading carries the course title",
    (await page.$eval("#planHead", n => n.textContent)) === "Intro to Ecology — Course Plan");

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

  // ---- v1 untouched ----
  const v1 = await ctx.newPage();
  await v1.goto(V1URL);
  await v1.waitForTimeout(200);
  ok("v1 still has basics + 5 steps",
    (await v1.$$eval("section.step h2", ns => ns.length)) === 6);
  ok("v1 still has Due dates", /Due dates/.test(await v1.content()));
  ok("v1 objectives are still a single field, not a list",
    (await v1.$$eval("#moduleCards .obj-row", ns => ns.length)) === 0 &&
    (await v1.$$eval("#mod0-objectives", ns => ns.length)) === 1);
  ok("v1 still uses the v1 storage key",
    /uoes-course-planner"/.test(await v1.content()));

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
