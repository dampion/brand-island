import "./style.css";
import {
  brands,
  categories,
  filterBrands,
  GROUP_SOURCE,
  escapeHtml as esc,
} from "./domain.ts";
import type { CategoryId, Filters } from "./types.ts";
import type { IslandScene } from "./scene.ts";

const icons: Record<string, string> = {
  expand:
    '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  tag: '<path d="M3 5h8l10 10-6 6L3 9z"/><circle cx="7" cy="8" r="1"/>',
  link: '<circle cx="5" cy="16" r="3"/><circle cx="19" cy="7" r="3"/><path d="M7 13c2-6 8-1 10-4"/>',
  layers: '<path d="m3 9 9-6 9 6-9 6zM3 14l9 6 9-6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  journal:
    '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h6m-6 4h6m-6 4h4"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 3v6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  pin: '<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2.5"/>',
};
function fillIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon!] || ""}</svg>`;
  });
}
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const filters: Filters = { search: "", categories: [], year: 2026 };
let selected: string | null = null;
let scene: IslandScene | undefined;
let relationTab = false;
let playingDay = false;
let dayMinutes = 720;
let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
let tourStep = -1;
let lastTrigger: HTMLElement | null = null;
const mobile = matchMedia("(max-width:760px)");
let initialMobile = mobile.matches;
const logEntries: { time: string; message: string }[] = [];
function announce(message: string) {
  $("announcement").textContent = message;
}
function activity(message: string) {
  logEntries.unshift({
    time: new Date().toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    message,
  });
  logEntries.splice(8);
  $("log-entries").innerHTML = logEntries
    .map((e) => `<li><time>${esc(e.time)}</time>${esc(e.message)}</li>`)
    .join("");
}
function setIndex(open: boolean) {
  $("index-panel").hidden = !open;
  $("index-toggle").setAttribute("aria-expanded", String(open));
}
function setToggle(id: string, on: boolean) {
  $(id).setAttribute("aria-pressed", String(on));
}
function renderDock() {
  $("category-dock").innerHTML =
    `<button data-category="all" aria-pressed="${!filters.categories.length}">全部美味 <span>${brands.length}</span></button>` +
    categories
      .map(
        (c) =>
          `<button data-category="${c.id}" aria-pressed="${filters.categories.includes(c.id)}" style="--category-color:${c.color}"><i></i>${c.name}</button>`,
      )
      .join("");
}
function renderList() {
  const visible = filterBrands(brands, filters);
  $("result-count").textContent =
    `${String(visible.length).padStart(2, "0")} / ${brands.length}`;
  $("brands-tab").setAttribute("aria-selected", String(!relationTab));
  $("relations-tab").setAttribute("aria-selected", String(relationTab));
  $("brand-list").setAttribute(
    "aria-labelledby",
    relationTab ? "relations-tab" : "brands-tab",
  );
  if (relationTab) {
    const b = brands.find((b) => b.id === selected);
    const c = categories.find((c) => c.id === b?.category);
    $("brand-list").innerHTML =
      `<div class="relation-summary"><h3>${b ? esc(b.name) + "的品牌關係" : "把美味，連起來。"}</h3><p>共同的故事，是同屬王品的品牌。料理分類則讓相似的美味彼此相遇。</p><div class="relation-row"><span>王品集團 → 台灣餐廳品牌</span><i>${brands.length} 個</i></div>${categories
        .filter((x) => !c || x.id === c.id)
        .map(
          (x) =>
            `<div class="relation-row"><span>${x.name} · 編輯分組</span><i>${brands.filter((b) => b.category === x.id).length} 品牌</i></div>`,
        )
        .join(
          "",
        )}<p style="margin-top:15px">地圖虛線：${b ? "此品牌與同料理類別品牌" : "集團與各品牌的歸屬"}。橋梁與人物僅為場景裝飾，不表示實際合作或物流。</p><a class="relation-source" href="${GROUP_SOURCE}" target="_blank" rel="noopener noreferrer">依據：集團品牌發展與版圖 ↗</a></div>`;
  } else
    $("brand-list").innerHTML = visible.length
      ? visible
          .map(
            (b) =>
              `<button class="brand-row${selected === b.id ? " active" : ""}" data-select="${b.id}" aria-label="探索${esc(b.name)}" aria-pressed="${selected === b.id}"><span class="row-number">${String(brands.indexOf(b) + 1).padStart(2, "0")}</span><span class="brand-icon" style="--brand-color:${b.color}">${esc(b.name === "12MINI" ? "12" : b.name.slice(0, 1))}</span><span class="row-text"><strong>${esc(b.name)}</strong><small>${esc(b.tagline)}</small></span><span class="row-arrow">↗</span></button>`,
          )
          .join("")
      : `<div class="empty-state">沒有符合條件的品牌。<br>試試其他料理，或重新探索全部美味。<button id="clear-filters">清除所有篩選 →</button></div>`;
  scene?.filter(visible.map((b) => b.id));
  renderDock();
}
function clearFilters() {
  filters.search = "";
  filters.categories = [];
  filters.year = 2026;
  ($("brand-search") as HTMLInputElement).value = "";
  ($("year-range") as HTMLInputElement).value = "2026";
  $("year-output").textContent = "2026";
  renderList();
}
function applyFilters() {
  const ids = filterBrands(brands, filters).map((b) => b.id);
  if (selected && selected !== "wowprime" && !ids.includes(selected))
    closeDetail(false);
  renderList();
  announce(`找到 ${ids.length} 個品牌`);
}
function setUrl(id: string | null) {
  const url = new URL(location.href);
  if (id) url.searchParams.set("brand", id);
  else url.searchParams.delete("brand");
  history.replaceState(null, "", url);
}
function selectBrand(id: string, updateUrl = true) {
  if (id !== "wowprime" && !brands.some((b) => b.id === id)) return;
  lastTrigger =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  selected = id;
  scene?.select(id);
  if (updateUrl) setUrl(id);
  if (mobile.matches) setIndex(false);
  const b = brands.find((b) => b.id === id);
  $("detail").hidden = false;
  if (!b) {
    $("detail-content").innerHTML =
      `<div class="detail-hero" style="--brand-color:#a7463d"><span class="giant-letter">王</span><div><div class="eyebrow">A FAMILY OF FLAVOURS</div><h2 id="detail-title">王品集團</h2></div></div><div class="detail-body"><div class="detail-category"><span class="category-tag">品牌島的中心</span><span>始於 1993</span></div><h3 class="detail-tagline">一起好好吃。</h3><p class="detail-description">從一份牛排開始，到鍋物、燒肉、鐵板與中日料理，王品以不同品牌陪伴各種相聚。沿著群島，找到屬於這一次相聚的美味。</p><div class="section-label">EXPLORE THE FAMILY</div><div class="related-brands">${categories.map((c) => `<button data-related-category="${c.id}">${c.name} ↗</button>`).join("")}</div><div class="detail-actions"><a href="https://www.wowprime.com/zh-tw/" target="_blank" rel="noopener noreferrer" class="main-action">前往集團官網 <span>↗</span></a><a href="${GROUP_SOURCE}" target="_blank" rel="noopener noreferrer">官方品牌版圖 <span>↗</span></a></div><p class="dish-note">本展示收錄集團品牌頁列示的 ${brands.length} 個台灣餐廳品牌。</p></div>`;
  } else {
    const c = categories.find((c) => c.id === b.category)!;
    const related = brands.filter(
      (x) => x.category === b.category && x.id !== b.id,
    );
    $("detail-content").innerHTML =
      `<div class="detail-hero" style="--brand-color:${b.color}"><span class="giant-letter">${esc(b.name.slice(0, 1))}</span><div><div class="eyebrow">${esc(b.english)}</div><h2 id="detail-title">${esc(b.name)}</h2></div></div><div class="detail-body"><div class="detail-category"><span class="category-tag">${c.name}</span><span>EST. ${b.founded} · TAIWAN</span></div><h3 class="detail-tagline">${esc(b.tagline)}</h3><p class="detail-description">${esc(b.description)}</p><div class="section-label">SIGNATURE TASTES · 三道招牌精選</div>${b.dishes.map((d, i) => `<div class="dish"><span>${String(i + 1).padStart(2, "0")}</span>${esc(d)}</div>`).join("")}<p class="dish-note">招牌精選依官方介紹／菜單整理，實際供應以門市與最新菜單為準。</p><div class="detail-actions">${b.reservation ? `<a class="main-action" href="${esc(b.reservation)}" target="_blank" rel="noopener noreferrer">線上訂位 <span>↗</span></a>` : ""}<a href="${esc(b.official)}" target="_blank" rel="noopener noreferrer" ${b.reservation ? "" : 'class="main-action"'}>${b.official.includes("facebook.com") ? "官方品牌專頁" : "品牌官網"} <span>↗</span></a>${b.menu ? `<a href="${esc(b.menu)}" target="_blank" rel="noopener noreferrer">官方菜單 <span>↗</span></a>` : ""}</div>${related.length ? `<div class="section-label">MORE TO DISCOVER · 同類美味</div><div class="related-brands">${related.map((x) => `<button data-select="${x.id}">${esc(x.name)} ↗</button>`).join("")}</div>` : ""}<details class="source-details"><summary>資料來源與核對日期</summary>${b.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>核對：${s.checkedAt} · ${s.method === "official-index" ? "集團列示品牌" : "品牌官方頁面"}</p>`).join("")}<p>本展示未提供即時價位、門市營業或訂位空位資訊。</p></details></div>`;
  }
  $("detail").scrollTop = 0;
  renderList();
  $("detail-close").focus({ preventScroll: true });
  announce(`已開啟${b?.name || "王品集團"}介紹`);
  activity(`正在探索${b?.name || "王品集團"}。`);
}
function closeDetail(restoreFocus = true) {
  selected = null;
  $("detail").hidden = true;
  setUrl(null);
  scene?.overview();
  setToggle("bird", false);
  renderList();
  if (restoreFocus) lastTrigger?.focus({ preventScroll: true });
}
function changeDay(value: number) {
  dayMinutes = value;
  const hr = Math.floor(value / 60),
    min = Math.floor(value % 60);
  $("clock").textContent =
    `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  ($("day-range") as HTMLInputElement).value = String(Math.floor(value));
  scene?.time(value);
}
function showTimePanel(history: boolean) {
  $("day-tab").setAttribute("aria-selected", String(!history));
  $("history-tab").setAttribute("aria-selected", String(history));
  $("day-panel").hidden = history;
  $("history-panel").hidden = !history;
}
function toggle(id: string, fn: (on: boolean) => void) {
  const on = $(id).getAttribute("aria-pressed") !== "true";
  setToggle(id, on);
  fn(on);
}
function startTour() {
  ($("guide") as HTMLDialogElement).close();
  clearFilters();
  setIndex(false);
  tourStep = 0;
  $("tour-bar").hidden = false;
  nextTour(false);
}
function nextTour(increment = true) {
  if (increment) tourStep++;
  if (tourStep >= categories.length) {
    endTour();
    return;
  }
  const c = categories[tourStep];
  const b = brands.find((b) => b.category === c.id)!;
  selectBrand(b.id);
  $("tour-caption").textContent =
    `${String(tourStep + 1).padStart(2, "0")} / 06　${c.name} · ${c.description}`;
  $("tour-next").textContent = tourStep === 5 ? "完成探索 ✓" : "下一站 →";
}
function endTour() {
  tourStep = -1;
  $("tour-bar").hidden = true;
  closeDetail(false);
  setIndex(!mobile.matches);
}
fillIcons();
$("total-count").textContent = String(brands.length);
$("guide").querySelector(".guide-number")!.textContent =
  `01 — ${brands.length}`;
renderList();
setIndex(!mobile.matches);
setToggle("pause", paused);
$("brand-search").addEventListener("input", (e) => {
  filters.search = (e.target as HTMLInputElement).value;
  applyFilters();
});
$("brand-list").addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-select]",
  );
  if (target) selectBrand(target.dataset.select!);
  if ((e.target as HTMLElement).closest("#clear-filters")) clearFilters();
});
$("detail-content").addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-select],[data-related-category]",
  );
  if (target?.dataset.select) {
    if (
      !filterBrands(brands, filters).some((b) => b.id === target.dataset.select)
    )
      clearFilters();
    selectBrand(target.dataset.select);
  } else if (target?.dataset.relatedCategory) {
    closeDetail(false);
    filters.categories = [target.dataset.relatedCategory as CategoryId];
    applyFilters();
    setIndex(true);
  }
});
$("category-dock").addEventListener("click", (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>("[data-category]");
  if (!t) return;
  const category = t.dataset.category!;
  if (category === "all") filters.categories = [];
  else {
    const id = category as CategoryId;
    filters.categories = filters.categories.includes(id)
      ? filters.categories.filter((x) => x !== id)
      : [...filters.categories, id];
  }
  applyFilters();
});
$("brands-tab").onclick = () => {
  relationTab = false;
  renderList();
};
$("relations-tab").onclick = () => {
  relationTab = true;
  setToggle("connections", true);
  scene?.connections(true);
  renderList();
};
$("overview").onclick = () => {
  if (tourStep >= 0) endTour();
  clearFilters();
  closeDetail(false);
};
$("index-toggle").onclick = () => setIndex($("index-panel").hidden);
$("index-close").onclick = () => setIndex(false);
$("detail-close").onclick = () => closeDetail();
$("names").onclick = () => toggle("names", (on) => scene?.names(on));
$("bird").onclick = () => toggle("bird", (on) => scene?.bird(on));
$("connections").onclick = () =>
  toggle("connections", (on) => scene?.connections(on));
$("pause").onclick = () =>
  toggle("pause", (on) => {
    paused = on;
    scene?.pause(on);
  });
$("log-toggle").onclick = () =>
  toggle("log-toggle", (on) => {
    $("scene-log").hidden = !on;
  });
$("log-close").onclick = () => {
  $("scene-log").hidden = true;
  setToggle("log-toggle", false);
};
$("day-range").addEventListener("input", (e) =>
  changeDay(Number((e.target as HTMLInputElement).value)),
);
$("year-range").addEventListener("input", (e) => {
  filters.year = Number((e.target as HTMLInputElement).value);
  $("year-output").textContent = String(filters.year);
  applyFilters();
});
$("year-reset").onclick = () => {
  filters.year = 2026;
  ($("year-range") as HTMLInputElement).value = "2026";
  $("year-output").textContent = "2026";
  applyFilters();
};
$("day-tab").onclick = () => showTimePanel(false);
$("history-tab").onclick = () => showTimePanel(true);
$("day-play").onclick = () => {
  playingDay = !playingDay;
  setToggle("day-play", playingDay);
  $("day-play").setAttribute(
    "aria-label",
    playingDay ? "暫停場景日夜" : "播放場景日夜",
  );
  $("day-play").innerHTML =
    `<span data-icon="${playingDay ? "pause" : "play"}"></span>`;
  fillIcons($("day-play"));
};
const guide = $("guide") as HTMLDialogElement;
function openGuide() {
  guide.showModal();
}
function closeGuide() {
  guide.close();
  try {
    localStorage.setItem("brand-island-onboarded", "1");
  } catch {}
}
$("help").onclick = openGuide;
$("guide-close").onclick = closeGuide;
$("guide-start").onclick = closeGuide;
$("tour-start").onclick = () => {
  closeGuide();
  startTour();
};
$("tour-next").onclick = () => nextTour();
$("tour-exit").onclick = endTour;
$("about").onclick = () => ($("about-dialog") as HTMLDialogElement).showModal();
$("about-close").onclick = () =>
  ($("about-dialog") as HTMLDialogElement).close();
for (const dialog of [guide, $("about-dialog") as HTMLDialogElement]) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
    if (tourStep >= 0) endTour();
    else if (!$("detail").hidden) closeDetail();
    else if (mobile.matches) setIndex(false);
  }
  if (
    e.key === "/" &&
    !(e.target instanceof HTMLInputElement) &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    setIndex(true);
    $("brand-search").focus();
  }
});
mobile.addEventListener("change", () => {
  if (initialMobile !== mobile.matches) {
    initialMobile = mobile.matches;
    setIndex(!mobile.matches);
  }
});
setInterval(() => {
  if (
    playingDay &&
    !paused &&
    !document.hidden &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    changeDay((dayMinutes + 5) % 1440);
}, 500);
activity("品牌島準備好了，選一座小島開始探索。");
async function init() {
  try {
    const { IslandScene } = await import("./scene.ts");
    scene = new IslandScene($("stage"), { select: selectBrand, activity });
    scene.pause(paused);
    scene.time(dayMinutes);
    scene.filter(filterBrands(brands, filters).map((b) => b.id));
  } catch (error) {
    console.warn("3D 場景不可用，使用完整品牌清單。", error);
    $("map-hint").innerHTML = "此裝置無法啟用 3D，仍可從品牌清單探索所有美味。";
    $("map-hint").classList.add("fallback-hint");
    setIndex(true);
    for (const id of ["names", "bird", "connections", "pause"])
      ($(id) as HTMLButtonElement).disabled = true;
  }
  $("loading").hidden = true;
  const id = new URL(location.href).searchParams.get("brand");
  if (id) {
    if (id === "wowprime" || brands.some((b) => b.id === id))
      selectBrand(id, false);
    else {
      setUrl(null);
      announce("找不到此品牌，請從清單選擇。");
    }
  } else {
    try {
      if (!localStorage.getItem("brand-island-onboarded")) openGuide();
    } catch {}
  }
}
for (const container of document.querySelectorAll<HTMLElement>(
  '[role="tablist"]',
)) {
  container.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [
      ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    tabs[next].focus();
    tabs[next].click();
  });
}
void init();
