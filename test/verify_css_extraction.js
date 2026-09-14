/*
 * verify_css_extraction.js
 *
 * Guards the move from inline <style> blocks to the shared stylesheets in
 * css/. It checks that every page links the right sheets in the right
 * order, that the design tokens and the focus convention actually resolve
 * on each page, that the disclosure panels meet the accessibility
 * conventions, and that no page-level stylesheet has drifted back to
 * hardcoded brand hex codes.
 *
 * Needs: npm install playwright-core
 * Run:   node test/verify_css_extraction.js
 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const { chromePath } = require("./_chrome.js");
const EXEC = chromePath();
const ROOT = path.resolve(__dirname, "..");

// Appended to every page by the shared site header. FONTS is cross-origin,
// so its rules are unreadable from file:// however the browser is launched.
const FONTS = "https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap";
const HEADER = [FONTS, "css/site_header.css"];

// Pages converted to external CSS, with the page's own sheets in order; the
// shared header sheets are appended to each below.
const CONVERTED = {
  "index.html": ["css/base.css", "css/index.css"],
  "learning_objectives.html": ["css/base.css", "css/document.css", "css/learning_objectives.css"],
  "blooms_verbs.html": ["css/base.css", "css/document.css", "css/blooms_verbs.css"],
  "course_planner.html": ["css/base.css", "css/document.css", "css/course_planner.css"],
  "credit_hour_planner.html": ["css/base.css", "css/document.css", "css/credit_hour_planner.css"],
  "workload_estimator.html": ["css/base.css", "css/calculator.css", "css/workload_estimator.css"],
};
for (const k of Object.keys(CONVERTED)) CONVERTED[k] = CONVERTED[k].concat(HEADER);

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
      // -1 means cssRules threw, which is the expected and only possible
      // result for the cross-origin Google Fonts sheet.
      info.ruleCounts.every((n, i) => (sheets[i] === FONTS ? n === -1 : n > 0)),
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

  /* ===== 2. Stylesheet hygiene ===== */
  {
    const dir = path.join(ROOT, "css");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".css"));
    ok("css/ holds the expected sheets", files.length === 10, files.join(" "));

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

  /* ===== 3. Disclosure panel accessibility =====
     Guards the fixes made to the collapsible guidance panels: summaries
     must be headings (so heading navigation reaches them), accessible
     names must be unique on the page, the panel border must clear the
     3:1 non-text contrast ratio, the summary must clear the 24px target
     minimum, and the calculators' blue summary text must clear 4.5:1. */
  {
    // Relative luminance / contrast ratio, straight from the WCAG definition.
    const REL = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const lum = (p) => 0.2126 * REL(p[0]) + 0.7152 * REL(p[1]) + 0.0722 * REL(p[2]);
    const ratio = (a, b) => {
      const la = lum(a), lb = lum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const rgb = (str) => (str.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);

    for (const file of Object.keys(CONVERTED)) {
      const page = await browser.newPage();
      await page.goto("file://" + path.join(ROOT, file));
      await page.waitForTimeout(150);

      const data = await page.evaluate(() => ({
        bodyBg: getComputedStyle(document.body).backgroundColor,
        bodyFontSize: getComputedStyle(document.body).fontSize,
        items: Array.from(document.querySelectorAll("details > summary")).map((sm) => {
          const cs = getComputedStyle(sm);
          const heads = Array.from(sm.children).filter((k) => /^H[1-6]$/.test(k.tagName));
          const panel = getComputedStyle(sm.parentElement);
          return {
            // innerText skips the .sr-only qualifier, textContent keeps it.
            visible: (sm.innerText || "").replace(/\s+/g, " ").trim(),
            accName: (sm.textContent || "").replace(/\s+/g, " ").trim(),
            headingCount: heads.length,
            height: sm.getBoundingClientRect().height,
            color: cs.color,
            fontSize: cs.fontSize,
            panelBorder: panel.borderTopColor,
            isGuide: sm.parentElement.classList.contains("guide"),
          };
        }),
      }));

      if (!data.items.length) { await page.close(); continue; }

      ok(file + ": every summary wraps its text in exactly one heading",
        data.items.every((i) => i.headingCount === 1),
        data.items.map((i) => i.headingCount).join(","));

      const names = data.items.map((i) => i.accName);
      ok(file + ": no two disclosures share an accessible name",
        new Set(names).size === names.length, names.join(" | "));

      // WCAG 2.5.3: the visible label must be contained in the accessible name.
      ok(file + ": each summary's visible label is inside its accessible name",
        data.items.every((i) => i.accName.indexOf(i.visible) !== -1),
        data.items.map((i) => i.visible + " !< " + i.accName).join(" | "));

      // WCAG 2.5.8.
      ok(file + ": every summary clears the 24px target minimum",
        data.items.every((i) => i.height >= 24),
        data.items.map((i) => Math.round(i.height)).join(","));

      for (const i of data.items) {
        if (i.isGuide) {
          // The border marks the panel's edge; the Light Blue fill is only
          // ~1.09:1 against the page background and cannot carry that alone.
          const r = ratio(rgb(i.panelBorder), rgb(data.bodyBg));
          ok(file + ": .guide border clears 3:1 against the page background",
            r >= 3, r.toFixed(2) + " for " + i.panelBorder);
          ok(file + ": .guide text is not smaller than body text",
            parseFloat(i.fontSize) >= parseFloat(data.bodyFontSize),
            i.fontSize + " vs " + data.bodyFontSize);
        } else {
          // Any non-.guide summary: the calculators' blue methodology
          // panels (4.53:1 on white - passes AA by a hair, so pin it rather
          // than let it drift under) and the planner's collapsible steps.
          const r = ratio(rgb(i.color), [255, 255, 255]);
          ok(file + ": summary text clears 4.5:1 on the card",
            r >= 4.5, r.toFixed(2) + " for " + i.color);
        }
      }
      await page.close();
    }
  }

  await browser.close();

  console.log("\n" + "=".repeat(60));
  console.log(`PASS ${pass}   FAIL ${fail}   (${pass + fail} checks)`);
  console.log("=".repeat(60));
  process.exit(fail === 0 ? 0 : 1);
})();
