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
const appSource = readFileSync(join(root, "app.js"), "utf8");

function boot(fetchImpl) {
  const dom = new JSDOM(html, {
    url: "https://wapileo.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.fetch = fetchImpl;
  dom.window.eval(appSource);
  return dom;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 40));

test("renders place cards from the API and escapes hostile content", { skip: !JSDOM }, async () => {
  const payload = {
    places: [
      { id: "x", name: "<img src=x onerror=alert(1)>", area: "Masaki", price: "p", line: "l", image: "https://images.unsplash.com/a.jpg", score: 90, state: "Moto sana", categories: ["all"], tags: ["t"], reportCount: 2, live: true },
      { id: "y", name: "Calm", area: "Sinza", price: "p", line: "l", image: "https://images.unsplash.com/b.jpg", score: 60, state: "Inajaa", categories: ["all"], tags: [], reportCount: 0, live: false },
    ],
  };
  const dom = boot(async () => ({ ok: true, json: async () => payload }));
  await tick();

  const cards = dom.window.document.querySelectorAll("#placesList .place-card");
  assert.equal(cards.length, 2);
  assert.equal(dom.window.document.querySelectorAll("#placesList img[onerror]").length, 0);
  assert.ok(dom.window.document.querySelector("#offlineNote").classList.contains("hidden"));
});

test("falls back to bundled places and shows the offline note when the API fails", { skip: !JSDOM }, async () => {
  const dom = boot(async () => { throw new Error("network down"); });
  await tick();

  const cards = dom.window.document.querySelectorAll("#placesList .place-card");
  assert.equal(cards.length, 6);
  assert.ok(!dom.window.document.querySelector("#offlineNote").classList.contains("hidden"));
});

test("category filter narrows the list", { skip: !JSDOM }, async () => {
  const payload = {
    places: [
      { id: "music1", name: "Club", area: "A", price: "p", line: "l", image: "i", score: 90, state: "Moto sana", categories: ["all", "music"], tags: [], reportCount: 0, live: false },
      { id: "food1", name: "Grill", area: "B", price: "p", line: "l", image: "i", score: 80, state: "Kuna vibe", categories: ["all", "food"], tags: [], reportCount: 0, live: false },
    ],
  };
  const dom = boot(async () => ({ ok: true, json: async () => payload }));
  await tick();
  const doc = dom.window.document;
  doc.querySelector('.category[data-filter="music"]').click();
  const cards = doc.querySelectorAll("#placesList .place-card");
  assert.equal(cards.length, 1);
  assert.match(cards[0].textContent, /Club/);
});
