/* WapiLeo front-end (Vite + Supabase).
 * Places + reports + confirms are crowd-powered and shared across all users
 * through Supabase. Saved spots persist in localStorage. */

import { supabase } from "./supabase.js";
import {
  aggregatePlace,
  labelForScore,
  timeAgo,
  isStale,
  validateReport,
  WINDOW_HOURS,
} from "./scoring.js";

// Static plan templates stay client-side (they are content, not user data).
const routes = {
  budget: {
    romantic: { title: "Sweet date bila pressure", image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80", steps: ["Coffee at Slipway", "Sunset walk", "Mocktails at Coral Beach"] },
    fun: { title: "Laugh first, food after", image: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80", steps: ["Games at Escape One", "Chips and mishkaki", "Music in Mikocheni"] },
    chill: { title: "Soft life on a tight budget", image: "https://images.unsplash.com/photo-1525824236856-8c0a31dfe3be?auto=format&fit=crop&w=1200&q=80", steps: ["Juice stop", "Beach walk", "Nyama at Sinza"] },
    foodie: { title: "Food mission", image: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80", steps: ["Mishkaki starter", "Moyo Nyama", "Ice cream finish"] },
  },
  mid: {
    romantic: { title: "Looks expensive, behaves nicely", image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80", steps: ["Dinner at Samaki", "Dessert at Slipway", "Nightcap by the water"] },
    fun: { title: "From games to dancing", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80", steps: ["Escape One", "Quick bites", "Amapiano in Masaki"] },
    chill: { title: "Clean chill, no chaos", image: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80", steps: ["Coral Beach", "Slow dinner", "Ocean-side talk"] },
    foodie: { title: "Dinner that can become plans", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80", steps: ["Samaki Samaki", "Shared dessert", "Drinks nearby"] },
  },
  premium: {
    romantic: { title: "Anniversary energy", image: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80", steps: ["Reserve dinner", "Coral Beach drinks", "Late lounge in Masaki"] },
    fun: { title: "No budget, no boredom", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80", steps: ["Private dinner", "Warehouse table", "After party plan"] },
    chill: { title: "Premium calm", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", steps: ["Beach dinner", "Quiet lounge", "Driver home"] },
    foodie: { title: "Eat well, look better", image: "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1200&q=80", steps: ["Chef menu", "Wine bar", "Dessert with a view"] },
  },
};

const HOME_LIMIT = 12;
const SAVED_KEY = "wapileo-saved-places";

const list = document.querySelector("#placesList");
const listTitle = document.querySelector("#listTitle");
const routeCard = document.querySelector("#routeCard");
const budgetSelect = document.querySelector("#budgetSelect");
const moodSelect = document.querySelector("#moodSelect");
const placeSelect = document.querySelector("#placeSelect");
const reportSheet = document.querySelector("#reportSheet");
const feedbackSheet = document.querySelector("#feedbackSheet");
const claimSheet = document.querySelector("#claimSheet");
const backdrop = document.querySelector("#sheetBackdrop");
const toast = document.querySelector("#toast");
const crowdOptions = document.querySelector("#crowdOptions");
const musicOptions = document.querySelector("#musicOptions");
const entryOptions = document.querySelector("#entryOptions");
const offlineNote = document.querySelector("#offlineNote");
const submitReport = document.querySelector("#submitReport");
const savedButton = document.querySelector("#savedButton");
const feedbackButton = document.querySelector("#feedbackButton");

let places = [];
let activeFilter = "all";
let activeArea = "all";
let showSaved = false;
let selectedReport = { score: 72, label: "Kuna vibe" };
let selectedMusic = null;
let selectedEntry = null;
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

// --- Saved spots (persisted) ----------------------------------------------

function loadSavedPlaces() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

let savedPlaces = loadSavedPlaces();

function persistSavedPlaces() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...savedPlaces]));
  } catch {
    /* ignore storage errors */
  }
}

function toggleSavedPlace(id) {
  if (savedPlaces.has(id)) savedPlaces.delete(id);
  else savedPlaces.add(id);
  persistSavedPlaces();
  return savedPlaces.has(id);
}

// --- Data ------------------------------------------------------------------

async function fetchPlaces() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - WINDOW_HOURS * 3600 * 1000).toISOString();

  const [
    { data: placeRows, error: placeError },
    { data: reportRows, error: reportError },
    { data: confirmRows, error: confirmError },
  ] = await Promise.all([
    supabase.from("places").select("*").order("base_score", { ascending: false }),
    supabase.from("vibe_reports").select("*").gte("created_at", cutoff),
    supabase.from("place_confirms").select("*").gte("created_at", cutoff),
  ]);

  if (placeError || reportError || confirmError) {
    throw new Error(placeError?.message || reportError?.message || confirmError?.message);
  }

  const reportsByPlace = new Map();
  for (const r of reportRows || []) {
    if (!reportsByPlace.has(r.place_id)) reportsByPlace.set(r.place_id, []);
    reportsByPlace.get(r.place_id).push(r);
  }

  const confirmsByPlace = new Map();
  for (const c of confirmRows || []) {
    if (!confirmsByPlace.has(c.place_id)) confirmsByPlace.set(c.place_id, []);
    confirmsByPlace.get(c.place_id).push(c);
  }

  places = (placeRows || []).map((p) =>
    aggregatePlace(p, reportsByPlace.get(p.id) || [], confirmsByPlace.get(p.id) || [], now),
  );
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

function visiblePlaces() {
  if (showSaved) {
    return sortedByHeat(places.filter((place) => savedPlaces.has(place.id)));
  }
  let filtered = places;
  if (activeFilter !== "all") {
    filtered = filtered.filter((place) => (place.categories || []).includes(activeFilter));
  }
  if (activeArea !== "all") {
    filtered = filtered.filter((place) => place.area === activeArea);
  }
  const sorted = sortedByHeat(filtered);
  return activeFilter === "all" && activeArea === "all" ? sorted.slice(0, HOME_LIMIT) : sorted;
}

function cardMarkup(place) {
  const score = clampScore(place.score);
  const saved = savedPlaces.has(place.id);
  const reportLine = place.reportCount
    ? `${place.reportCount} live ${place.reportCount === 1 ? "report" : "reports"}`
    : "Tap to set the vibe";
  const timeBadge = place.live ? timeAgo(place.lastReportAt) : "";
  const stale = place.live && isStale(place.lastReportAt);
  const confirmLine = place.confirmCount
    ? `${place.confirmCount} ${place.confirmCount === 1 ? "confirm" : "confirms"}`
    : "";
  return `
    <article class="place-card${stale ? " stale" : ""}" data-id="${escapeHtml(place.id)}">
      <img class="place-photo" src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)} in ${escapeHtml(place.area)}" loading="lazy" decoding="async" width="800" height="600" />
      <button class="bookmark ${saved ? "saved" : ""}" data-bookmark="${escapeHtml(place.id)}" type="button" aria-pressed="${saved}" aria-label="Save ${escapeHtml(place.name)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
      </button>
      ${place.live ? `<span class="live-badge${stale ? " stale" : ""}">Live &middot; ${escapeHtml(timeBadge)}</span>` : ""}
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
          <p class="place-reports">${escapeHtml(reportLine)}${confirmLine ? ` &middot; ${escapeHtml(confirmLine)}` : ""}</p>
        </div>
        <div class="tag-row">
          ${(place.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="card-actions">
          <button class="action-button hot" data-report="${escapeHtml(place.id)}" type="button">Ikoje hapo?</button>
          <button class="action-button go" data-go="${escapeHtml(place.id)}" type="button">Go</button>
          <button class="action-button confirm" data-confirm="${escapeHtml(place.id)}" type="button">Still hot</button>
          <button class="action-button" data-share="${escapeHtml(place.id)}" type="button">Share</button>
        </div>
      </div>
    </article>`;
}

function renderPlaces() {
  const activeCategory = document.querySelector(".category.active");
  if (showSaved) {
    listTitle.textContent = "Saved spots";
  } else {
    const areaLabel = activeArea !== "all" ? ` in ${activeArea}` : "";
    listTitle.textContent =
      activeFilter === "all" && activeArea === "all"
        ? "Tonight's heat"
        : `${activeCategory ? activeCategory.textContent.trim() : "Tonight"} picks${areaLabel}`;
  }

  const items = visiblePlaces();
  list.setAttribute("aria-busy", "false");

  if (items.length === 0) {
    list.innerHTML = `<p class="empty-state">${
      showSaved
        ? "No saved spots yet. Tap the bookmark on a card to save one."
        : "No spots in this vibe yet. Try another category or area."
    }</p>`;
    return;
  }

  list.innerHTML = items.map(cardMarkup).join("");
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
  const source = places.length ? places : [];
  placeSelect.innerHTML = source
    .map(
      (place) =>
        `<option value="${escapeHtml(place.id)}">${escapeHtml(place.name)} / ${escapeHtml(place.area)}</option>`,
    )
    .join("");
}

// --- Sheet + toast ---------------------------------------------------------

function openSheet(sheetEl) {
  sheetEl.classList.remove("hidden");
  backdrop.classList.remove("hidden");
}

function closeSheets() {
  reportSheet.classList.add("hidden");
  feedbackSheet.classList.add("hidden");
  claimSheet.classList.add("hidden");
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

function openDirections(place) {
  const query = encodeURIComponent(`${place.name}, ${place.area}, Dar es Salaam, Tanzania`);
  const isApple = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const url = isApple
    ? `https://maps.apple.com/?q=${query}`
    : `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  window.open(url, "_blank", "noopener");
}

// --- Saved route plans (separate from saved spots) -------------------------

function loadSavedRoutes() {
  try {
    return JSON.parse(localStorage.getItem("wapileo-saved") || "[]");
  } catch {
    return [];
  }
}

function saveRoutePlan(route) {
  try {
    const saved = loadSavedRoutes();
    if (!saved.some((item) => item.title === route.title)) {
      saved.push({ title: route.title, steps: route.steps });
      localStorage.setItem("wapileo-saved", JSON.stringify(saved));
    }
    showToast("Saved. This one has potential.");
  } catch {
    showToast("Saved for now.");
  }
}

// --- Reporting (shared via Supabase) --------------------------------------

function resetReportSelection() {
  selectedReport = { score: 72, label: "Kuna vibe" };
  selectedMusic = null;
  selectedEntry = null;
  crowdOptions.querySelectorAll("button").forEach((b) => {
    b.classList.remove("selected");
    b.setAttribute("aria-pressed", "false");
  });
  musicOptions.querySelectorAll("button").forEach((b) => {
    b.classList.remove("selected");
    b.setAttribute("aria-pressed", "false");
  });
  entryOptions.querySelectorAll("button").forEach((b) => {
    b.classList.remove("selected");
    b.setAttribute("aria-pressed", "false");
  });
  const initial = crowdOptions.querySelector('[data-label="Kuna vibe"]');
  if (initial) {
    initial.classList.add("selected");
    initial.setAttribute("aria-pressed", "true");
  }
}

async function submitVibeReport() {
  const placeId = placeSelect.value;
  const original = submitReport.textContent;
  submitReport.disabled = true;
  submitReport.textContent = "Inatuma...";

  try {
    const { error } = await supabase.from("vibe_reports").insert({
      place_id: placeId,
      score: selectedReport.score,
      label: selectedReport.label,
      music: selectedMusic,
      entry: selectedEntry,
    });
    if (error) throw new Error(error.message);

    await fetchPlaces();
    renderPlaces();
    renderPlaceOptions();
    closeSheets();
    showToast(`Vibe updated: ${selectedReport.label}. City inajua sasa.`);
  } catch (error) {
    console.warn("Report failed:", error);
    showToast("Haikutuma. Angalia mtandao, jaribu tena.");
  } finally {
    submitReport.disabled = false;
    submitReport.textContent = original;
  }
}

async function confirmPlace(placeId) {
  try {
    const { error } = await supabase.from("place_confirms").insert({ place_id: placeId });
    if (error) throw new Error(error.message);
    await fetchPlaces();
    renderPlaces();
    showToast("Confirmed. Still hot.");
  } catch (error) {
    console.warn("Confirm failed:", error);
    showToast("Haikuweza kuthibitisha. Jaribu tena.");
  }
}

async function submitFeedback() {
  const kind = document.querySelector("#feedbackKind").value;
  const message = document.querySelector("#feedbackMessage").value.trim();
  if (!message) {
    showToast("Andika kitu kidogo first.");
    return;
  }
  const btn = document.querySelector("#submitFeedback");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Inatuma...";
  try {
    const { error } = await supabase.from("feedback").insert({
      kind,
      message,
      page: window.location.pathname,
    });
    if (error) throw new Error(error.message);
    document.querySelector("#feedbackMessage").value = "";
    closeSheets();
    showToast("Asante! Feedback imefika.");
  } catch (error) {
    console.warn("Feedback failed:", error);
    showToast("Haikutuma. Jaribu tena.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function submitClaim() {
  const venueName = document.querySelector("#claimVenueName").value.trim();
  const contactName = document.querySelector("#claimContactName").value.trim();
  const contactPhone = document.querySelector("#claimContactPhone").value.trim();
  const eventTitle = document.querySelector("#claimEventTitle").value.trim();
  const eventDetails = document.querySelector("#claimEventDetails").value.trim();

  if (!venueName || !contactName || !contactPhone) {
    showToast("Jaza jina la venue, jina lako, na simu.");
    return;
  }
  const btn = document.querySelector("#submitClaim");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Inatuma...";
  try {
    const { error } = await supabase.from("venue_claims").insert({
      venue_name: venueName,
      contact_name: contactName,
      contact_phone: contactPhone,
      event_title: eventTitle || null,
      event_details: eventDetails || null,
    });
    if (error) throw new Error(error.message);
    ["#claimVenueName", "#claimContactName", "#claimContactPhone", "#claimEventTitle", "#claimEventDetails"].forEach(
      (sel) => (document.querySelector(sel).value = ""),
    );
    closeSheets();
    showToast("Asante! Tutakupatia soon.");
  } catch (error) {
    console.warn("Claim failed:", error);
    showToast("Haikutuma. Jaribu tena.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// --- Events ----------------------------------------------------------------

function exitSavedView() {
  if (!showSaved) return;
  showSaved = false;
  savedButton.classList.remove("active");
  savedButton.setAttribute("aria-pressed", "false");
}

document.querySelectorAll(".category").forEach((button) => {
  button.addEventListener("click", () => {
    exitSavedView();
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

document.querySelectorAll(".area-chip").forEach((button) => {
  button.addEventListener("click", () => {
    exitSavedView();
    const current = document.querySelector(".area-chip.active");
    if (current) {
      current.classList.remove("active");
      current.setAttribute("aria-pressed", "false");
    }
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
    activeArea = button.dataset.area;
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

document.querySelector("#openReport").addEventListener("click", () => {
  resetReportSelection();
  renderPlaceOptions();
  openSheet(reportSheet);
});
document.querySelector("#closeReport").addEventListener("click", closeSheets);
backdrop.addEventListener("click", closeSheets);
budgetSelect.addEventListener("change", renderRoute);
moodSelect.addEventListener("change", renderRoute);

feedbackButton.addEventListener("click", () => openSheet(feedbackSheet));
document.querySelector("#closeFeedback").addEventListener("click", closeSheets);
document.querySelector("#submitFeedback").addEventListener("click", submitFeedback);

document.querySelector("#claimVenue").addEventListener("click", () => openSheet(claimSheet));
document.querySelector("#closeClaim").addEventListener("click", closeSheets);
document.querySelector("#submitClaim").addEventListener("click", submitClaim);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSheets();
});

crowdOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  crowdOptions.querySelectorAll("button").forEach((option) => {
    option.classList.remove("selected");
    option.setAttribute("aria-pressed", "false");
  });
  button.classList.add("selected");
  button.setAttribute("aria-pressed", "true");
  selectedReport = { score: Number(button.dataset.score), label: button.dataset.label };
});

musicOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const pressed = button.getAttribute("aria-pressed") === "true";
  musicOptions.querySelectorAll("button").forEach((option) => {
    option.classList.remove("selected");
    option.setAttribute("aria-pressed", "false");
  });
  if (!pressed) {
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    selectedMusic = button.dataset.music;
  } else {
    selectedMusic = null;
  }
});

entryOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const pressed = button.getAttribute("aria-pressed") === "true";
  entryOptions.querySelectorAll("button").forEach((option) => {
    option.classList.remove("selected");
    option.setAttribute("aria-pressed", "false");
  });
  if (!pressed) {
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    selectedEntry = button.dataset.entry;
  } else {
    selectedEntry = null;
  }
});

submitReport.addEventListener("click", submitVibeReport);

document.addEventListener("click", (event) => {
  const bookmarkButton = event.target.closest("[data-bookmark]");
  if (bookmarkButton) {
    const nowSaved = toggleSavedPlace(bookmarkButton.dataset.bookmark);
    bookmarkButton.classList.toggle("saved", nowSaved);
    bookmarkButton.setAttribute("aria-pressed", String(nowSaved));
    showToast(nowSaved ? "Saved." : "Removed from saved.");
    if (showSaved) renderPlaces();
    return;
  }

  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    const place = places.find((item) => item.id === goButton.dataset.go);
    if (place) openDirections(place);
    return;
  }

  const confirmButton = event.target.closest("[data-confirm]");
  if (confirmButton) {
    confirmPlace(confirmButton.dataset.confirm);
    return;
  }

  const reportButton = event.target.closest("[data-report]");
  if (reportButton) {
    resetReportSelection();
    renderPlaceOptions();
    if (reportButton.dataset.report) placeSelect.value = reportButton.dataset.report;
    openSheet(reportSheet);
    return;
  }

  const shareButton = event.target.closest("[data-share]");
  if (shareButton) {
    const place = places.find((item) => item.id === shareButton.dataset.share);
    if (place) {
      shareText(
        `WapiLeo: ${place.name} (${place.area}) iko ${place.state} leo. ${place.line} Places, plans, and vibes for today.`,
      );
    }
    return;
  }

  if (event.target.closest("#shareRoute")) {
    const route = routes[budgetSelect.value][moodSelect.value];
    shareText(`WapiLeo date plan: ${route.steps.join(" -> ")}. Leo twende wapi?`);
    return;
  }

  if (event.target.closest("#saveRoute")) {
    saveRoutePlan(routes[budgetSelect.value][moodSelect.value]);
  }
});

document.querySelector("#cityButton").addEventListener("click", () => {
  showToast("Cities coming next: Arusha, Mwanza, Dodoma, Zanzibar.");
});

savedButton.addEventListener("click", () => {
  showSaved = !showSaved;
  savedButton.classList.toggle("active", showSaved);
  savedButton.setAttribute("aria-pressed", String(showSaved));
  renderPlaces();
  if (showSaved && savedPlaces.size === 0) {
    showToast("No saved spots yet. Tap the bookmark on a card to save one.");
  }
});

document.querySelector("#sortButton").addEventListener("click", () => {
  renderPlaces();
  showToast("Sorted moto first.");
});

// --- Init ------------------------------------------------------------------

resetReportSelection();
renderRoute();
renderSkeleton();

fetchPlaces()
  .then(() => {
    setOffline(false);
    renderPlaces();
    renderPlaceOptions();
  })
  .catch(async (error) => {
    console.warn("Live fetch failed, retrying once:", error);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await fetchPlaces();
      setOffline(false);
      renderPlaces();
      renderPlaceOptions();
    } catch (retryError) {
      console.warn("Live fetch failed after retry:", retryError);
      setOffline(true);
      list.setAttribute("aria-busy", "false");
      list.innerHTML = `<p class="empty-state">We couldn't reach the live feed. Tap "Report vibe" to add the first report for tonight.</p>`;
    }
  });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
