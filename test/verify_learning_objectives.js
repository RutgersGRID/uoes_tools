/*
 * Verification harness for learning_objectives.html (Learning Objective
 * Builder).
 *
 * New on November 11, 2026, with the "i" icons and guidance tooltips on
 * the blanks. Covers: the icon after each blank's label, the tooltip text
 * reaching screen readers through aria-describedby (and not twice), no
 * native title left behind, when the tip shows (hover, keyboard focus on
 * an empty blank, a tap or click on the label) and when it hides (typing,
 * Escape, moving away), the tip staying inside a 390px window, and the
 * generated objective still reading the same.
 *
 *   node test/verify_learning_objectives.js
 */
const path = require("path");
const { chromium } = require("playwright-core");
const { chromePath } = require("./_chrome");

const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.join(ROOT, "learning_objectives.html");

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail !== undefined ? "  [" + detail + "]" : "")); }
}

const LABELS = ["condition", "audience", "behavior", "degree (optional)"];

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(PAGE);

  const tipShown = n => page.$eval("#tip" + n, t => getComputedStyle(t).display !== "none");
  const anyTipShown = () => page.$$eval(".blank-tip", ts => ts.some(t => getComputedStyle(t).display !== "none"));
  const park = () => page.mouse.move(5, 5);

  console.log("\nMarkup");
  const blanks = await page.$$eval(".blank-wrap", ws => ws.map(w => {
    const f = w.querySelector("input, select");
    const tipId = f.getAttribute("aria-describedby");
    const tip = tipId && document.getElementById(tipId);
    const hint = w.querySelector(".hint");
    const icon = hint && hint.querySelector("svg.info-icon");
    return {
      label: f.getAttribute("aria-label"),
      tipId, tipText: tip ? tip.textContent.trim() : "",
      tipHidden: tip ? tip.getAttribute("aria-hidden") : null,
      tipInWrap: !!tip && w.contains(tip),
      hintText: hint ? hint.textContent.trim() : "",
      hintHidden: hint ? hint.getAttribute("aria-hidden") : null,
      icon: !!icon, iconHidden: icon ? icon.getAttribute("aria-hidden") : null,
      title: w.getAttribute("title") || f.getAttribute("title"),
      ariaDescription: f.getAttribute("aria-description"),
    };
  }));
  ok("four blanks", blanks.length === 4, blanks.length);
  blanks.forEach((b, i) => {
    const L = LABELS[i];
    ok(`${L}: label text unchanged`, b.hintText === L, b.hintText);
    ok(`${L}: has an "i" icon`, b.icon);
    ok(`${L}: icon and label are aria-hidden`, b.iconHidden === "true" && b.hintHidden === "true");
    ok(`${L}: aria-describedby points at its tip`, !!b.tipId && b.tipText.length > 20, b.tipId);
    ok(`${L}: tip sits inside the blank's wrapper (hoverable)`, b.tipInWrap);
    ok(`${L}: tip is aria-hidden (no double reading)`, b.tipHidden === "true");
    ok(`${L}: no native title tooltip`, !b.title);
    ok(`${L}: aria-description replaced, not doubled`, b.ariaDescription === null);
  });
  ok("degree tip still starts \"Optional:\"", blanks[3] && blanks[3].tipText.startsWith("Optional:"));
  ok("no tip mentions \"opener\"", blanks.every(b => !/opener/i.test(b.tipText)));
  ok("no tip says \"hover\"", blanks.every(b => !/hover/i.test(b.tipText)));

  console.log("\nScreen reader description");
  const cdp = await page.context().newCDPSession(page);
  for (let i = 0; i < 4; i++) {
    const { result } = await cdp.send("Runtime.evaluate", { expression: `document.getElementById("word${i}")` });
    const { node } = await cdp.send("DOM.describeNode", { objectId: result.objectId });
    const { nodes } = await cdp.send("Accessibility.getPartialAXTree", {
      backendNodeId: node.backendNodeId, fetchRelatives: false,
    });
    const ax = nodes[0];
    const desc = ax.description ? ax.description.value : "";
    ok(`${LABELS[i]}: name is the label`, ax.name && ax.name.value === LABELS[i], ax.name && ax.name.value);
    ok(`${LABELS[i]}: description is the guidance`, desc === blanks[i].tipText, desc.slice(0, 40));
  }

  console.log("\nShowing and hiding");
  ok("no tip shown on load", !(await anyTipShown()));

  await page.hover("#word0");
  ok("hovering a blank shows its tip", await tipShown(0));
  ok("…and only that tip", !(await tipShown(1)) && !(await tipShown(2)));
  const box = await page.$eval("#tip0", t => { const r = t.getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; });
  await page.mouse.move(box.x, box.y, { steps: 8 });
  ok("moving the pointer onto the tip keeps it open", await tipShown(0));
  await page.keyboard.press("Escape");
  ok("Escape hides it with the pointer still there", !(await tipShown(0)));
  await page.hover("#word0");
  ok("it comes back once the pointer moves over the blank again", await tipShown(0));
  await park();
  ok("moving away hides it", !(await tipShown(0)));

  await page.focus("#generateBtn");
  await page.keyboard.press("Shift+Tab"); // into the last blank
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  ok("Tab into an empty blank shows its tip", (await page.evaluate(() => document.activeElement.id)) === "word0" && await tipShown(0));
  await page.keyboard.type("Given a map");
  ok("typing closes it", !(await tipShown(0)));
  await page.keyboard.press("Tab");
  ok("next empty blank shows its tip", await tipShown(1));
  ok("the previous one stays closed", !(await tipShown(0)));
  await page.keyboard.press("Escape");
  ok("Escape hides a focus-opened tip", !(await tipShown(1)));
  await page.keyboard.press("Shift+Tab");
  ok("a filled blank does not reopen on focus", !(await tipShown(0)));

  await park();
  await page.click("#word0 ~ .hint");
  ok("clicking the label opens the tip on a filled blank", await tipShown(0));
  ok("…and puts the cursor in the blank", (await page.evaluate(() => document.activeElement.id)) === "word0");
  await park();
  ok("a clicked-open tip stays after the pointer leaves", await tipShown(0));
  await page.keyboard.press("End");
  await page.keyboard.type(" of the US");
  ok("typing closes a clicked-open tip", !(await tipShown(0)));
  await page.click("#word2 ~ .hint");
  await park();
  await page.click("h1");
  ok("clicking elsewhere closes it", !(await tipShown(2)));

  const clickTarget = await page.$eval("#word1 ~ .hint", h => h.getBoundingClientRect().height);
  ok("label is a usable click target (>= 11px tall)", clickTarget >= 11, clickTarget);

  console.log("\nGenerated objective");
  await page.fill("#word1", "students");
  await page.fill("#word2", "label all fifty states");
  await page.click("#generateBtn");
  const story = await page.$eval("#storyText", e => e.innerText.replace(/\s+/g, " "));
  ok("objective text unchanged by the tips", story.includes("Given a map of the US") && story.includes("label all fifty states") && !/circumstances/.test(story), story);
  ok("result has no info icons", (await page.$$("#story .info-icon")).length === 0);

  console.log("\nPhone (touch, 390px)");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const phone = await ctx.newPage();
  await phone.goto(PAGE);
  const pShown = n => phone.$eval("#tip" + n, t => getComputedStyle(t).display !== "none");
  for (let i = 0; i < 4; i++) {
    await phone.tap(`#word${i} ~ .hint`);
    ok(`${LABELS[i]}: tapping the label opens the tip`, await pShown(i));
    const r = await phone.$eval("#tip" + i, t => { const b = t.getBoundingClientRect(); return { l: b.left, r: b.right, w: document.documentElement.clientWidth }; });
    ok(`${LABELS[i]}: tip inside the window`, r.l >= 0 && r.r <= r.w, JSON.stringify(r));
    await phone.tap("#tip" + i);
    ok(`${LABELS[i]}: tapping the tip closes it`, !(await pShown(i)));
  }
  await phone.tap("#word1");
  ok("tapping an empty blank shows its tip", await pShown(1));
  await phone.keyboard.type("students");
  ok("typing closes it", !(await pShown(1)));
  await phone.tap("h1");
  ok("tapping elsewhere leaves no tip open", !(await phone.$$eval(".blank-tip", ts => ts.some(t => getComputedStyle(t).display !== "none"))));
  const scrollW = await phone.evaluate(() => document.documentElement.scrollWidth);
  ok("no horizontal scroll at 390px", scrollW <= 390, scrollW);

  console.log("\nPage");
  ok("no page errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log("\n" + "=".repeat(60));
  console.log(`PASS ${pass}   FAIL ${fail}   (${pass + fail} checks)`);
  console.log("=".repeat(60));
  process.exit(fail ? 1 : 0);
})();
