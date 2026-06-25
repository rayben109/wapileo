/* WapiLeo front-end.
 * Places now come from the live API (/api/places); vibe reports are shared
 * across users (/api/reports). If the network is unavailable we fall back to a
 * bundled snapshot so the app always renders. */

// Static plan templates stay client-side (they are content, not user data).
const routes = {
  budget: {
    romantic: {
      title: "Sweet date bila pressure",
      image:
        "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
      steps: ["Coffee at Slipway", "Sunset walk", "Mocktails at Coral Beach"],
    },
    fun: {
      title: "Laugh first, food after",
      image:
        "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80",
      steps: ["Games at Escape One", "Chips and mishkaki", "Music in Mikocheni"],
    },
    chill: {
      title: "Soft life on a tight budget",
      image:
        "https://images.unsplash.com/photo-1525824236856-8c0a31dfe3be?auto=format&fit=crop&w=1200&q=80",
      steps: ["Juice stop", "Beach walk", "Nyama at Sinza"],
    },
    foodie: {
      title: "Food mission",
      image:
        "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80",
      steps: ["Mishkaki starter", "Moyo Nyama", "Ice cream finish"],
    },
  },
  mid: {
    romantic: {
      title: "Looks expensive, behaves nicely",
      image:
        "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80",
      steps: ["Dinner at Samaki", "Dessert at Slipway", "Nightcap by the water"],
    },
    fun: {
      title: "From games to dancing",
      image:
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
      steps: ["Escape One", "Quick bites", "Amapiano in Masaki"],
    },
    chill: {
      title: "Clean chill, no chaos",
      image:
        "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80",
      steps: ["Coral Beach", "Slow dinner", "Ocean-side talk"],
    },
    foodie: {
      title: "Dinner that can become plans",
      image:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
      steps: ["Samaki Samaki", "Shared dessert", "Drinks nearby"],
    },
  },
  premium: {
    romantic: {
      title: "Anniversary energy",
      image:
        "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80",
      steps: ["Reserve dinner", "Coral Beach drinks", "Late lounge in Masaki"],
    },
    fun: {
      title: "No budget, no boredom",
      image:
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
      steps: ["Private dinner", "Warehouse table", "After party plan"],
    },
    chill: {
      title: "Premium calm",
      image:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      steps: ["Beach dinner", "Quiet lounge", "Driver home"],
    },
    foodie: {
      title: "Eat well, look better",
      image:
        "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1200&q=80",
      steps: ["Chef menu", "Wine bar", "Dessert with a view"],
    },
  },
};

// Offline / first-paint fallback snapshot. Kept in sync with lib/seed-data.js.
const FALLBACK_PLACES = [
  { id: "warehouse", name: "Warehouse", area: "Masaki", price: "100k+", line: "Late night, loud fits, Afrobeats, Amapiano, and zero sitting still.", image: "https://images.unsplash.com/photo-1571266028243-d220c6a7edbf?auto=format&fit=crop&w=1200&q=80", score: 95, state: "Imeamka", categories: ["all", "music"], tags: ["Amapiano", "Dress smart", "Late night"], reportCount: 0, live: false },
  { id: "coral", name: "Coral Beach", area: "Masaki", price: "40k - 100k", line: "Ocean air, cocktails, and date-night photos that do the talking.", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", score: 91, state: "Moto sana", categories: ["all", "date", "chill", "beach", "food"], tags: ["Great photos", "Date friendly", "Beach breeze"], reportCount: 0, live: false },
  { id: "samaki", name: "Samaki Samaki", area: "Mlimani City", price: "40k - 100k", line: "Dinner, live music, and the table next to you probably knows the DJ.", image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80", score: 87, state: "Kuna vibe", categories: ["all", "music", "food", "date"], tags: ["Live band", "Dinner", "Inajaa mapema"], reportCount: 0, live: false },
  { id: "slipway", name: "The Slipway", area: "Msasani", price: "40k - 100k", line: "Sunset walk, dessert, calm talk, and a view that fixes the plan.", image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80", score: 83, state: "Chill tu", categories: ["all", "date", "chill", "beach", "food"], tags: ["Sunset", "Quiet-ish", "Walkable"], reportCount: 0, live: false },
  { id: "escape", name: "Escape One", area: "Mikocheni", price: "Under 40k", line: "Games, light food, and an easy hangout when nobody wants pressure.", image: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80", score: 78, state: "Inajaa", categories: ["all", "games", "chill", "date"], tags: ["Games", "Low pressure", "Group plan"], reportCount: 0, live: false },
  { id: "nyama", name: "Moyo Nyama", area: "Sinza", price: "Under 40k", line: "Nyama, football noise, and the kind of plan that becomes a story.", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80", score: 76, state: "Kuna watu", categories: ["all", "food", "chill"], tags: ["Budget friendly", "Football", "Nyama choma"], reportCount: 0, live: false },
];

const list = document.querySelector("#placesList");
const listTitle = document.querySelector("#listTitle");
const routeCard = document.querySelector("#routeCard");
const budgetSelect = document.querySelector("#budgetSelect");
const moodSelect = document.querySelector("#moodSelect");
const placeSelect = document.querySelector("#placeSelect");
const sheet = document.querySelector("#reportSheet");
const backdrop = document.querySelector("#sheetBackdrop");
const toast = document.querySelector("#toast");
const vibeOptions = document.querySelector("#vibeOptions");
const offlineNote = document.querySelector("#offlineNote");
const submitReport = document.querySelector("#submitReport");

let places = [];
let activeFilter = "all";
let selectedReport = { score: 72, label: "Kuna vibe" };
let toastTimer;

// --- Helpers ---------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

function clampScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sortedByHeat(items) {
  return [...items].sort((a, b) => b.score - a.score);
}

// --- Data ------------------------------------------------------------------

async function fetchPlaces() {
  try {
    const response = await fetch("/api/places", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.places) || data.places.length === 0) {
      throw new Error("Empty response");
    }
    places = data.places;
    setOffline(false);
  } catch (error) {
    console.warn("Falling back to bundled places:", error);
    if (places.length === 0) places = FALLBACK_PLACES;
    setOffline(true);
  }
}

function setOffline(isOffline) {
  if (!offlineNote) return;
  offlineNote.classList.toggle("hidden", !isOffline);
}

// --- Rendering -------------------------------------------------------------

function renderSkeleton() {
  list.setAttribute("aria-busy", "true");
  list.innerHTML = Array.from({ length: 3 })
    .map(() => `<div class="place-card skeleton" aria-hidden="true"></div>`)
    .join("");
}

function renderPlaces() {
  const activeCategory = document.querySelector(".category.active");
  const filtered = sortedByHeat(
    places.filter((place) => (place.categories || []).includes(activeFilter)),
  );

  listTitle.textContent =
    activeFilter === "all"
      ? "Tonight's heat"
      : `${activeCategory ? activeCategory.textContent.trim() : "Tonight"} picks`;

  list.setAttribute("aria-busy", "false");

  if (filtered.length === 0) {
    list.innerHTML = `<p class="empty-state">No spots in this vibe yet. Try another category.</p>`;
    return;
  }

  list.innerHTML = filtered
    .map((place) => {
      const score = clampScore(place.score);
      const reportLine = place.reportCount
        ? `${place.reportCount} live ${place.reportCount === 1 ? "report" : "reports"}`
        : "Tap to set the vibe";
      return `
      <article class="place-card" data-id="${escapeHtml(place.id)}">
        <img class="place-photo" src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)} in ${escapeHtml(place.area)}" loading="lazy" decoding="async" width="800" height="600" />
        <div class="place-content">
          <div class="place-topline">
            <span class="temp-chip">${escapeHtml(place.state)}</span>
            <div class="score-ring" style="--score: ${score}" role="img" aria-label="Vibe score ${score} out of 100">
              <span>${score}</span>
            </div>
          </div>
          <div>
            <h3>${escapeHtml(place.name)}</h3>
            <p class="place-meta">${escapeHtml(place.area)} / ${escapeHtml(place.price)} / ${escapeHtml(place.line)}</p>
            <p class="place-reports">${escapeHtml(reportLine)}</p>
          </div>
          <div class="tag-row">
            ${(place.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="card-actions">
            <button class="action-button hot" data-report="${escapeHtml(place.id)}" type="button">Ikoje hapo?</button>
            <button class="action-button" data-share="${escapeHtml(place.id)}" type="button">Share status</button>
          </div>
        </div>
      </article>
    `;
    })
    .join("");
}

function renderRoute() {
  const route = routes[budgetSelect.value][moodSelect.value];
  routeCard.style.setProperty("--route-image", `url('${route.image}')`);
  routeCard.innerHTML = `
    <h3>${escapeHtml(route.title)}</h3>
    <ol class="route-steps">
      ${route.steps.map((step, index) => `<li><span>${index + 1}</span>${escapeHtml(step)}</li>`).join("")}
    </ol>
    <div class="route-actions">
      <button class="mini-button" id="shareRoute" type="button">Share plan</button>
      <button class="mini-button" id="saveRoute" type="button">Save</button>
    </div>
  `;
}

function renderPlaceOptions() {
  const source = places.length ? places : FALLBACK_PLACES;
  placeSelect.innerHTML = source
    .map(
      (place) =>
        `<option value="${escapeHtml(place.id)}">${escapeHtml(place.name)} / ${escapeHtml(place.area)}</option>`,
    )
    .join("");
}

// --- Sheet + toast ---------------------------------------------------------

function openSheet(placeId) {
  renderPlaceOptions();
  if (placeId) placeSelect.value = placeId;
  sheet.classList.remove("hidden");
  backdrop.classList.remove("hidden");
}

function closeSheet() {
  sheet.classList.add("hidden");
  backdrop.classList.add("hidden");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.add("hidden"), 2600);
}

async function shareText(text) {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast("Copied. Peleka kwa status.");
      return;
    }
    throw new Error("No share support");
  } catch (error) {
    if (error && error.name === "AbortError") return;
    showToast("Sharing imekataa kidogo. Try tena.");
  }
}

// --- Saved plans (local convenience) --------------------------------------

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem("wapileo-saved") || "[]");
  } catch {
    return [];
  }
}

function saveRoutePlan(route) {
  try {
    const saved = loadSaved();
    if (!saved.some((item) => item.title === route.title)) {
      saved.push({ title: route.title, steps: route.steps });
      localStorage.setItem("wapileo-saved", JSON.stringify(saved));
    }
    showToast("Saved. This one has potential.");
  } catch {
    showToast("Saved for now.");
  }
}

// --- Reporting (shared via API) -------------------------------------------

async function submitVibeReport() {
  const placeId = placeSelect.value;
  const original = submitReport.textContent;
  submitReport.disabled = true;
  submitReport.textContent = "Inatuma...";

  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, ...selectedReport }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.place) {
      const index = places.findIndex((item) => item.id === data.place.id);
      if (index >= 0) places[index] = data.place;
      else places.push(data.place);
    }
    renderPlaces();
    closeSheet();
    showToast(`${data.place ? data.place.name : "Vibe"} updated: ${selectedReport.label}. City inajua sasa.`);
  } catch (error) {
    console.warn("Report failed:", error);
    showToast("Haikutuma. Angalia mtandao, jaribu tena.");
  } finally {
    submitReport.disabled = false;
    submitReport.textContent = original;
  }
}

// --- Events ----------------------------------------------------------------

document.querySelectorAll(".category").forEach((button) => {
  button.addEventListener("click", () => {
    const current = document.querySelector(".category.active");
    if (current) {
      current.classList.remove("active");
      current.setAttribute("aria-pressed", "false");
    }
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
    activeFilter = button.dataset.filter;
    renderPlaces();
  });
});

document.querySelector("#planShortcut").addEventListener("click", () => {
  document.querySelector("#planner").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#shufflePlan").addEventListener("click", () => {
  const budgets = ["budget", "mid", "premium"];
  const moods = ["romantic", "fun", "chill", "foodie"];
  budgetSelect.value = budgets[Math.floor(Math.random() * budgets.length)];
  moodSelect.value = moods[Math.floor(Math.random() * moods.length)];
  renderRoute();
});

document.querySelector("#openReport").addEventListener("click", () => openSheet());
document.querySelector("#closeReport").addEventListener("click", closeSheet);
backdrop.addEventListener("click", closeSheet);
budgetSelect.addEventListener("change", renderRoute);
moodSelect.addEventListener("change", renderRoute);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !sheet.classList.contains("hidden")) closeSheet();
});

vibeOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  vibeOptions.querySelectorAll("button").forEach((option) => {
    option.classList.remove("selected");
    option.setAttribute("aria-pressed", "false");
  });
  button.classList.add("selected");
  button.setAttribute("aria-pressed", "true");
  selectedReport = { score: Number(button.dataset.score), label: button.dataset.label };
});

submitReport.addEventListener("click", submitVibeReport);

document.addEventListener("click", (event) => {
  const reportButton = event.target.closest("[data-report]");
  const shareButton = event.target.closest("[data-share]");
  const shareRoute = event.target.closest("#shareRoute");
  const saveRoute = event.target.closest("#saveRoute");

  if (reportButton) {
    openSheet(reportButton.dataset.report);
  }

  if (shareButton) {
    const place = places.find((item) => item.id === shareButton.dataset.share);
    if (place) {
      shareText(
        `WapiLeo: ${place.name} (${place.area}) iko ${place.state} leo. ${place.line} Places, plans, and vibes for today.`,
      );
    }
  }

  if (shareRoute) {
    const route = routes[budgetSelect.value][moodSelect.value];
    shareText(`WapiLeo date plan: ${route.steps.join(" -> ")}. Leo twende wapi?`);
  }

  if (saveRoute) {
    saveRoutePlan(routes[budgetSelect.value][moodSelect.value]);
  }
});

document.querySelector("#cityButton").addEventListener("click", () => {
  showToast("Cities coming next: Arusha, Mwanza, Dodoma, Zanzibar.");
});

document.querySelector("#savedButton").addEventListener("click", () => {
  const saved = loadSaved();
  showToast(saved.length ? `${saved.length} saved plan${saved.length === 1 ? "" : "s"} ready.` : "Saved plans will live here.");
});

document.querySelector("#sortButton").addEventListener("click", () => {
  renderPlaces();
  showToast("Sorted moto first.");
});

// --- Init ------------------------------------------------------------------

const initialVibe = vibeOptions.querySelector('[data-label="Kuna vibe"]');
if (initialVibe) {
  initialVibe.classList.add("selected");
  initialVibe.setAttribute("aria-pressed", "true");
}

renderRoute();
renderPlaceOptions();
renderSkeleton();

fetchPlaces().then(() => {
  renderPlaces();
  renderPlaceOptions();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
