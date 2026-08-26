/*
 * Resolves a Chromium-family executable for the verify_* harnesses.
 *
 * Order: $PW_CHROME, then the usual install locations on Linux, macOS and
 * Windows. Set PW_CHROME explicitly if yours lives somewhere else:
 *
 *   PW_CHROME="/path/to/chrome" node test/verify_css_extraction.js
 *
 * Forward slashes in the Windows paths on purpose - Node accepts them there,
 * and they survive being edited from a shell without escaping games.
 */
const fs = require("fs");

const CANDIDATES = [
  process.env.PW_CHROME,
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

function chromePath() {
  for (const p of CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error(
    "No Chromium executable found. Set PW_CHROME to one, e.g.\n" +
    "  PW_CHROME='/path/to/chrome' node test/<harness>.js"
  );
}

module.exports = { chromePath };
