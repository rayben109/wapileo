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

const html = readFileSync(join(root, "public", "index.html"), "utf8");
const appSource = readFileSync(join(root, "public", "app.js"), "utf8");

function boot(fetchImpl, setup) {
  const dom = new JSDOM(html, {
    url: "https://wapileo.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.fetch = fetchImpl;
  if (setup) setup(dom.window);
  dom.window.eval(appSource);
  return dom;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 40));
const cards = (dom) => dom.window.document.querySelectorAll("#placesList .place-card");

function makePlaces(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Place ${i}`,
    area: "Area",
    price: "p",
    line: "l",
    image: "https://images.unsplash.com/x.jpg",
    score: 99 - i,
    state: "Kuna vibe",
    categories: ["all"],
    tags: [],
    reportCount: 0,
    live: false,
  }));
}

test("renders cards from the API, sorted, and escapes hostile content", { skip: !JSDOM }, async () => {
  const payload = {
    places: [
      { id: "y", name: "Calm", area: "Sinza", price: "p", line: "l", image: "https://images.unsplash.com/b.jpg", score: 60, state: "Inajaa", categories: ["all"], tags: [], reportCount: 0, live: false },
      { id: "x", name: "<img src=x onerror=alert(1)>", area: "Masaki", price: "p", line: "l", image: "https://images.unsplash.com/a.jpg", score: 90, state: "Moto sana", categories: ["all"], tags: ["t"], reportCount: 2, live: true },
    ],
  };
  const dom = boot(async () => ({ ok: true, json: async () => payload }));
  await tick();
  const c = cards(dom);
  assert.equal(c.length, 2);
  assert.match(c[0].querySelector("h3").textContent, /img src/); // highest score first, text-escaped
  assert.equal(dom.window.document.querySelectorAll("#placesList img[onerror]").length, 0);
  assert.equal(c[0].querySelectorAll(".card-actions .action-button").length, 3); // 3 buttons
  assert.ok(c[0].querySelector(".bookmark")); // bookmark present
});

test("home caps at 12 places, sorted by score", { skip: !JSDOM }, async () => {
  const dom = boot(async () => ({ ok: true, json: async () => ({ places: makePlaces(14) }) }));
  await tick();
  const c = cards(dom);
  assert.equal(c.length, 12);
  assert.match(c[0].querySelector("h3").textContent, /Place 0/); // score 99 first
});

test("falls back to 12 bundled places + offline note when API fails", { skip: !JSDOM }, async () => {
  const dom = boot(async () => { throw new Error("network down"); });
  await tick();
  assert.equal(cards(dom).length, 12);
  assert.ok(!dom.window.document.querySelector("#offlineNote").classList.contains("hidden"));
});

test("Go button opens Google Maps directions", { skip: !JSDOM }, async () => {
  const dom = boot(async () => ({ ok: true, json: async () => ({ places: makePlaces(3) }) }));
  await tick();
  const opened = [];
  dom.window.open = (url) => { opened.push(url); return null; };
  dom.window.document.querySelector("[data-go]").click();
  assert.equal(opened.length, 1);
  assert.match(opened[0], /google\.com\/maps\/dir\/\?api=1&destination=/);
  assert.match(opened[0], /Dar%20es%20Salaam/);
});

test("bookmark toggles gold + persists to localStorage", { skip: !JSDOM }, async () => {
  const dom = boot(async () => ({ ok: true, json: async () => ({ places: makePlaces(3) }) }));
  await tick();
  const bm = dom.window.document.querySelector("[data-bookmark]");
  const id = bm.dataset.bookmark;
  bm.click();
  assert.ok(bm.classList.contains("saved"));
  assert.equal(bm.getAttribute("aria-pressed"), "true");
  const stored = JSON.parse(dom.window.localStorage.getItem("wapileo-saved-places"));
  assert.ok(stored.includes(id));
});

test("header bookmark shows only saved spots; category exits the view", { skip: !JSDOM }, async () => {
  const dom = boot(async () => ({ ok: true, json: async () => ({ places: makePlaces(5) }) }));
  await tick();
  const doc = dom.window.document;
  // save the first two cards
  const bms = doc.querySelectorAll("[data-bookmark]");
  bms[0].click();
  bms[1].click();
  // open saved view
  doc.querySelector("#savedButton").click();
  assert.equal(doc.querySelector("#listTitle").textContent, "Saved spots");
  assert.equal(cards(dom).length, 2);
  // tapping a category exits saved view
  doc.querySelector('.category[data-filter="all"]').click();
  assert.notEqual(doc.querySelector("#listTitle").textContent, "Saved spots");
  assert.equal(cards(dom).length, 5);
});

test("saved spots survive a refresh (loaded from localStorage)", { skip: !JSDOM }, async () => {
  const dom = boot(
    async () => ({ ok: true, json: async () => ({ places: makePlaces(4) }) }),
    (win) => win.localStorage.setItem("wapileo-saved-places", JSON.stringify(["p2"])),
  );
  await tick();
  const doc = dom.window.document;
  // the saved card should already show its bookmark filled
  const savedCard = doc.querySelector('.place-card[data-id="p2"] .bookmark');
  assert.ok(savedCard.classList.contains("saved"));
  // and the saved view should contain exactly it
  doc.querySelector("#savedButton").click();
  const c = cards(dom);
  assert.equal(c.length, 1);
  assert.match(c[0].querySelector("h3").textContent, /Place 2/);
});
