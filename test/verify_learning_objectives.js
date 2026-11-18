/*
 * Verification harness for learning_objectives.html (Learning Objective
 * Builder).
 *
 * New on November 11, 2026, with the "i" icons and guidance tooltips on
 * the blanks. Covers: the icon after each blank's label, the tooltip text
 * reaching screen readers through aria-describedby (and not twice), no
 * native title left behind, when the tip shows (only while the pointer is
 * on the words and icon under a blank, or on the tip) and when it does not
 * (on the blank, on focus, after clicking into the blank, after Escape),
 * placement inside the window, touch, and the generated objective still
 * reading the same. Rewritten November 18, 2026, when the tip stopped
 * showing on the blank and on focus. "Layout by width" (also November 18)
 * covers the one-part-per-row layout under 640px and blanks never pushing
 * the page sideways.
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
  ok("pointing at the blank does not show its tip", !(await tipShown(0)));
  await page.hover("#word0 ~ .hint .hint-text");
  ok("pointing at the label shows its tip", await tipShown(0));
  ok("…and only that tip", !(await tipShown(1)) && !(await tipShown(2)) && !(await tipShown(3)));
  const lab = await page.$eval("#word0 ~ .hint .hint-text", e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
  const icon = await page.$eval("#word0 ~ .hint .info-icon", e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await park();
  await page.mouse.move(icon.x, icon.y);
  ok("pointing at the icon shows the tip", await tipShown(0));
  const hintRow = await page.$eval("#word0 ~ .hint", e => e.getBoundingClientRect());
  await park();
  await page.mouse.move(hintRow.left + 3, (lab.top + lab.bottom) / 2);
  ok("the empty part of the label row does not", lab.left > hintRow.left + 6 ? !(await tipShown(0)) : true);

  await page.mouse.move(lab.x, (lab.top + lab.bottom) / 2);
  const tipBox = await page.$eval("#tip0", t => t.getBoundingClientRect());
  const form = await page.$eval("#storyForm", e => e.getBoundingClientRect());
  ok("tip sits under its label, inside the sentence box", tipBox.left <= lab.left && tipBox.right >= lab.right && tipBox.left >= form.left && tipBox.right <= form.right, JSON.stringify([tipBox.left, tipBox.right, lab.left, lab.right, form.left]));
  await page.mouse.move(lab.x, tipBox.top + tipBox.height / 2, { steps: 12 });
  ok("moving straight down onto the tip keeps it open", await tipShown(0));
  await page.keyboard.press("Escape");
  ok("Escape hides it with the pointer still there", !(await tipShown(0)));
  await page.mouse.move(lab.x, (lab.top + lab.bottom) / 2);
  ok("it comes back on the label once the pointer moves", await tipShown(0));
  await park();
  ok("moving away hides it", !(await tipShown(0)));

  await page.click("#word1");
  ok("clicking into a blank shows no tip", !(await anyTipShown()));
  await page.keyboard.type("students");
  ok("typing in it shows no tip", !(await anyTipShown()));
  await park();
  await page.keyboard.press("Tab");
  ok("Tab into an empty blank shows its tip", (await page.evaluate(() => document.activeElement.id)) === "word2" && await tipShown(2));
  ok("…and only that tip", !(await tipShown(0)) && !(await tipShown(1)) && !(await tipShown(3)));
  await page.keyboard.press("Escape");
  ok("Escape hides it", !(await tipShown(2)));
  await page.keyboard.press("Tab");
  ok("Tab on to the next empty blank shows that one, even after Escape", await tipShown(3) && !(await tipShown(2)));
  await page.keyboard.type("with 90% accuracy");
  ok("typing closes it", !(await anyTipShown()));
  await page.keyboard.press("Shift+Tab");
  ok("Shift+Tab back into an empty blank shows its tip", await tipShown(2));
  await page.keyboard.press("Shift+Tab");
  ok("Shift+Tab into a filled blank shows none", !(await anyTipShown()));
  await page.fill("#word3", "");
  await page.click("#word3");
  ok("clicking into an empty blank still shows no tip", !(await anyTipShown()));
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  ok("…but Tab back into it does", await tipShown(3));
  await page.keyboard.press("Tab");
  ok("leaving the blank closes it", !(await tipShown(3)));

  await park();
  await page.click("#word2 ~ .hint .hint-text");
  ok("clicking the label puts the cursor in its blank", (await page.evaluate(() => document.activeElement.id)) === "word2");
  await page.hover("#word2");
  ok("…and the tip goes once the pointer is on the blank", !(await tipShown(2)));
  await page.keyboard.type("label all fifty states");
  ok("typing shows no tip", !(await anyTipShown()));

  console.log("\nTarget size");
  {
    const pg = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await pg.goto(PAGE);
    const show = n => pg.$eval("#tip" + n, t => getComputedStyle(t).display !== "none");
    for (let i = 0; i < 4; i++) {
      const g = await pg.evaluate(n => {
        const t = document.querySelector(`#word${n} ~ .hint .hint-text`).getBoundingClientRect();
        const icon = document.querySelector(`#word${n} ~ .hint .info-icon`).getBoundingClientRect();
        const inp = document.getElementById("word" + n).getBoundingClientRect();
        return { h: t.height, top: t.top, bottom: t.bottom, left: t.left, right: t.right,
          iconBottom: icon.bottom, iconRight: icon.right, inpBottom: inp.bottom, mid: (t.left + t.right) / 2 };
      }, i);
      ok(`${LABELS[i]}: pointing area at least 24px tall`, g.h >= 24, g.h);
      ok(`${LABELS[i]}: pointing area does not reach up into the blank`, g.top >= g.inpBottom - 0.5, JSON.stringify([g.top, g.inpBottom]));
      await pg.mouse.move(5, 5);
      await pg.mouse.move(g.mid, g.iconBottom + 6);
      ok(`${LABELS[i]}: 6px below the label still shows the tip`, await show(i));
      await pg.mouse.move(5, 5);
      await pg.mouse.move(g.iconRight + 6, g.iconBottom - 4);
      ok(`${LABELS[i]}: 6px right of the icon still shows the tip`, await show(i));
      await pg.mouse.move(5, 5);
      await pg.mouse.move(g.mid, g.inpBottom - 3);
      ok(`${LABELS[i]}: the blank's bottom edge still shows nothing`, !(await show(i)));
    }
    const shift = await pg.evaluate(() => [...document.querySelectorAll(".hint-text")].map(t => {
      const r = t.getBoundingClientRect(), cs = getComputedStyle(t);
      return Math.round(r.top + parseFloat(cs.paddingTop));
    }));
    const inputs = await pg.$$eval("#storyForm input", is => is.map(i => Math.round(i.getBoundingClientRect().bottom)));
    ok("label text still sits 2-4px under its blank", shift.every((y, k) => y - inputs[k] >= 1 && y - inputs[k] <= 5), JSON.stringify([shift, inputs]));
    await pg.close();
  }

  console.log("\nPlacement");
  for (const vw of [1280, 390]) {
    const pg = await browser.newPage({ viewport: { width: vw, height: 900 } });
    await pg.goto(PAGE);
    for (let i = 0; i < 4; i++) {
      await pg.hover(`#word${i} ~ .hint .hint-text`);
      const r = await pg.$eval("#tip" + i, t => { const b = t.getBoundingClientRect(); return { shown: getComputedStyle(t).display !== "none", l: b.left, r: b.right, w: document.documentElement.clientWidth }; });
      ok(`${LABELS[i]}: tip shown and inside the window at ${vw}px`, r.shown && r.l >= 0 && r.r <= r.w, JSON.stringify(r));
    }
    await pg.fill("#word0", "Given a blank map of the United States of America and a list of capitals");
    await pg.dispatchEvent("#word0", "input");
    await pg.mouse.move(1, 1);
    const swBefore = await pg.evaluate(() => document.documentElement.scrollWidth);
    await pg.hover("#word0 ~ .hint .hint-text");
    const r = await pg.$eval("#tip0", t => { const b = t.getBoundingClientRect(); return { l: b.left, r: b.right, w: document.documentElement.clientWidth }; });
    ok(`condition: tip still inside the window after the blank grows (${vw}px)`, r.l >= 0 && r.r <= r.w, JSON.stringify(r));
    // A long condition already widens the page at 390px (the blank grows
    // with its text; that predates the tips). The check is that an open
    // tip adds nothing to it.
    const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
    ok(`an open tip adds no horizontal scroll at ${vw}px`, sw <= Math.max(vw, swBefore), sw + " vs " + swBefore);
    await pg.close();
  }

  console.log("\nGenerated objective");
  await page.fill("#word0", "Given a blank map of the US");
  await page.click("#generateBtn");
  const story = await page.$eval("#storyText", e => e.innerText.replace(/\s+/g, " "));
  ok("objective text unchanged by the tips", story.includes("Given a blank map of the US") && story.includes("students") && story.includes("label all fifty states") && !/circumstances/.test(story), story);
  ok("result has no info icons", (await page.$$("#story .info-icon")).length === 0);
  const sizes = await page.evaluate(() => {
    document.getElementById("guide").open = true;
    const px = sel => [...document.querySelectorAll(sel)].map(e => getComputedStyle(e).fontSize);
    return { hint: px(".blank-wrap .hint"), ex: px(".guide .ex-label"), out: px("#story .blank-label") };
  });
  ok("labels are 13px under the blanks, in the guide example and in the result",
    sizes.hint.length === 4 && sizes.ex.length === 4 && sizes.out.length >= 3 &&
    [...sizes.hint, ...sizes.ex, ...sizes.out].every(v => v === "13px"), JSON.stringify(sizes));

  console.log("\nPhone (touch, 390px)");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const phone = await ctx.newPage();
  await phone.goto(PAGE);
  const pShown = n => phone.$eval("#tip" + n, t => getComputedStyle(t).display !== "none");
  const pAny = () => phone.$$eval(".blank-tip", ts => ts.some(t => getComputedStyle(t).display !== "none"));
  await phone.tap("#word1");
  ok("tapping into a blank shows no tip", !(await pAny()));
  await phone.tap("#word1 ~ .hint .hint-text");
  ok("tapping the label shows its tip", await pShown(1));
  await phone.tap("#word1");
  ok("tapping into the blank hides it", !(await pAny()));
  await phone.tap("#word3 ~ .hint .hint-text");
  ok("tapping another label shows that tip", await pShown(3));
  await phone.tap("h1");
  ok("tapping elsewhere hides it", !(await pAny()));

  console.log("\nLayout by width");
  const LONG = "Given a blank map of the United States of America and a printed list of all fifty state capitals";
  for (const vw of [1280, 640, 639, 600, 574, 400, 320, 280]) {
    const pg = await browser.newPage({ viewport: { width: vw, height: 900 } });
    await pg.goto(PAGE);
    const segs = await pg.$$eval("#storyForm .seg", ss => ss.map(s => ({
      text: s.textContent.replace(/\s+/g, " ").trim(),
      top: Math.round(s.querySelector("input").getBoundingClientRect().top),
      seg: s.getBoundingClientRect().width,
      input: s.querySelector("input").getBoundingClientRect().width,
    })));
    if (vw === 1280) {
      ok("four segments, one per blank", segs.length === 4, segs.length);
      ok("comma stays with condition", segs[0] && /^condition.*,$/.test(segs[0].text), segs[0] && segs[0].text);
      ok("\"will\" rides with behavior", segs[2] && /^will /.test(segs[2].text), segs[2] && segs[2].text);
      ok("period stays with degree", segs[3] && /\.$/.test(segs[3].text), segs[3] && segs[3].text);
    }
    const rows = new Set(segs.map(x => x.top)).size;
    if (vw >= 640) {
      ok(`${vw}px: sentence flows inline (condition and audience share a row)`, segs[0].top === segs[1].top, JSON.stringify(segs.map(x => x.top)));
    } else {
      ok(`${vw}px: each part on its own row`, rows === 4, JSON.stringify(segs.map(x => x.top)));
      ok(`${vw}px: rows in sentence order`, segs.every((x, i) => i === 0 || x.top > segs[i - 1].top));
      ok(`${vw}px: every blank fills its row`,
        [0, 1, 2, 3].every(i => segs[i].input >= segs[i].seg - 30), JSON.stringify(segs.map(x => [x.seg, x.input])));
      const will = await pg.$eval("#storyForm .seg-word", w => {
        const r = w.getBoundingClientRect(), i = w.parentElement.querySelector("input").getBoundingClientRect();
        return { text: w.textContent, bottom: r.bottom, inputTop: i.top };
      });
      ok(`${vw}px: "will" sits on its own row above the behavior blank`, will.text === "will" && will.bottom <= will.inputTop + 1, JSON.stringify(will));
      const widths = [0, 1, 2, 3].map(i => segs[i].input);
      const punct = await pg.$$eval("#storyForm .seg-punct", ps => ps.map(p => {
        const r = p.getBoundingClientRect(), i = p.parentElement.querySelector("input").getBoundingClientRect();
        return { mark: p.textContent, onRow: r.top < i.bottom && r.bottom > i.top, after: r.left >= i.right - 1 };
      }));
      ok(`${vw}px: comma and period stay on their blank's row, after it`,
        punct.length === 2 && punct.every(x => x.onRow && x.after), JSON.stringify(punct));
      ok(`${vw}px: all four blanks are the same width`,
        Math.max(...widths) - Math.min(...widths) < 1, JSON.stringify(widths));
      const centre = await pg.evaluate(() => {
        const f = document.getElementById("storyForm"), cs = getComputedStyle(f), r = f.getBoundingClientRect();
        const mid = r.left + f.clientLeft + parseFloat(cs.paddingLeft) +
          (f.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / 2;
        const off = el => { const b = el.getBoundingClientRect(); return Math.abs(b.left + b.width / 2 - mid); };
        const w = document.querySelector("#storyForm .seg-word");
        const range = document.createRange(); range.selectNodeContents(w);
        const t = range.getBoundingClientRect();
        return {
          blanks: [...f.querySelectorAll(".seg input")].map(off),
          labels: [...f.querySelectorAll(".seg .hint-text")].map(off),
          will: Math.abs(t.left + t.width / 2 - mid),
        };
      });
      ok(`${vw}px: blanks, labels and "will" centred in the box`,
        [...centre.blanks, ...centre.labels, centre.will].every(d => d < 1.5), JSON.stringify(centre));
      const lefts = await pg.$$eval("#storyForm .seg input", is => is.map(i => Math.round(i.getBoundingClientRect().left)));
      ok(`${vw}px: and start at the same left edge`, new Set(lefts).size === 1, JSON.stringify(lefts));
    }
    await pg.fill("#word0", LONG);
    await pg.dispatchEvent("#word0", "input");
    const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
    ok(`${vw}px: a long condition does not widen the page`, sw <= vw, sw);
    const fit = await pg.evaluate(() => {
      const f = document.getElementById("storyForm").getBoundingClientRect();
      const i = document.getElementById("word0").getBoundingClientRect();
      return i.right <= f.right + 0.5 && i.left >= f.left - 0.5;
    });
    ok(`${vw}px: the long condition's blank stays inside the sentence box`, fit);
    await pg.close();
  }

  console.log("\nPage");
  ok("no page errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log("\n" + "=".repeat(60));
  console.log(`PASS ${pass}   FAIL ${fail}   (${pass + fail} checks)`);
  console.log("=".repeat(60));
  process.exit(fail ? 1 : 0);
})();
