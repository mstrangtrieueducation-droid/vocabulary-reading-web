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
try {   // mở từ dashboard lớp: ?name=…&cls=… (họ tên + lớp của học sinh đang xem)
  const q = new URLSearchParams(location.search), qn = (q.get("name") || "").replace(/\s+/g, " ").trim(), qc = (q.get("cls") || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (qn.length >= 5 && (window.RT_CONFIG && window.RT_CONFIG.CLASSES || []).indexOf(qc) >= 0) { student = { name: qn, cls: qc }; store.set("rt-student", student); history.replaceState(null, "", location.pathname); }
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
  if (!w) { S.w[id] = ok ? [1, d + 1, 0, d] : [0, d + 1, 1, d]; return; }   // từ mới: lần đầu gặp
  if (!ok) { w[0] = 0; w[1] = d + 1; w[2]++; return; }
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

/* ---------- giọng đọc ---------- */
function say(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/·/g, ",")); u.lang = "en-GB"; u.rate = 0.86; const v = speechSynthesis.getVoices(); u.voice = v.find(x => /^en-gb/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null; speechSynthesis.speak(u); } catch (e) {} }
function bindSay(root) { root.querySelectorAll("[data-say]").forEach(b => b.onclick = ev => { ev.stopPropagation(); say(b.dataset.say); }); }
function cardHtml(w) {
  return '<div class="wcard"><div class="wtop"><div><div class="w">' + esc(w.w) + '</div><p class="ipa">' + esc([w.ipa, w.pos].filter(Boolean).join(" · ")) + "</p></div>" +
    '<div class="says"><button class="say" data-say="' + esc(w.w) + '" aria-label="Nghe từ">▶ Từ</button>' + (w.ex ? '<button class="say" data-say="' + esc(w.ex) + '" aria-label="Nghe câu">▶ Câu</button>' : "") + "</div></div>" +
    '<p class="mean">' + esc(w.vi) + "</p>" +
    '<dl>' + (w.fam ? "<dt>Word family</dt><dd>" + esc(w.fam) + "</dd>" : "") + (w.col ? "<dt>Collocation</dt><dd><em>" + esc(w.col) + "</em></dd>" : "") + (w.ex ? "<dt>Ví dụ</dt><dd>" + esc(w.ex) + "</dd>" : "") + "</dl>" +
    "</div>";
}

/* ---------- câu hỏi ---------- */
function findForm(word, ex) {
  const base = String(word).toLowerCase().replace(/\(.*?\)/g, "").split(/\s*[\/·;,]\s*/)[0].replace(/…/g, "").replace(/\b(sb|sth)\b/g, " ").trim();
  const parts = base.split(/\s+/).filter(Boolean); if (!parts.length || !ex) return null;
  const stem = p => p.length > 4 ? p.replace(/(e|y|ies|es|s|ed|ing)$/, "").slice(0, Math.max(3, p.length - 3)) : p;
  const re = new RegExp("\\b" + parts.map(p => stem(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z'’-]*").join("[\\s-]+(?:\\w+[\\s-]+)?") + "\\b", "i");
  const m = re.exec(ex); return m ? [m.index, m.index + m[0].length] : null;
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function distract(id, field, n) {
  const w = W[id], p0 = (w.pos || "").split(/[ ,]/)[0];
  const near = U[w.u].words.filter(x => x.id !== id), same = ORDER.map(i => W[i]).filter(x => x.id !== id && x.u !== w.u && (x.pos || "").split(/[ ,]/)[0] === p0);
  const pool = shuffle(near.slice()).concat(shuffle(same)), out = [], seen = new Set([String(w[field]).toLowerCase()]);
  for (const x of pool) { const v = String(x[field] || "").toLowerCase(); if (!v || seen.has(v)) continue; seen.add(v); out.push(x); if (out.length >= n) break; }
  return out;
}
const norm = s => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/\(.*?\)/g, "").replace(/\b(sb|sth)\b/g, " ").replace(/[^a-z' -]/g, "").replace(/\s+/g, " ").trim();
function kindFor(id) {
  const w = S.w[id]; if (!w) return "learn";
  const b = w[0], cl = !!findForm(W[id].w, W[id].ex || W[id].col);
  if (b <= 0) return "mean";
  if (b === 1) return "word";
  if (b === 2) return cl ? "cloze" : "word";
  return cl ? "type" : "typemean";
}
const typeable = w => !/[·\/]/.test(w.w);   // "brick · concrete · steel · tile" không bắt gõ
function review(opt) {
  const L = opt && opt.fresh ? { due: [], fresh: opt.fresh } : plan();
  const queue = L.due.map(id => ({ id, k: kindFor(id) })).concat(L.fresh.map(id => ({ id, k: "learn" })));
  queue.forEach(q => { if ((q.k === "type" || q.k === "typemean") && !typeable(W[q.id])) q.k = "word"; });
  const total = queue.length, first = {}, wrong = new Set(); let i = 0, right = 0;
  if (!total) return home();
  inReview = true;
  const next = () => {
    if (i >= queue.length) return finish();
    const q = queue[i], w = W[q.id];
    const head = '<div class="qtop"><button class="x" id="qx" aria-label="Thoát">✕</button><span class="prog"><i style="width:' + Math.round(i / queue.length * 100) + '%"></i></span><span class="qcount">' + Math.min(i + 1, queue.length) + "/" + queue.length + "</span></div>";
    const bindX = () => { document.getElementById("qx").onclick = () => { if (confirmLeave()) { inReview = false; home(); } }; };
    if (q.k === "learn") {
      shell('<section class="card quiz">' + head + '<span class="qtype new">🌱 Từ mới · làm quen</span>' + cardHtml(w) + '<div class="nav"><button class="btn primary block" id="nx">Em đã đọc kỹ ➔ Kiểm tra</button></div></section>', "page-quiz");
      bindX(); bindSay(app); say(w.w);
      document.getElementById("nx").onclick = () => { q.k = "mean"; next(); };
      return;
    }
    let prompt = "", opts = null, answer = w.w, typeMode = false, label = "";
    if (q.k === "mean") { label = "Chọn nghĩa đúng"; prompt = '<div class="qbig">' + esc(w.w) + '</div><p class="ipa center">' + esc([w.ipa, w.pos].filter(Boolean).join(" · ")) + ' <button class="say mini" data-say="' + esc(w.w) + '">▶</button></p>'; opts = shuffle([w].concat(distract(q.id, "vi", 3))).map(x => ({ t: x.vi, ok: x.id === q.id })); }
    else if (q.k === "word") { label = "Chọn từ đúng nghĩa"; prompt = '<p class="qtext big">' + esc(w.vi) + "</p>" + (w.pos ? '<p class="small muted center">(' + esc(w.pos) + ")</p>" : ""); opts = shuffle([w].concat(distract(q.id, "w", 3))).map(x => ({ t: x.w, ok: x.id === q.id })); }
    else if (q.k === "cloze" || q.k === "type") {
      const ctx = w.ex && findForm(w.w, w.ex) ? w.ex : w.col, r = findForm(w.w, ctx), form = ctx.slice(r[0], r[1]); answer = form;
      label = q.k === "cloze" ? "Điền từ vào câu của bài đọc" : "Tự gõ từ còn thiếu";
      prompt = '<p class="qtext">' + esc(ctx.slice(0, r[0])) + '<span class="gap"></span>' + esc(ctx.slice(r[1])) + '</p><p class="small muted">Nghĩa: ' + esc(w.vi) + (q.k === "type" ? " · bắt đầu bằng <b>" + esc(form.slice(0, 1)) + "</b> · " + form.length + " chữ cái" : "") + "</p>";
      if (q.k === "cloze") opts = shuffle([w].concat(distract(q.id, "w", 3))).map(x => ({ t: x.w, ok: x.id === q.id })); else typeMode = true;
    } else { label = "Tự gõ từ theo nghĩa"; prompt = '<p class="qtext big">' + esc(w.vi) + '</p><p class="small muted center">' + (w.pos ? esc(w.pos) + " · " : "") + "bắt đầu bằng <b>" + esc(w.w.slice(0, 1)) + "</b></p>"; typeMode = true; }
    shell('<section class="card quiz">' + head + '<span class="qtype">' + label + "</span>" + prompt +
      (typeMode ? '<form class="typein" id="tf"><input id="ti" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ…"><button class="btn primary" type="submit">Kiểm tra</button></form><button class="btn ghost block" id="idk" style="margin-top:10px">Em chưa nhớ — xem đáp án</button>'
        : '<div class="opts">' + opts.map((o, kk) => '<button class="opt" data-k="' + kk + '"><span class="ok-l">' + "ABCD"[kk] + "</span>" + esc(o.t) + "</button>").join("") + "</div>") + '<div id="fb"></div></section>', "page-quiz");
    bindX(); bindSay(app);
    const decide = ok => {
      if (!(q.id in first)) { first[q.id] = ok; grade(q.id, ok); if (ok) right++; else wrong.add(q.id); save(); }
      if (!ok && !q.again) queue.push({ id: q.id, k: q.k === "type" || q.k === "typemean" ? "word" : q.k, again: true });
      document.getElementById("fb").innerHTML = '<div class="fb ' + (ok ? "ok" : "no") + '"><b class="h">' + (ok ? ["Đúng rồi! 🎉", "Chính xác! ✨", "Giỏi lắm! 🌿"][i % 3] : "Chưa đúng — đáp án: " + esc(answer)) + "</b>" + (ok && w.col ? "<span>Collocation: <em>" + esc(w.col) + "</em></span>" : "") + "</div>" + (ok ? "" : cardHtml(w)) +
        '<div class="nav"><button class="btn primary block" id="nx">Tiếp ➔</button></div>';
      bindSay(app); if (!ok) say(w.w);
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
    const d = dayNow(), r0 = rhythm(), wasLate = r0.k === "late";
    S.days[d] = 1; if (S.lw !== d) S.n = (S.n || 0) + 1; S.lw = d; if (opt && opt.fresh) S.x[d] = (S.x[d] || 0) + opt.fresh.length;
    save(); flush(false);
    const st = rhythmStreak(), r = rhythm();
    shell('<section class="card done"><div class="scene small">' + treeSvg(false) + "</div><h1>" + (wasLate ? "Cây xanh lại rồi! 🌳" : "Cây đã được tưới! 🌳") + "</h1>" +
      "<p>Em trả lời đúng ngay lần đầu <b>" + right + "/" + total + "</b> từ." + (wrong.size ? " Những từ chưa nhớ sẽ quay lại vào lần tưới sau." : "") + "</p>" +
      '<div class="donegrid"><div><b>' + Object.keys(S.w).length + "/" + TOTAL + "</b><small>từ đã gieo</small></div><div><b>" + (st || 1) + '</b><small>lần đúng nhịp liên tiếp</small></div><div><b>' + wd(r.due) + " " + dm(r.due) + "</b><small>hạn tưới tiếp theo</small></div></div>" +
      '<button class="btn primary block" id="hm">Xem cây của em</button></section>', "page-done");
    document.getElementById("hm").onclick = home;
  };
  next();
}

/* ---------- khởi động ---------- */
if (!U.length) { app.innerHTML = '<section class="card narrow center"><h1>Chưa tải được từ vựng</h1><p>Em kiểm tra mạng rồi tải lại trang.</p></section>'; return; }
addEventListener("beforeunload", ev => { if (inReview) { ev.preventDefault(); ev.returnValue = ""; } });
if (!student) entry(home); else { loadLocal(); home(); pull().then(ch => { if (ch && !inReview) home(); }); }
})();
