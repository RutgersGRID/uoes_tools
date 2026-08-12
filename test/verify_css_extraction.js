/*
 * verify_css_extraction.js
 *
 * Guards the move from inline <style> blocks to the shared stylesheets in
 * css/. It checks that every converted page links the right sheets in the
 * right order, that the design tokens and the focus convention actually
 * resolve on each page, that the frozen v1 pages were left alone, and that
 * no page-level stylesheet has drifted back to hardcoded brand hex codes.
 *
 * Needs: npm install playwright-core
 * Run:   node test/verify_css_extraction.js
 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const ROOT = path.resolve(__dirname, "..");

// Pages converted to external CSS, with the sheets each must link in order.
const CONVERTED = {
  "index.html": ["css/base.css", "css/index.css"],
  "learning_objectives.html": ["css/base.css", "css/document.css", "css/learning_objectives.css"],
  "blooms_verbs.html": ["css/base.css", "css/document.css", "css/blooms_verbs.css"],
  "course_planner.html": ["css/base.css", "css/document.css", "css/course_planner.css"],
  "credit_hour_planner.html": ["css/base.css", "css/calculator.css", "css/credit_hour_planner.css"],
  "workload_estimator.html": ["css/base.css", "css/calculator.css", "css/workload_estimator.css"],
};

// Frozen field-testing baselines: these must keep their inline CSS so they
// render exactly as the designers saw them, whatever css/ later becomes.
const FROZEN = ["learning_objectives_v1.html", "course_planner_v1.html"];

// The tokens every page must resolve, and the values they must resolve to.
const TOKENS = {
  "--red": "#CC0033",
  "--red-dark": "#A30029",
  "--blue": "#007FAC",
  "--blue-light": "#DEF0F9",
  "--blue-mid": "#7DBFD6",
  "--bg": "#f4f7f9",
  "--text": "#333",
  "--muted": "#666",
};

// Which page hides what when printing.
const PRINT_TARGET = {
  "course_planner.html": "main > :not(#planWrap)",
  "credit_hour_planner.html": "main > :not(#reportWrap)",
  "workload_estimator.html": "main > :not(#reportWrap)",
};

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; }
  else { fail++; console.log("FAIL " + label + (detail ? "  [" + detail + "]" : "")); }
};

(async () => {
  // --allow-file-access-from-files so cssRules is readable for file:// sheets.
  const browser = await chromium.launch({
    executablePath: EXEC,
    args: ["--allow-file-access-from-files"],
  });

  /* ===== 1. Converted pages: links, tokens, focus, print ===== */
  for (const [file, sheets] of Object.entries(CONVERTED)) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("file://" + path.join(ROOT, file));
    await page.waitForTimeout(150);

    const info = await page.evaluate(() => ({
      inlineStyles: document.querySelectorAll("style").length,
      links: Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((l) => l.getAttribute("href")),
      // A sheet that 404s or fails to parse yields zero rules.
      ruleCounts: Array.from(document.styleSheets).map((s) => {
        try { return s.cssRules.length; } catch (e) { return -1; }
      }),
    }));

    ok(file + ": no inline <style> block left", info.inlineStyles === 0,
      "n " + info.inlineStyles);
    ok(file + ": links the expected sheets in order",
      JSON.stringify(info.links) === JSON.stringify(sheets),
      info.links.join(" "));
    ok(file + ": base.css is linked first", info.links[0] === "css/base.css",
      String(info.links[0]));
    ok(file + ": every linked sheet loaded and parsed",
      info.ruleCounts.length === sheets.length &&
      info.ruleCounts.every((n) => n > 0),
      info.ruleCounts.join(","));
    ok(file + ": no page errors", errors.length === 0, errors.join(" | "));

    const tokens = await page.evaluate((names) => {
      const cs = getComputedStyle(document.documentElement);
      const out = {};
      names.forEach((n) => { out[n] = cs.getPropertyValue(n).trim(); });
      return out;
    }, Object.keys(TOKENS));
    for (const [name, want] of Object.entries(TOKENS)) {
      ok(file + ": token " + name + " resolves", tokens[name] === want,
        tokens[name]);
    }

    // The design system promises a visible focus style on EVERY interactive
    // element. Focus each one and read the resolved outline.
    const focus = await page.evaluate(() => {
      // Open every guidance panel first, so controls inside them (the
      // citation link in the Bloom's panel, for one) are really focusable
      // and get checked rather than skipped.
      document.querySelectorAll("details").forEach((d) => { d.open = true; });
      const els = document.querySelectorAll(
        "input, select, textarea, button, summary, a[href], [tabindex]"
      );
      const bad = [];
      let n = 0;
      els.forEach((el) => {
        // Controls inside a hidden region (the generated plan, the copy
        // button in a collapsed output) cannot take focus, so :focus never
        // matches and there is nothing to assert about them here.
        if (el.getClientRects().length === 0) return;
        n++;
        el.focus();
        const cs = getComputedStyle(el);
        if (cs.outlineWidth !== "2px" ||
            cs.outlineStyle !== "solid" ||
            cs.outlineColor !== "rgb(0, 127, 172)" ||
            cs.outlineOffset !== "2px") {
          bad.push(
            (el.id || el.tagName) + " -> " +
            cs.outlineWidth + " " + cs.outlineStyle + " " + cs.outlineColor
          );
        }
      });
      return { count: n, bad };
    });
    ok(file + ": has focusable controls to check", focus.count > 0,
      "n " + focus.count);
    ok(file + ": every control has the 2px Rutgers Blue focus outline",
      focus.bad.length === 0, focus.bad.slice(0, 3).join(" | "));

    // .sr-only must stay a 1x1 clipped box, not merely off-screen.
    const sr = await page.evaluate(() => {
      const el = document.querySelector(".sr-only");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        pos: cs.position, w: cs.width, h: cs.height,
        clip: cs.clip, ws: cs.whiteSpace,
      };
    });
    if (sr) {
      ok(file + ": .sr-only is clipped to 1x1",
        sr.pos === "absolute" && sr.w === "1px" && sr.h === "1px" &&
        sr.clip === "rect(0px, 0px, 0px, 0px)",
        JSON.stringify(sr));
    }

    if (PRINT_TARGET[file]) {
      const found = await page.evaluate((sel) =>
        Array.from(document.styleSheets)
          .flatMap((s) => { try { return Array.from(s.cssRules); } catch (e) { return []; } })
          .filter((r) => r.media)
          .some((r) => Array.from(r.cssRules)
            // The selector may be one of a comma-separated group.
            .some((x) => (x.selectorText || "").includes(sel))),
        PRINT_TARGET[file]);
      // Hiding `body > ...` instead would hide <main> itself and print a
      // blank page — that bug has been fixed once already.
      ok(file + ": print CSS hides " + PRINT_TARGET[file], found);
    }

    await page.close();
  }

  /* ===== 2. Frozen pages keep their inline CSS ===== */
  for (const file of FROZEN) {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    ok(file + ": still has its inline <style> block", /<style>/.test(src));
    ok(file + ": links no external stylesheet", !/href="css\//.test(src));

    const page = await browser.newPage();
    await page.goto("file://" + path.join(ROOT, file));
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor);
    ok(file + ": still renders on the page background",
      bg === "rgb(244, 247, 249)", bg);
    await page.close();
  }

  /* ===== 3. Stylesheet hygiene ===== */
  {
    const dir = path.join(ROOT, "css");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".css"));
    ok("css/ holds the expected sheets", files.length === 9, files.join(" "));

    // Brand colours belong in base.css as tokens; nowhere else as raw hex.
    const BRAND = /#(CC0033|A30029|007FAC|DEF0F9|7DBFD6|f4f7f9)/gi;
    for (const f of files) {
      if (f === "base.css") continue;
      const body = fs.readFileSync(path.join(dir, f), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, ""); // comments may mention the hex
      const hits = body.match(BRAND) || [];
      ok("css/" + f + ": uses tokens, not raw brand hex",
        hits.length === 0, hits.join(" "));
    }

    // base.css must define every token the pages rely on.
    const base = fs.readFileSync(path.join(dir, "base.css"), "utf8");
    for (const name of Object.keys(TOKENS)) {
      ok("css/base.css defines " + name, base.includes(name + ":"));
    }
  }

  await browser.close();

  console.log("\n" + "=".repeat(60));
  console.log(`PASS ${pass}   FAIL ${fail}   (${pass + fail} checks)`);
  console.log("=".repeat(60));
  process.exit(fail === 0 ? 0 : 1);
})();
