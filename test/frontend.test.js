import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let JSDOM;
try {
  ({ JSDOM } = await import("jsdom"));
} catch {
  JSDOM = null;
}

const html = readFileSync(join(root, "index.html"), "utf8");

test("index.html has the new UI elements", { skip: !JSDOM }, () => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Feedback button in topbar
  assert.ok(doc.querySelector("#feedbackButton"), "feedback button present");

  // Area filter bar
  assert.ok(doc.querySelector(".filter-bar"), "area filter bar present");
  const areaChips = doc.querySelectorAll(".area-chip");
  assert.ok(areaChips.length >= 8, `area chips present (${areaChips.length})`);

  // Crowd / music / entry options in report sheet
  assert.ok(doc.querySelector("#crowdOptions"), "crowd options present");
  assert.ok(doc.querySelector("#musicOptions"), "music options present");
  assert.ok(doc.querySelector("#entryOptions"), "entry options present");

  // Feedback + claim sheets
  assert.ok(doc.querySelector("#feedbackSheet"), "feedback sheet present");
  assert.ok(doc.querySelector("#claimSheet"), "claim sheet present");

  // Venue claim link in footer
  assert.ok(doc.querySelector("#claimVenue"), "claim venue link present");

  // Script entrypoint
  const script = doc.querySelector('script[type="module"]');
  assert.ok(script && script.getAttribute("src") === "/src/main.js", "module script points to src/main.js");
});

test("report sheet has the frictionless 4-tap categories", { skip: !JSDOM }, () => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const crowdLabels = [...doc.querySelectorAll("#crowdOptions button")].map((b) => b.textContent.trim());
  assert.deepEqual(crowdLabels, ["Dead", "Chill", "Packed", "Overcrowded"]);

  const musicLabels = [...doc.querySelectorAll("#musicOptions button")].map((b) => b.textContent.trim());
  assert.deepEqual(musicLabels, ["Afrobeats", "Amapiano", "Calm", "Live Band"]);

  const entryLabels = [...doc.querySelectorAll("#entryOptions button")].map((b) => b.textContent.trim());
  assert.deepEqual(entryLabels, ["Free", "Cover Charge"]);
});

test("all area chips reference real Dar es Salaam neighborhoods", { skip: !JSDOM }, () => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const areas = [...doc.querySelectorAll(".area-chip")].map((b) => b.dataset.area);
  assert.ok(areas.includes("all"));
  assert.ok(areas.includes("Masaki"));
  assert.ok(areas.includes("Msasani"));
  assert.ok(areas.includes("Sinza"));
  assert.ok(areas.includes("Mikocheni"));
});
