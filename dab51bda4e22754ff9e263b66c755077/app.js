/* Cây từ vựng IELTS — Ms Trang Trieu Education. Chương trình riêng cho toàn bộ học viên IELTS (không gắn với bài Reading nào).
   - Danh sách từ: file "IELTS READING - VOCABULARY" của cô (Model, Reading 1–6) + bổ sung Reading 7–10 → data.js (RT_UNITS), theo thứ tự chặng.
   - Mỗi lần tưới: từ cũ đến hạn (tối đa REVIEW_MAX) + từ mới gieo tự động theo thứ tự danh sách (NEW_PER_SESSION, tối đa 1 lượt/ngày; có nút gieo thêm).
   - Nhịp bắt buộc: ít nhất RHYTHM_DAYS (2) ngày tưới 1 lần. Quá hạn → cây héo, bảng theo dõi của cô ghi "trễ N ngày".
   - Ôn ngắt quãng (Leitner): đúng đúng hạn → lên hộp, ôn lại sau 1 → 3 → 7 → 14 → 30 ngày; sai → về hộp 0, ôn lại hôm sau.
   - Dạng bài khó dần: làm quen thẻ từ → chọn nghĩa → chọn từ theo nghĩa → điền từ vào câu của bài đọc → tự gõ từ.
   - Lưu trong máy + đồng bộ về Apps Script (Nền tảng IELTS · CayTuVungReading.gs) theo họ tên + lớp. */
(() => {
"use strict";
const C = Object.assign({ CLASSES: [], API: "", NEW_PER_SESSION: 10, EXTRA: 5, NEW_MAX_DAY: 20, REVIEW_MAX: 20, RHYTHM_DAYS: 2 }, window.RT_CONFIG || {});
const U = window.RT_UNITS || [];
const app = document.getElementById("app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2800); }
const dayNow = () => Math.floor((Date.now() + 7 * 3600e3) / 864e5);   // ngày theo giờ Việt Nam
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dateOf = d => new Date(d * 864e5);   // 00:00 UTC của ngày VN d → getUTC* cho đúng ngày
const dm = d => { const x = dateOf(d); return String(x.getUTCDate()).padStart(2, "0") + "/" + String(x.getUTCMonth() + 1).padStart(2, "0"); };
const dmy = d => dm(d) + "/" + dateOf(d).getUTCFullYear();
const wd = d => WD[dateOf(d).getUTCDay()];

/* ---------- từ ---------- */
const W = {}, ORDER = [], STAGE_OF = {};
U.forEach((u, i) => u.words.forEach(w => { w.u = i; W[w.id] = w; ORDER.push(w.id); }));
const TOTAL = ORDER.length, ORD = {}; ORDER.forEach((id, i) => { ORD[id] = i; });
/* Chặng = 1 đề (Model, Reading 1 … Reading 10), mỗi chặng gồm các passage. */
const STAGES = [];
U.forEach((u, i) => { const s = { t: i + 1, name: u.label || "Chặng " + (i + 1), units: [i], ids: [] }; STAGES.push(s); u.words.forEach(w => { s.ids.push(w.id); STAGE_OF[w.id] = STAGES.length - 1; }); });

/* ---------- học sinh + trạng thái ---------- */
let student = store.get("rt-student");
let AUTO = { go: false, focus: "" };
try {   // mở từ dashboard lớp: ?name=…&cls=… (họ tên + lớp của học sinh đang xem)
  const q = new URLSearchParams(location.search), qn = (q.get("name") || "").replace(/\s+/g, " ").trim(), qc = (q.get("cls") || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (qn.length >= 5 && (window.RT_CONFIG && window.RT_CONFIG.CLASSES || []).indexOf(qc) >= 0) { student = { name: qn, cls: qc }; store.set("rt-student", student); }
  AUTO = { go: q.get("go") === "1", focus: q.get("focus") || "" };   // từ Vườn từ vựng: tưới ngay / luyện riêng 1 từ
  if (location.search) history.replaceState(null, "", location.pathname);
} catch (e) {}
if (student && (!student.name || C.CLASSES.indexOf(student.cls) < 0)) student = null;
const keyOf = s => "rt-state:" + s.name.toUpperCase() + "|" + s.cls;
let S = null;
/* w[id] = [hộp, ngày đến hạn, số lần sai, ngày gieo]; days[ngày] = 1 khi tưới xong; lw = ngày tưới gần nhất; n = số lần tưới; x[ngày] = số từ gieo thêm. */
const blank = () => ({ v: 2, t: 0, w: {}, days: {}, lw: 0, n: 0, x: {} });
function migrate(o) {
  if (!o || typeof o !== "object") return blank();
  if (o.v === 2) { const s = Object.assign(blank(), o); Object.keys(s.w).forEach(id => { if (!W[id]) delete s.w[id]; }); return s; }
  /* bản cũ (cây theo bài Reading): giữ tiến độ những từ cũng có trong danh sách mới */
  const s = blank(); s.t = +o.t || 0; s.days = o.days || {};
  Object.keys(o.words || {}).forEach(old => { const id = old.replace(/^[A-Z0-9]+-/, ""), w = o.words[old]; if (W[id] && w && w.s && !s.w[id]) s.w[id] = [+w.b || 0, +w.d || dayNow(), +w.m || 0, +w.s]; });
  const ds = Object.keys(s.days).map(Number).filter(Boolean); s.lw = ds.length ? Math.max.apply(null, ds) : 0; s.n = ds.length;
  return s;
}
function loadLocal() { S = migrate(student && store.get(keyOf(student))); }
function save() { S.t = Date.now(); store.set(keyOf(student), S); push(); }
let pushT = null, dirty = false;
function body() { const b = buckets(); return JSON.stringify({ action: "rt_save", name: student.name, cls: student.cls, state: S,
  sum: { words: Object.keys(S.w).length, due: b.due, grow: b.grow, sure: b.sure, fruit: b.fruit, passages: stagesDone(), streak: rhythmStreak() } }); }
function flush(beacon) {
  if (!C.API || !dirty || !student) return; clearTimeout(pushT); dirty = false;
  if (beacon && navigator.sendBeacon) { try { if (navigator.sendBeacon(C.API, new Blob([body()], { type: "text/plain;charset=utf-8" }))) return; } catch (e) {} }
  fetch(C.API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body(), keepalive: true }).catch(() => { dirty = true; });
}
function push() { if (!C.API) return; dirty = true; clearTimeout(pushT); pushT = setTimeout(() => flush(false), 800); }
addEventListener("pagehide", () => flush(true));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(true); });
async function pull() {
  if (!C.API) return false;
  try {
    const u = new URL(C.API); u.searchParams.set("action", "rt"); u.searchParams.set("name", student.name); u.searchParams.set("cls", student.cls); u.searchParams.set("t", Date.now());
    const j = await fetch(u.href).then(r => r.json());
    if (j && j.ok && j.state && (+j.state.t || 0) > (+S.t || 0)) { S = migrate(j.state); store.set(keyOf(student), S); return true; }
  } catch (e) {}
  return false;
}

/* ---------- lịch ôn ---------- */
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
function grade(id, ok) {
  const d = dayNow(); let w = S.w[id];
  if (!w) { S.w[id] = ok ? [1, d + 1, 0, d, 1] : [0, d + 1, 1, d, 0]; return; }   // từ mới: lần đầu gặp; [4] = số lần đúng (Vườn từ vựng trên dashboard)
  if (w[4] == null) w[4] = w[0];
  if (!ok) { w[0] = 0; w[1] = d + 1; w[2]++; return; }
  w[4]++;
  if (w[1] > d) return;   // làm lại trong ngày không tính lên hộp
  w[0] = Math.min(5, w[0] + 1); w[1] = d + BOX_DAYS[w[0]];
}
const sownToday = () => Object.values(S.w).filter(w => w[3] === dayNow()).length;
const nextNew = n => { const out = []; for (let i = 0; i < ORDER.length && out.length < n; i++) if (!S.w[ORDER[i]]) out.push(ORDER[i]); return out; };
function plan() {
  const d = dayNow();
  const due = Object.keys(S.w).filter(id => S.w[id][1] <= d).sort((a, b) => S.w[a][1] - S.w[b][1] || S.w[b][2] - S.w[a][2] || ORD[a] - ORD[b]).slice(0, C.REVIEW_MAX);
  const fresh = nextNew(Math.max(0, C.NEW_PER_SESSION - sownToday()));
  return { due, fresh };
}
function buckets() {
  const d = dayNow(), b = { due: 0, grow: 0, sure: 0, fruit: 0 };
  Object.values(S.w).forEach(w => { if (w[1] <= d) b.due++; else if (w[0] >= 4) b.fruit++; else if (w[0] >= 3) b.sure++; else b.grow++; });
  return b;
}
const stagesDone = () => STAGES.filter(s => s.ids.every(id => S.w[id])).length;
/* nhịp tưới */
function rhythm() {
  const d = dayNow(), lw = +S.lw || 0;
  if (!lw) return { k: "new", due: d, late: 0 };
  const due = lw + C.RHYTHM_DAYS;
  if (lw === d) return { k: "done", due, late: 0 };
  if (d <= due) return { k: d === due ? "today" : "ok", due, late: 0 };
  return { k: "late", due, late: d - due };
}
function rhythmStreak() {   // số lần tưới liên tiếp không để quá hạn (tính ngược từ lần gần nhất)
  const ds = Object.keys(S.days).map(Number).filter(Boolean).sort((a, b) => b - a);
  if (!ds.length || dayNow() - ds[0] > C.RHYTHM_DAYS) return 0;
  let n = 1; for (let i = 1; i < ds.length && ds[i - 1] - ds[i] <= C.RHYTHM_DAYS; i++) n++;
  return n;
}
function finishDate() {   // tưới đều 2 ngày/lần, mỗi lần NEW_PER_SESSION từ mới
  const left = TOTAL - Object.keys(S.w).length; if (left <= 0) return 0;
  return dayNow() + Math.ceil(left / C.NEW_PER_SESSION) * C.RHYTHM_DAYS - (S.lw === dayNow() ? 0 : C.RHYTHM_DAYS);
}

/* ---------- cây ---------- */
const TREE_STAGES = ["Hạt giống", "Mầm non", "Cây con", "Cây non", "Cây lớn", "Cây sai quả"], STAGE_AT = [0, 0, 0.06, 0.25, 0.5, 0.8];
function level() { const nW = Object.keys(S.w).length; if (!nW) return 0; const b = buckets(), p = (b.sure + b.fruit) / TOTAL; let k = 1; while (k < 5 && p >= STAGE_AT[k + 1]) k++; return k; }
function rnd(seed) { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
const f1 = n => (+n).toFixed(1);
function treeSvg(wilt) {
  const id = "th", b = buckets(), nW = Object.keys(S.w).length, cats0 = { due: b.due, grow: b.grow, sure: b.sure, fruit: b.fruit };
  const L1 = wilt ? "#d9b65c" : "#4ade80", L2 = wilt ? "#e6c97a" : "#86efac", L3 = wilt ? "#f1dea0" : "#bbf7d0", G1 = wilt ? "#c9d79a" : "#86efac", G2 = wilt ? "#a8c27a" : "#4ade80";
  const X = 170, G = 186;
  let s = '<svg class="tree' + (wilt ? " wilt" : "") + '" viewBox="0 0 340 210" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Cây từ vựng của em">' +
    '<defs><radialGradient id="' + id + 'sun"><stop offset="0" stop-color="#fef3c7"/><stop offset=".45" stop-color="#fde68a" stop-opacity=".9"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="' + id + 'tk" x1="0" x2="1"><stop offset="0" stop-color="#7c4a21"/><stop offset=".5" stop-color="#a86b36"/><stop offset="1" stop-color="#7c4a21"/></linearGradient>' +
    '<radialGradient id="' + id + 'fr" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fda4af"/><stop offset=".5" stop-color="#f43f5e"/><stop offset="1" stop-color="#dc2626"/></radialGradient>' +
    '<radialGradient id="' + id + 'bd" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#bae6fd"/><stop offset=".6" stop-color="#38bdf8"/><stop offset="1" stop-color="#0284c7"/></radialGradient>' +
    '<path id="' + id + 'lf" d="M0 0C3-4 9-4.6 13 0C9 4.6 3 4 0 0Z"/></defs>' +
    '<circle cx="292" cy="40" r="34" fill="url(#' + id + 'sun)"/><circle cx="292" cy="40" r="13" fill="#fcd34d"/>' +
    '<g class="cloud c1" fill="#fff" opacity=".95"><ellipse cx="62" cy="40" rx="22" ry="9"/><circle cx="54" cy="35" r="9"/><circle cx="68" cy="31" r="11"/></g>' +
    '<g class="cloud c2" fill="#fff" opacity=".85"><ellipse cx="222" cy="26" rx="16" ry="6.5"/><circle cx="216" cy="22" r="6.5"/><circle cx="227" cy="19" r="8"/></g>' +
    '<path d="M0 168C55 150 120 154 178 166S286 152 340 160V210H0Z" fill="' + G1 + '"/><path d="M0 188C60 174 128 178 186 186S290 176 340 182V210H0Z" fill="' + G2 + '"/>';
  [[22, 176, 9], [96, 182, 7], [250, 180, 8], [322, 178, 7]].forEach(([x, y, r]) => { s += '<circle cx="' + (x - r * 0.7) + '" cy="' + (y + 2) + '" r="' + (r * 0.7) + '" fill="' + (wilt ? "#b5c47e" : "#22c55e") + '"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (wilt ? "#c8d38f" : "#34d399") + '"/><circle cx="' + (x + r * 0.8) + '" cy="' + (y + 2) + '" r="' + (r * 0.65) + '" fill="' + (wilt ? "#b5c47e" : "#22c55e") + '"/>'; });
  if (!nW) return s + '<ellipse cx="' + X + '" cy="' + (G + 1) + '" rx="16" ry="4.5" fill="#a16207" opacity=".55"/><path d="M' + X + " " + G + " C" + X + " " + (G - 10) + " " + (X - 1) + " " + (G - 16) + " " + X + " " + (G - 22) + '" stroke="#65a30d" stroke-width="2.6" fill="none" stroke-linecap="round"/><use href="#' + id + 'lf" fill="#84cc16" transform="translate(' + X + " " + (G - 22) + ') rotate(205) scale(1.15)"/><use href="#' + id + 'lf" fill="#65a30d" transform="translate(' + X + " " + (G - 21) + ') rotate(-30) scale(1.05)"/></svg>';
  const sc = 0.6 + 0.4 * Math.min(1, Math.sqrt(nW / TOTAL)), TH = 60 * sc, top = G - TH, R = 80 * sc, RV = 62 * sc, cy = top - RV * 0.45;
  s += '<path d="M' + f1(X - 12 * sc) + " " + G + "C" + f1(X - 5 * sc) + " " + f1(G - 8 * sc) + " " + f1(X - 4.5 * sc) + " " + f1(G - 34 * sc) + " " + f1(X - 4 * sc) + " " + f1(top) + "L" + f1(X + 4 * sc) + " " + f1(top) + "C" + f1(X + 4.5 * sc) + " " + f1(G - 34 * sc) + " " + f1(X + 5 * sc) + " " + f1(G - 8 * sc) + " " + f1(X + 12 * sc) + " " + G + "Q" + X + " " + (G + 3) + " " + f1(X - 12 * sc) + " " + G + 'Z" fill="url(#' + id + 'tk)"/>';
  const br = (dx, dy, c1x, c1y) => '<path d="M' + X + " " + f1(top + 10 * sc) + "Q" + f1(X + c1x * sc) + " " + f1(top + c1y * sc) + " " + f1(X + dx * sc) + " " + f1(top + dy * sc) + '" stroke="url(#' + id + 'tk)" stroke-width="' + f1(4.2 * sc) + '" fill="none" stroke-linecap="round"/>';
  s += br(-34, -26, -8, -6) + br(34, -24, 8, -4) + br(2, -38, 1, -16);
  const blob = (pts, fill) => pts.map(([a, b2, r]) => '<circle cx="' + f1(X + a * R) + '" cy="' + f1(cy + b2 * RV) + '" r="' + f1(r * R) + '" fill="' + fill + '"/>').join("");
  s += '<g class="crown">' + blob([[-0.62, 0.22, 0.42], [0.62, 0.22, 0.42], [-0.34, -0.3, 0.48], [0.34, -0.3, 0.48], [0, -0.52, 0.46], [0, 0.18, 0.56], [-0.7, -0.05, 0.36], [0.7, -0.05, 0.36]], L1);
  s += blob([[-0.5, 0.08, 0.38], [0.48, 0.1, 0.38], [-0.24, -0.34, 0.4], [0.28, -0.32, 0.38], [0, -0.04, 0.48]], L2);
  s += blob([[-0.34, -0.42, 0.22], [-0.56, -0.08, 0.16], [0.06, -0.6, 0.16]], L3) + "</g>";
  const M = Math.min(nW, Math.round(12 + 52 * sc * sc)), cats = Object.entries(cats0);
  const cnt = cats.map(([k, n]) => ({ k, n, m: n ? Math.max(1, Math.floor(n / nW * M)) : 0 }));
  let left = M - cnt.reduce((a, c) => a + c.m, 0); cnt.slice().sort((a, c) => (c.n / nW * M % 1) - (a.n / nW * M % 1)).forEach(c => { if (left > 0 && c.n) { c.m++; left--; } });
  const seq = []; cnt.forEach(c => { for (let q = 0; q < c.m; q++) seq.push(c.k); });
  const order = seq.map((k, q) => [k, rnd(q * 13.7 + seq.length)]).sort((a, c) => a[1] - c[1]).map(x => x[0]);
  let marks = "";
  order.forEach((k, q) => {
    const r = Math.sqrt((q + 0.6) / order.length), th = q * 2.39996 + 0.4, x = X + r * R * 0.9 * Math.cos(th), y = cy - RV * 0.06 + r * RV * 0.82 * Math.sin(th), dl = ' style="animation-delay:' + (q * 18) + 'ms"';
    if (k === "fruit") marks += '<g class="mk"' + dl + '><path d="M' + f1(x) + " " + f1(y - 3.6) + 'q.6-2.6 2.6-3.4" stroke="#7c4a21" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="4" fill="url(#' + id + 'fr)"/><circle cx="' + f1(x - 1.4) + '" cy="' + f1(y - 1.4) + '" r="1.1" fill="#fff" opacity=".9"/></g>';
    else if (k === "due") marks += '<g class="mk"' + dl + '><path d="M' + f1(x) + " " + f1(y - 4.6) + "C" + f1(x - 1.4) + " " + f1(y - 2) + " " + f1(x - 3) + " " + f1(y - 0.6) + " " + f1(x - 3) + " " + f1(y + 1) + "a3 3 0 0 0 6 0c0-1.6-1.6-3-3-5.6Z" + '" fill="url(#' + id + 'bd)"/></g>';
    else marks += '<use class="mk"' + dl + ' href="#' + id + 'lf" fill="' + (wilt ? (k === "sure" ? "#b7791f" : "#d69e2e") : (k === "sure" ? "#10b981" : "#84cc16")) + '" transform="translate(' + f1(x - 4) + " " + f1(y) + ") rotate(" + Math.round(rnd(q * 3.3) * 120 - 60) + ") scale(" + (k === "sure" ? 0.78 : 0.62) + ')"/>';
  });
  if (wilt) [[X - 40, G - 4], [X + 30, G - 2], [X + 52, G - 6]].forEach(([x, y], q) => { marks += '<use href="#' + id + 'lf" fill="#c08a3e" transform="translate(' + x + " " + y + ") rotate(" + (q * 70 + 20) + ') scale(.7)"/>'; });
  return s + marks + "</svg>";
}
const ICONS = {
  due: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3.5C10.6 8.6 7.5 12.2 7.5 16.2a6.5 6.5 0 0 0 13 0c0-4-3.1-7.6-6.5-12.7Z" fill="#0ea5e9"/><path d="M11 15.5a3.4 3.4 0 0 0 2.4 3.6" stroke="#e0f2fe" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  grow: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 24V13" stroke="#4d7c0f" stroke-width="2.2" stroke-linecap="round"/><path d="M14 14C13.6 9 9.8 6.6 5 7c.2 4.9 3.8 7.6 9 7Z" fill="#65a30d"/><path d="M14 12.5c.6-4.6 4.3-7 9-6.4-.4 4.6-4 7-9 6.4Z" fill="#84cc16"/></svg>',
  sure: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23C5 12 11 5 23 4c.4 11.6-6 18.6-18 19Z" fill="#059669"/><path d="M6 22C10 16 14 12 20 7.5" stroke="#a7f3d0" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>',
  fruit: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 4c-.4 4-2.6 8-5.6 11M14 4c1 4 3.2 7.6 6.2 10.6" stroke="#7c4a21" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="8.6" cy="18.6" r="5" fill="#e11d48"/><circle cx="19.8" cy="18.2" r="5" fill="#e11d48"/><circle cx="7" cy="17" r="1.4" fill="#fff" opacity=".85"/></svg>'
};

/* ---------- khung ---------- */
function shell(html, cls) {
  document.body.className = cls || ""; app.innerHTML = html; window.scrollTo(0, 0);
  const who = document.getElementById("who");
  if (student) { who.hidden = false; who.textContent = student.name + " · " + student.cls; who.onclick = () => { if (confirmLeave()) entry(home); }; } else who.hidden = true;
}
let inReview = false;
const confirmLeave = () => !inReview || window.confirm("Em đang tưới dở. Thoát ra thì lượt này chưa được tính — vẫn thoát?");
function entry(then) {
  shell('<section class="card narrow entry"><div class="sprout" aria-hidden="true">🌱</div><span class="kick">Ms Trang Trieu Education · IELTS</span><h1>Cây từ vựng IELTS</h1>' +
    '<p class="muted">Mỗi lần tưới chỉ 5–7 phút: ôn từ cũ đến hạn và gieo thêm từ mới. <b>Ít nhất 2 ngày tưới 1 lần</b> để cây không héo.</p>' +
    '<form id="ef" novalidate><label class="field"><span>Họ và tên</span><input id="en" autocomplete="name" maxlength="80" placeholder="Nhập đầy đủ họ tên" value="' + esc(student ? student.name : "") + '"></label>' +
    '<label class="field"><span>Lớp</span><select id="ec"><option value="">Chọn lớp</option>' + C.CLASSES.map(c => "<option" + (student && student.cls === c ? " selected" : "") + ">" + esc(c) + "</option>").join("") + "</select></label>" +
    '<p class="err" id="ee"></p><button class="btn primary block" type="submit">Vào cây của em ➔</button></form>' +
    '<p class="small muted" style="margin:12px 0 0">Nhập đúng họ tên và lớp như các bài khác để cô theo dõi được; mở trên máy khác vẫn còn cây.</p></section>', "page-entry");
  document.getElementById("ef").onsubmit = async ev => {
    ev.preventDefault();
    const name = document.getElementById("en").value.replace(/\s+/g, " ").trim(), cls = document.getElementById("ec").value, ee = document.getElementById("ee");
    if (name.split(" ").length < 2 || name.length < 5) { ee.textContent = "Em nhập đầy đủ họ và tên nhé."; return; }
    if (C.CLASSES.indexOf(cls) < 0) { ee.textContent = "Em chọn lớp của mình nhé."; return; }
    const b = ev.target.querySelector("button"); b.disabled = true; b.textContent = "Đang mở cây…";
    student = { name, cls }; store.set("rt-student", student); loadLocal(); await pull(); then();
  };
}

/* ---------- trang chủ ---------- */
function rhythmChip(r) {
  if (r.k === "new") return '<span class="chip info">🌱 Bắt đầu gieo hôm nay</span>';
  if (r.k === "done") return '<span class="chip ok">✓ Đã tưới hôm nay</span>';
  if (r.k === "today") return '<span class="chip warn">⏰ Hạn tưới: hôm nay</span>';
  if (r.k === "ok") return '<span class="chip ok">💧 Hạn tưới: ' + wd(r.due) + " " + dm(r.due) + "</span>";
  return '<span class="chip bad">🥀 Cây đang héo · trễ ' + r.late + " ngày</span>";
}
function home() {
  inReview = false;
  const d = dayNow(), r = rhythm(), b = buckets(), nW = Object.keys(S.w).length, k = level(), L = plan(), n = L.due.length + L.fresh.length, wilt = r.k === "late";
  const first = esc(student.name.split(" ").pop()), st = rhythmStreak(), fin = finishDate();
  const tile = (kk, v, lab) => '<div class="tt ' + kk + '">' + ICONS[kk] + "<div><b>" + v + "</b><small>" + lab + "</small></div></div>";
  const mins = Math.max(2, Math.round(L.due.length * 0.2 + L.fresh.length * 0.45));
  const btn = n ? '<button class="btn water" id="go"><span class="wt">💧 Tưới cây</span><span class="ws">' + (L.due.length ? L.due.length + " từ ôn" : "") + (L.due.length && L.fresh.length ? " + " : "") + (L.fresh.length ? L.fresh.length + " từ mới" : "") + " · ~" + mins + " phút</span></button>"
    : nW < TOTAL ? '<div class="watered"><b>✓ Hôm nay cây đã được tưới đủ</b><span>Lần tới: ' + (r.due ? "trước hết ngày " + wd(r.due) + " " + dm(r.due) : "ngày mai") + '</span><button class="btn ghost sm" id="more">+ Gieo thêm ' + C.EXTRA + " từ mới</button></div>"
    : '<div class="watered"><b>🏆 Em đã gieo hết ' + TOTAL + " từ!</b><span>Tiếp tục tưới đều để các từ ra quả.</span></div>";
  const msg = r.k === "late" ? "Cây đã quá hạn tưới " + r.late + " ngày. Tưới ngay hôm nay để cây xanh lại nhé!" : r.k === "new" ? "Chào " + first + "! Bấm Tưới cây để gieo những hạt từ đầu tiên." : r.k === "today" ? "Hôm nay là hạn tưới — dành 5 phút cho cây nhé." : "Chào " + first + "! Cây đang lớn đều.";
  /* nhịp tưới: 14 ngày gần nhất */
  let strip = ""; for (let i = 13; i >= 0; i--) { const x = d - i, on = !!S.days[x]; strip += '<span class="dd' + (on ? " on" : "") + (x === d ? " today" : "") + '" title="' + wd(x) + " " + dm(x) + (on ? " · đã tưới" : "") + '"><i>' + (on ? "💧" : "") + "</i><small>" + (x === d ? "Nay" : wd(x)) + "</small></span>"; }
  /* hành trình */
  const stageRow = (s, i) => {
    const sown = s.ids.filter(id => S.w[id]).length, sure = s.ids.filter(id => S.w[id] && S.w[id][0] >= 3).length, all = s.ids.length;
    const state = sown === all ? "done" : sown ? "now" : (i === 0 || STAGES[i - 1].ids.every(id => S.w[id])) ? "next" : "lock";
    const titles = s.ids.slice(0, 5).map(id => W[id].w).join(" · ") + " …";
    return '<li class="stg ' + state + '"><span class="dot">' + (state === "done" ? "✓" : state === "lock" ? "🔒" : s.t) + '</span><div class="sx"><div class="sh"><b>' + esc(s.name) + "</b><small>" + sown + "/" + all + " từ</small></div>" +
      '<p class="st">' + esc(titles) + "</p>" + '<div class="bar2"><i class="a" style="width:' + Math.round(sown / all * 100) + '%"></i><i class="b" style="width:' + Math.round(sure / all * 100) + '%"></i></div></div></li>';
  };
  const pctSown = Math.round(nW / TOTAL * 100), pctSure = Math.round((b.sure + b.fruit) / TOTAL * 100);
  shell('<div class="cols"><div class="left">' +
    '<section class="card hero' + (wilt ? " wilted" : "") + '"><div class="hhead"><div><span class="kick">Cây từ vựng IELTS</span><h1>' + TREE_STAGES[k] + ' <span class="lvl">Cấp ' + k + "/5</span></h1></div>" + rhythmChip(r) + "</div>" +
    '<div class="scene">' + treeSvg(wilt) + "</div>" +
    '<p class="hmsg">' + msg + "</p>" + btn +
    '<div class="trtiles">' + tile("due", b.due, "Cần ôn") + tile("grow", b.grow, "Đang lớn") + tile("sure", b.sure, "Nhớ chắc") + tile("fruit", b.fruit, "Ra quả") + "</div></section>" +
    '<section class="card rhythm"><div class="rh"><h2>Nhịp tưới</h2><span class="rule">Ít nhất <b>2 ngày</b> tưới 1 lần</span></div><div class="strip">' + strip + "</div>" +
    '<div class="rfoot"><span>' + (st ? "🔥 <b>" + st + "</b> lần tưới liên tiếp đúng nhịp" : "Chưa có chuỗi đúng nhịp — tưới hôm nay để bắt đầu") + "</span><span>Đã tưới <b>" + (S.n || 0) + "</b> lần</span></div></section>" +
    '</div><div class="right">' +
    '<section class="card journey"><div class="rh"><h2>Hành trình ' + TOTAL + ' từ</h2><span class="rule">' + pctSown + "% đã gieo</span></div>" +
    '<div class="bigbar"><i class="a" style="width:' + pctSown + '%"></i><i class="b" style="width:' + pctSure + '%"></i></div>' +
    '<div class="legend"><span><i class="la"></i>Đã gieo ' + nW + '</span><span><i class="lb"></i>Nhớ chắc ' + (b.sure + b.fruit) + "</span>" + (fin ? "<span>🏁 Dự kiến gieo hết: <b>" + dmy(fin) + "</b></span>" : "") + "</div>" +
    '<ol class="stages">' + STAGES.map(stageRow).join("") + "</ol>" +
    '<p class="small muted" style="margin:10px 0 0">Từ vựng dùng chung cho mọi kỹ năng — lấy từ các bài đọc và bài viết mẫu của cô — gieo tự động theo thứ tự từng chặng.</p></section>' +
    (nW ? '<section class="card"><div class="rh"><h2>Sổ từ của em</h2><span class="rule">' + nW + ' từ</span></div><div class="filters" id="ff">' +
      [["all", "Tất cả"], ["due", "Cần ôn"], ["grow", "Đang lớn"], ["sure", "Nhớ chắc"], ["fruit", "Ra quả"]].map(([v, t], i) => '<button data-f="' + v + '"' + (i ? "" : ' class="on"') + ">" + t + "</button>").join("") +
      '</div><input id="fq" class="search" placeholder="🔎 Tìm từ hoặc nghĩa…"><div class="wlist" id="wl"></div></section>' : "") +
    "</div></div>", "page-home");
  const go = document.getElementById("go"); if (go) go.onclick = () => review();
  const more = document.getElementById("more"); if (more) more.onclick = () => {
    const extra = Math.min(C.EXTRA, Math.max(0, C.NEW_MAX_DAY - sownToday()));
    if (!extra) { toast("Hôm nay em đã gieo đủ " + C.NEW_MAX_DAY + " từ rồi — để não nghỉ, mai học tiếp nhé!"); return; }
    review({ fresh: nextNew(extra) });
  };
  const fq = document.getElementById("fq");
  if (fq) {
    let f = "all"; const draw = () => wordList(fq.value, f); fq.oninput = draw;
    document.querySelectorAll("#ff button").forEach(bt => bt.onclick = () => { f = bt.dataset.f; document.querySelectorAll("#ff button").forEach(x => x.classList.toggle("on", x === bt)); draw(); });
    draw();
  }
}
function stateOf(w) { const d = dayNow(); if (w[1] <= d) return ["due", "Cần ôn"]; if (w[0] >= 4) return ["fruit", "Ra quả"]; if (w[0] >= 3) return ["sure", "Nhớ chắc"]; return ["grow", "Đang lớn"]; }
function wordList(q, f) {
  const el = document.getElementById("wl"), qq = (q || "").trim().toLowerCase();
  const ids = Object.keys(S.w).filter(id => (f === "all" || stateOf(S.w[id])[0] === f) && (!qq || W[id].w.toLowerCase().includes(qq) || (W[id].vi || "").toLowerCase().includes(qq))).sort((a, b) => ORD[a] - ORD[b]);
  el.innerHTML = ids.slice(0, 120).map(id => { const w = W[id], st = stateOf(S.w[id]); return '<button class="wl" data-w="' + esc(id) + '"><i class="dot-' + st[0] + '" title="' + st[1] + '"></i><b>' + esc(w.w) + "</b><span>" + esc(w.vi) + "</span></button>"; }).join("") +
    (ids.length > 120 ? '<p class="muted small center">… và ' + (ids.length - 120) + " từ nữa — gõ để tìm.</p>" : "") || '<p class="muted small">Không có từ phù hợp.</p>';
  el.querySelectorAll("[data-w]").forEach(bt => bt.onclick = () => { const host = bt.nextElementSibling && bt.nextElementSibling.classList.contains("wcard") ? bt.nextElementSibling : null; if (host) { host.remove(); return; } bt.insertAdjacentHTML("afterend", cardHtml(W[bt.dataset.w])); bindSay(el); });
}

/* ---------- âm thanh: giọng đọc + tiếng reo ---------- */
/* Giọng đọc: ưu tiên file âm thanh giọng Anh (chạy được cả trong Zalo/Facebook, nơi giọng của máy hay bị câm); lỗi thì dùng giọng của máy. */
const SND = { on: store.get("rt-sound") !== false };
let ttsAudio = null;
function speakDevice(t) {
  try { if (!window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "en-GB"; u.rate = 0.88;
    const v = speechSynthesis.getVoices(); u.voice = v.find(x => /^en-gb/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null; speechSynthesis.speak(u); } catch (e) {}
}
function say(t) {
  t = String(t || "").replace(/·/g, ",").replace(/\s+/g, " ").trim(); if (!t) return;
  try {
    if (ttsAudio) { ttsAudio.pause(); ttsAudio.onerror = null; }
    const a = new Audio(); ttsAudio = a; a.referrerPolicy = "no-referrer"; let fell = false;
    const fallback = () => { if (fell) return; fell = true; speakDevice(t); };
    a.onerror = fallback;
    a.src = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&ttsspeed=" + (t.length > 40 ? "0.9" : "0.75") + "&q=" + encodeURIComponent(t.slice(0, 190));
    const p = a.play(); if (p && p.catch) p.catch(fallback);
  } catch (e) { speakDevice(t); }
}
try { if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) {}
function bindSay(root) { root.querySelectorAll("[data-say]").forEach(b => b.onclick = ev => { ev.stopPropagation(); say(b.dataset.say); }); }
/* tiếng reo tự tổng hợp (không cần tải file) */
let actx = null;
function tone(seq) {
  if (!SND.on) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume();
    let t = actx.currentTime + 0.01;
    seq.forEach(([f, d, type, vol]) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type || "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.82; });
  } catch (e) {}
}
const SFX = {
  ok: () => tone([[784, .12, "triangle"], [1047, .22, "triangle"]]),
  combo: () => tone([[659, .1, "triangle"], [784, .1, "triangle"], [1047, .1, "triangle"], [1319, .28, "triangle", .25]]),
  no: () => tone([[311, .16, "sine", .18], [233, .3, "sine", .16]]),
  done: () => tone([[523, .14, "triangle"], [659, .14, "triangle"], [784, .14, "triangle"], [1047, .2, "triangle"], [784, .1, "triangle"], [1047, .45, "triangle", .26]])
};
function confetti() {
  const box = document.createElement("div"); box.className = "confetti"; const em = ["🍃", "🌿", "💧", "✨", "🌸", "🍎"];
  for (let k = 0; k < 26; k++) { const s = document.createElement("span"); s.textContent = em[k % em.length]; s.style.left = Math.random() * 100 + "%"; s.style.animationDelay = (Math.random() * 0.6) + "s"; s.style.fontSize = (16 + Math.random() * 14) + "px"; box.appendChild(s); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3200);
}
const PRAISE = ["Chính xác! 🎉", "Tuyệt vời! ✨", "Giỏi quá! 🌿", "Quá đỉnh! 💪", "Chuẩn luôn! 🎯", "Xuất sắc! 🌟", "Nhớ tốt lắm! 🧠", "Đúng rồi, tiếp tục nhé! 🚀"];
const CHEER = ["Không sao, sai để nhớ lâu hơn! 💡", "Gần đúng rồi — xem kỹ lại nhé! 👀", "Cố lên, từ này sẽ quay lại để em chinh phục! 🌱", "Ghi nhớ lần này là lần sau chắc chắn đúng! 💪"];
const COMBO = { 3: "🔥 3 câu đúng liên tiếp!", 5: "🔥🔥 5 câu liền — phong độ quá!", 8: "🌟 8 câu liên tiếp — siêu trí nhớ!", 12: "🏆 12 câu liền — không thể cản nổi!" };
function cardHtml(w) {
  return '<div class="wcard"><div class="wtop"><div><div class="w">' + esc(w.w) + '</div><p class="ipa">' + esc([w.ipa, w.pos].filter(Boolean).join(" · ")) + "</p></div>" +
    '<div class="says"><button class="say" data-say="' + esc(w.w) + '" aria-label="Nghe từ">🔊 Từ</button>' + (w.ex || w.col ? '<button class="say" data-say="' + esc(w.ex || w.col) + '" aria-label="Nghe câu">🔊 Câu</button>' : "") + "</div></div>" +
    '<p class="mean">' + esc(w.vi) + "</p>" +
    '<dl>' + (w.fam ? "<dt>Word family</dt><dd>" + esc(w.fam) + "</dd>" : "") + (w.col ? "<dt>Collocation</dt><dd><em>" + esc(w.col) + "</em></dd>" : "") + (w.ex ? "<dt>Ví dụ</dt><dd>" + esc(w.ex) + "</dd>" : "") + "</dl>" +
    "</div>";
}

/* ---------- câu hỏi ---------- */
function findForm(word, ex) {
  const base = String(word).toLowerCase().replace(/\(.*?\)/g, "").split(/\s*[\/·;,]\s*/)[0].replace(/…/g, "").replace(/\b(sb|sth|one's)\b/g, " ").trim();
  const parts = base.split(/\s+/).filter(Boolean); if (!parts.length || !ex) return null;
  const stem = p => p.length > 4 ? p.replace(/(e|y|ies|es|s|ed|ing)$/, "").slice(0, Math.max(3, p.length - 3)) : p;
  const re = new RegExp("\\b" + parts.map(p => stem(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z'’-]*").join("[\\s-]+(?:\\w+[\\s-]+)?") + "\\b", "i");
  const m = re.exec(ex); return m ? [m.index, m.index + m[0].length] : null;
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pos0 = w => String(w.pos || "").split(/[ ,]/)[0];
function lev(a, b) { if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return m + n; let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
const VI_STOP = new Set(["sự", "của", "làm", "bị", "được", "có", "một", "các", "những", "cho", "và", "với", "người", "việc", "cái", "điều", "về", "ở", "từ", "trong", "không", "thuộc", "tính", "rất", "là", "ra", "lên", "đến", "ai", "gì", "khi", "mà", "hay", "hoặc", "nhiều", "lại"]);
const viTok = s => new Set(String(s || "").toLowerCase().replace(/\(.*?\)|[=≠><].*$/g, " ").split(/[^\p{L}]+/u).filter(x => x && !VI_STOP.has(x)));
/* Đáp án nhiễu "khó đoán": cùng từ loại + giống mặt chữ (khi hỏi từ tiếng Anh) hoặc gần nghĩa (khi hỏi nghĩa) — không còn chọn đại cũng đúng. */
function similar(id, mode, n) {
  const w = W[id], p = pos0(w), lw = w.w.toLowerCase(), vt = viTok(w.vi), seenV = new Set([w.vi.toLowerCase()]), seenW = new Set([lw]);
  const scored = ORDER.map(k => W[k]).filter(x => x.id !== id).map(x => {
    let s = (pos0(x) === p ? 4 : 0) + Math.random() * 1.5; const lx = x.w.toLowerCase();
    if (mode === "form") { let pre = 0; while (pre < Math.min(lx.length, lw.length) && lx[pre] === lw[pre]) pre++; s += Math.min(pre, 5) * 0.9 + (lx.slice(-3) === lw.slice(-3) ? 2 : 0) + (Math.abs(lx.length - lw.length) <= 2 ? 1 : 0) + Math.max(0, 4 - lev(lx, lw)) * 0.8; }
    else { const xt = viTok(x.vi); let sh = 0; xt.forEach(t => { if (vt.has(t)) sh++; }); s += sh * 2.2 + (x.u === w.u ? 0.8 : 0); }
    return [s, x];
  }).sort((a, b) => b[0] - a[0]);
  const out = [];
  for (const [, x] of scored.slice(0, 40)) {
    const v = x.vi.toLowerCase(), k = x.w.toLowerCase();
    if (seenV.has(v) || seenW.has(k) || (mode === "mean" && (v.includes(w.vi.toLowerCase()) || w.vi.toLowerCase().includes(v)))) continue;
    seenV.add(v); seenW.add(k); out.push(x); if (out.length >= n * 2) break;
  }
  return shuffle(out.slice(0, Math.max(n + 2, n))).slice(0, n);
}
function family(w) {   // các dạng khác trong word family: "devastation (n) · devastating (adj)" → ["devastation", "devastating"]
  return String(w.fam || "").split(/[·,]/).map(x => x.trim()).filter(x => x && !/^></.test(x)).map(x => x.split(/[(:]/)[0].trim().toLowerCase())
    .filter(x => /^[a-z][a-z-]{2,}$/.test(x) && x !== w.w.toLowerCase());
}
const colOf = w => String(w.col || "").split(/\s+\/\s+|;\s*|\s+·\s+/).map(x => x.trim()).find(x => x && findForm(w.w, x)) || "";   // "the Arctic / Arctic ice" → 1 cụm
const ctxOf = w => (w.ex && findForm(w.w, w.ex)) ? w.ex : colOf(w);
const norm = s => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/\(.*?\)/g, "").replace(/\b(sb|sth)\b/g, " ").replace(/[^a-z' -]/g, "").replace(/\s+/g, " ").trim();
const typeable = w => !/[·\/…]/.test(w.w) && w.w.length <= 26;
const single = w => /^[a-z-]+$/i.test(w.w);
/* Dạng bài theo độ nhớ của từ (hộp Leitner), chọn ngẫu nhiên trong nhóm để không nhàm:
   hộp 0: nghĩa · nghe-chọn · đúng/sai | 1: chọn từ theo nghĩa · collocation · đúng/sai | 2: điền câu · word form · collocation
   hộp ≥3: tự gõ trong câu · nghe-chép chính tả · word form · gõ theo nghĩa */
function kindFor(id) {
  const w = W[id], s = S.w[id]; if (!s) return "learn";
  const b = s[0], ctx = !!ctxOf(w), fam = family(w).length >= 1 && ctx, col = !!colOf(w);
  const pools = [
    ["mean", "mean", "listen", "tf"],
    ["word", "word", "tf"].concat(col ? ["colloc", "colloc"] : []),
    ["word"].concat(ctx ? ["cloze", "cloze"] : [], fam ? ["form", "form"] : [], col ? ["colloc"] : []),
    (typeable(w) ? ["typemean"] : ["word"]).concat(ctx && typeable(w) ? ["type", "type"] : [], single(w) ? ["dictation"] : [], fam ? ["form"] : [])
  ];
  const p = pools[Math.min(3, b)]; return p[Math.floor(Math.random() * p.length)];
}
function review(opt) {
  const practice = !!(opt && opt.ids);   // luyện riêng (từ Vườn từ vựng): không tính là một lần tưới
  const L = practice ? { due: opt.ids.filter(id => S.w[id]), fresh: opt.ids.filter(id => !S.w[id]) } : opt && opt.fresh ? { due: [], fresh: opt.fresh } : plan();
  const queue = L.due.map(id => ({ id, k: kindFor(id) })).concat(L.fresh.map(id => ({ id, k: "learn" })));
  if (practice) L.due.forEach(id => { const w = W[id]; queue.push({ id, k: ctxOf(w) ? (family(w).length ? "form" : "cloze") : single(w) ? "listen" : "word", again: true }); });
  const total = queue.length, first = {}, wrong = new Set(); let i = 0, right = 0, streak = 0, best = 0;
  if (!total) return home();
  inReview = true;
  const next = () => {
    if (i >= queue.length) return finish();
    const q = queue[i], w = W[q.id];
    const head = '<div class="qtop"><button class="x" id="qx" aria-label="Thoát">✕</button><span class="prog"><i style="width:' + Math.round(i / queue.length * 100) + '%"></i></span><span class="qcount">' + Math.min(i + 1, queue.length) + "/" + queue.length + '</span><button class="x snd" id="snd" aria-label="Bật/tắt tiếng" title="Bật/tắt tiếng reo">' + (SND.on ? "🔔" : "🔕") + "</button></div>" + (streak >= 2 ? '<div class="streak">🔥 ' + streak + " câu đúng liên tiếp</div>" : "");
    const bindX = () => {
      document.getElementById("qx").onclick = () => { if (confirmLeave()) { inReview = false; home(); } };
      document.getElementById("snd").onclick = ev => { SND.on = !SND.on; store.set("rt-sound", SND.on); ev.currentTarget.textContent = SND.on ? "🔔" : "🔕"; if (SND.on) SFX.ok(); };
    };
    if (q.k === "learn") {
      shell('<section class="card quiz">' + head + '<span class="qtype new">🌱 Từ mới · làm quen</span>' + cardHtml(w) + '<div class="nav"><button class="btn primary block" id="nx">Em đã đọc kỹ ➔ Kiểm tra</button></div></section>', "page-quiz");
      bindX(); bindSay(app); say(w.w);
      document.getElementById("nx").onclick = () => { q.k = Math.random() < 0.5 || !single(w) ? "mean" : "listen"; next(); };
      return;
    }
    let k = q.k, ctx = ctxOf(w), fam = family(w);
    if ((k === "cloze" || k === "type" || k === "form") && !ctx) k = "word";
    if (k === "form" && !fam.length) k = ctx ? "cloze" : "word";
    if (k === "colloc" && !colOf(w)) k = "word";
    if ((k === "type" || k === "typemean") && !typeable(w)) k = "word";
    if ((k === "dictation" || k === "listen") && !single(w)) k = "word";
    let prompt = "", opts = null, answer = w.w, typeMode = false, label = "", autoSay = false;
    const gapped = c => { const r = findForm(w.w, c); return { r, form: c.slice(r[0], r[1]), html: esc(c.slice(0, r[0])) + '<span class="gap"></span>' + esc(c.slice(r[1])) }; };
    const wordOpts = (mode, lower) => shuffle([w].concat(similar(q.id, mode, 3))).map(x => ({ t: lower ? x.w.toLowerCase() : x.w, ok: x.id === q.id }));
    if (k === "mean") { label = "Chọn nghĩa đúng"; prompt = '<div class="qbig">' + esc(w.w) + '</div><p class="ipa center">' + esc([w.ipa, w.pos].filter(Boolean).join(" · ")) + ' <button class="say mini" data-say="' + esc(w.w) + '">🔊</button></p>'; opts = shuffle([w].concat(similar(q.id, "mean", 3))).map(x => ({ t: x.vi, ok: x.id === q.id })); }
    else if (k === "word") { label = "Chọn từ đúng nghĩa"; prompt = '<p class="qtext big">' + esc(w.vi) + "</p>" + (w.pos ? '<p class="small muted center">(' + esc(w.pos) + ")</p>" : ""); opts = wordOpts("form"); }
    else if (k === "listen") { label = "🎧 Nghe và chọn từ em nghe được"; prompt = '<div class="center"><button class="bigsay" data-say="' + esc(w.w) + '" aria-label="Nghe lại">🔊</button><p class="small muted">Bấm loa để nghe lại</p></div>'; opts = wordOpts("form"); autoSay = true; }
    else if (k === "tf") {
      const truth = Math.random() < 0.5, other = similar(q.id, "mean", 1)[0], shown = truth || !other ? w.vi : other.vi;
      label = "Đúng hay sai?"; prompt = '<div class="qbig">' + esc(w.w) + '</div><p class="center small muted">' + esc(w.pos || "") + '</p><p class="qtext big">nghĩa là: “' + esc(shown) + '”</p>';
      opts = [{ t: "✔ Đúng", ok: shown === w.vi }, { t: "✘ Sai", ok: shown !== w.vi }]; answer = shown === w.vi ? "Đúng" : "Sai — nghĩa đúng: " + w.vi;
    }
    else if (k === "colloc") { const g = gapped(colOf(w)); answer = g.form; label = "Hoàn thành collocation"; prompt = '<p class="qtext big">' + g.html + '</p><p class="small muted center">Cụm từ hay dùng trong bài viết IELTS</p>'; opts = wordOpts("mean", true); opts.forEach(o => { if (o.ok) o.t = g.form.toLowerCase(); }); }
    else if (k === "form") {
      const g = gapped(ctx); answer = g.form; label = "Chọn dạng từ (word form) đúng";
      const forms = [g.form.toLowerCase()].concat(fam, [w.w.toLowerCase()]).filter((x, j, a) => a.indexOf(x) === j).slice(0, 4);
      if (forms.length < 3) { const extra = similar(q.id, "form", 8).filter(x => single(x)).map(x => x.w.toLowerCase()).slice(0, 4 - forms.length); extra.forEach(x => { if (forms.indexOf(x) < 0) forms.push(x); }); }
      prompt = '<p class="qtext">' + g.html + '</p><p class="small muted">Gợi ý nghĩa: ' + esc(w.vi) + '</p>'; opts = shuffle(forms.map(x => ({ t: x, ok: x === g.form.toLowerCase() })));
    }
    else if (k === "cloze") { const g = gapped(ctx); answer = g.form; label = "Điền từ vào câu"; prompt = '<p class="qtext">' + g.html + '</p><p class="small muted">Chọn từ phù hợp nhất với câu</p>'; opts = wordOpts("mean", true); opts.forEach(o => { if (o.ok) o.t = g.form.toLowerCase(); }); }
    else if (k === "type") { const g = gapped(ctx); answer = g.form; label = "Tự gõ từ còn thiếu"; prompt = '<p class="qtext">' + g.html + '</p><p class="small muted">Nghĩa: ' + esc(w.vi) + " · bắt đầu bằng <b>" + esc(g.form.slice(0, 1)) + "</b> · " + g.form.length + " chữ cái</p>"; typeMode = true; }
    else if (k === "dictation") { label = "🎧 Nghe và chép chính tả"; prompt = '<div class="center"><button class="bigsay" data-say="' + esc(w.w) + '" aria-label="Nghe lại">🔊</button><p class="small muted">Nghe rồi gõ lại đúng chính tả · ' + w.w.length + " chữ cái</p></div>"; typeMode = true; autoSay = true; }
    else { label = "Tự gõ từ theo nghĩa"; prompt = '<p class="qtext big">' + esc(w.vi) + '</p><p class="small muted center">' + (w.pos ? esc(w.pos) + " · " : "") + "bắt đầu bằng <b>" + esc(w.w.slice(0, 1)) + "</b> · " + w.w.length + " chữ cái</p>"; typeMode = true; }
    shell('<section class="card quiz">' + head + '<span class="qtype">' + label + "</span>" + prompt +
      (typeMode ? '<form class="typein" id="tf"><input id="ti" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ…"><button class="btn primary" type="submit">Kiểm tra</button></form><button class="btn ghost block" id="idk" style="margin-top:10px">Em chưa nhớ — xem đáp án</button>'
        : '<div class="opts' + (opts.length === 2 ? " two" : "") + '">' + opts.map((o, kk) => '<button class="opt" data-k="' + kk + '">' + esc(o.t) + "</button>").join("") + "</div>") + '<div id="fb"></div></section>', "page-quiz");
    bindX(); bindSay(app); if (autoSay) say(w.w);
    const decide = ok => {
      if (!(q.id in first)) { first[q.id] = ok; grade(q.id, ok); if (ok) right++; else wrong.add(q.id); save(); }
      if (!ok && !q.again) queue.push({ id: q.id, k: k === "type" || k === "typemean" || k === "dictation" ? "word" : k === "tf" ? "mean" : k, again: true });
      streak = ok ? streak + 1 : 0; best = Math.max(best, streak);
      const combo = ok && COMBO[streak];
      if (ok) (combo ? SFX.combo : SFX.ok)(); else SFX.no();
      if (ok) { const c = app.querySelector(".quiz"); if (c) { c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); } }
      document.getElementById("fb").innerHTML = '<div class="fb ' + (ok ? "ok" : "no") + '"><b class="h">' + (ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : CHEER[Math.floor(Math.random() * CHEER.length)]) + "</b>" +
        (combo ? '<span class="combo">' + combo + "</span>" : "") + (ok ? (w.col ? "<span>Collocation: <em>" + esc(w.col) + "</em></span>" : "") : "<span>Đáp án: <b>" + esc(answer) + "</b></span>") + "</div>" + (ok ? "" : cardHtml(w)) +
        '<div class="nav"><button class="btn primary block" id="nx">Tiếp ➔</button></div>';
      bindSay(app); if (!ok || k === "listen" || k === "dictation") setTimeout(() => say(w.w), ok ? 0 : 450);
      const nx = document.getElementById("nx"); nx.onclick = () => { i++; next(); }; nx.focus({ preventScroll: true }); nx.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    if (typeMode) {
      const ti = document.getElementById("ti"); ti.focus();
      const lock = () => { ti.disabled = true; app.querySelector("#tf button").disabled = true; const k2 = document.getElementById("idk"); if (k2) k2.remove(); };
      document.getElementById("tf").onsubmit = ev => { ev.preventDefault(); if (!ti.value.trim()) return; lock();
        const v = norm(ti.value), ok = v === norm(answer) || v === norm(w.w); decide(ok); };
      document.getElementById("idk").onclick = () => { lock(); decide(false); };
    } else app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      const o = opts[+b.dataset.k]; app.querySelectorAll(".opt").forEach((x, kk) => { x.disabled = true; if (opts[kk].ok) x.classList.add("ok"); }); if (!o.ok) b.classList.add("no"); decide(o.ok);
    });
  };
  const finish = () => {
    inReview = false;
    const d = dayNow(), r0 = rhythm(), wasLate = r0.k === "late", pct = Math.round(right / Math.max(1, L.due.length + L.fresh.length) * 100);
    const verdict = pct >= 90 ? "Xuất sắc! Trí nhớ của em thật ấn tượng 🏆" : pct >= 70 ? "Rất tốt! Cây của em đang lớn nhanh 🌳" : pct >= 50 ? "Khá lắm! Tưới đều là những từ khó sẽ thuộc 💪" : "Mỗi lần sai là một lần nhớ sâu hơn — cố lên nhé! 🌱";
    SFX.done(); confetti();
    if (practice) { save(); flush(false);
      shell('<section class="card done"><div class="scene small">' + treeSvg(false) + '</div><h1>Luyện xong từ này! 🌿</h1><p>Em trả lời đúng ngay lần đầu <b>' + right + "/" + L.due.concat(L.fresh).length + '</b>. Luyện riêng không thay cho lượt tưới — nhớ tưới cả vườn ít nhất 2 ngày 1 lần nhé.</p><button class="btn primary block" id="hm">Về cây của em</button></section>', "page-done");
      document.getElementById("hm").onclick = home; return; }
    S.days[d] = 1; if (S.lw !== d) S.n = (S.n || 0) + 1; S.lw = d; if (opt && opt.fresh) S.x[d] = (S.x[d] || 0) + opt.fresh.length;
    save(); flush(false);
    const st = rhythmStreak(), r = rhythm();
    shell('<section class="card done"><div class="scene small">' + treeSvg(false) + "</div><h1>" + (wasLate ? "Cây xanh lại rồi! 🌳" : "Cây đã được tưới! 🌳") + "</h1>" +
      '<p class="verdict">' + verdict + "</p>" +
      "<p>Đúng ngay lần đầu <b>" + right + "/" + (L.due.length + L.fresh.length) + "</b> từ" + (best >= 3 ? " · chuỗi đúng dài nhất <b>🔥 " + best + "</b>" : "") + "." + (wrong.size ? " Những từ chưa nhớ sẽ quay lại vào lần tưới sau." : "") + "</p>" +
      '<div class="donegrid"><div><b>' + Object.keys(S.w).length + "/" + TOTAL + "</b><small>từ đã gieo</small></div><div><b>" + (st || 1) + '</b><small>lần đúng nhịp liên tiếp</small></div><div><b>' + wd(r.due) + " " + dm(r.due) + "</b><small>hạn tưới tiếp theo</small></div></div>" +
      '<button class="btn primary block" id="hm">Xem cây của em</button></section>', "page-done");
    document.getElementById("hm").onclick = home;
  };
  next();
}

/* ---------- khởi động ---------- */
if (!U.length) { app.innerHTML = '<section class="card narrow center"><h1>Chưa tải được từ vựng</h1><p>Em kiểm tra mạng rồi tải lại trang.</p></section>'; return; }
addEventListener("beforeunload", ev => { if (inReview) { ev.preventDefault(); ev.returnValue = ""; } });
function autostart() {   // mở từ Vườn từ vựng trên dashboard
  if (AUTO.focus && W[AUTO.focus]) { const f = AUTO.focus; AUTO = { go: false, focus: "" }; review({ ids: [f] }); return true; }
  if (AUTO.go) { AUTO = { go: false, focus: "" }; const L = plan(); if (L.due.length + L.fresh.length) { review(); return true; } }
  return false;
}
if (!student) entry(() => { if (!autostart()) home(); });
else { loadLocal(); home(); pull().then(ch => { if (inReview) return; if (!autostart() && ch) home(); }); }
})();
