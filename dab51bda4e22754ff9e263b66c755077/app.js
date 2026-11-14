/* Cây từ vựng học thuật — IELTS Reading tự luyện. Ms Trang Trieu Education.
   - Từ lấy đúng danh sách từ cô soạn: 27 bài Reading tự luyện + "Từ vựng cần lưu ý" của Full Test 11–23 (data.js). Không bắt học hết một bài một lúc:
     mở bài đọc nào thì gieo từ bài đó; mỗi ngày tối đa 8 từ mới + tối đa 15 từ đến hạn (~3–5 phút).
   - Ôn ngắt quãng (Leitner): đúng đúng hạn → lên hộp, ôn lại sau 1 → 3 → 7 → 14 → 30 ngày; sai → về hộp 0, ôn lại ngày mai.
   - Dạng bài khó dần theo mức nhớ: làm quen thẻ từ → chọn nghĩa → chọn từ theo nghĩa → điền từ vào câu của bài đọc → tự gõ từ.
   - Lưu trong máy + đồng bộ về Apps Script (bảng theo dõi của cô) theo họ tên + lớp. */
(() => {
"use strict";
const C = Object.assign({ CLASSES: [], API: "", NEW_PER_DAY: 8, REVIEW_MAX: 15, READING_BASE: "" }, window.RT_CONFIG || {});
const P = window.RT_DATA || [];
const app = document.getElementById("app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2800); }
const dayNow = () => Math.floor((Date.now() + 7 * 3600e3) / 864e5);   // ngày theo giờ Việt Nam
const W = {}, PW = {}; P.forEach(a => { PW[a.code] = a; a.words.forEach(w => { w.code = a.code; W[w.id] = w; }); });
/* Thang lớn của cây giữ như cũ (= số từ của 27 bài tự luyện); từ Full Test cộng thêm giúp cây lên cấp nhanh hơn. */
const ALL = P.filter(a => !a.full).reduce((n, a) => n + a.words.length, 0) || Object.keys(W).length;
const tName = a => (a.full ? "Full Test " : "Test ") + a.t;   // nhãn bài: "Test 5" / "Full Test 12"
/* ?add=… nhận mã 1 passage, hoặc mã cả Full Test ("IELTS READING FULL TEST 12") → gieo cả 3 passage. */
const codesFor = c => PW[c] ? [c] : P.filter(a => a.code.indexOf(c + " - PASSAGE ") === 0).map(a => a.code);

/* ---------- học sinh + trạng thái ---------- */
let student = store.get("rt-student");
if (student && (!student.name || C.CLASSES.indexOf(student.cls) < 0)) student = null;
const keyOf = s => "rt-state:" + s.name.toUpperCase() + "|" + s.cls;
let S = null;
const blank = () => ({ v: 1, t: 0, add: {}, words: {}, rev: 0, days: {} });
function loadLocal() { S = (student && store.get(keyOf(student))) || blank(); }
function save() { S.t = Date.now(); store.set(keyOf(student), S); push(); }
let pushT = null, dirty = false;
function body() { const b = buckets(); return JSON.stringify({ action: "rt_save", name: student.name, cls: student.cls, state: S,
  sum: { words: Object.keys(S.words).length, due: b.due + b.fresh, grow: b.grow, sure: b.sure, fruit: b.fruit, passages: Object.keys(S.add).length, streak: streak() } }); }
function flush(beacon) {
  if (!C.API || !dirty || !student) return; clearTimeout(pushT); dirty = false;
  if (beacon && navigator.sendBeacon) { try { if (navigator.sendBeacon(C.API, new Blob([body()], { type: "text/plain;charset=utf-8" }))) return; } catch (e) {} }
  fetch(C.API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body(), keepalive: true }).catch(() => { dirty = true; });
}
function push() { if (!C.API) return; dirty = true; clearTimeout(pushT); pushT = setTimeout(() => flush(false), 800); }
addEventListener("pagehide", () => flush(true));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(true); });
async function pull() {
  if (!C.API) return;
  try {
    const u = new URL(C.API); u.searchParams.set("action", "rt"); u.searchParams.set("name", student.name); u.searchParams.set("cls", student.cls); u.searchParams.set("t", Date.now());
    const j = await fetch(u.href).then(r => r.json());
    if (j && j.ok && j.state && (+j.state.t || 0) > (+S.t || 0)) { S = Object.assign(blank(), j.state); store.set(keyOf(student), S); return true; }
  } catch (e) {}
  return false;
}

/* ---------- lịch ôn ---------- */
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
function addPassage(code) {
  const a = PW[code]; if (!a) return 0;
  let n = 0; if (!S.add[code]) S.add[code] = dayNow();
  a.words.forEach(w => { if (!S.words[w.id]) { S.words[w.id] = { b: 0, d: dayNow(), m: 0, s: 0 }; n++; } });
  return n;
}
function grade(id, ok) {
  const w = S.words[id], d = dayNow(); if (!w) return;
  if (!w.s) { w.s = d; if (ok) { w.b = 1; w.d = d + 1; } else { w.b = 0; w.d = d + 1; w.m++; } return; }
  if (!ok) { w.b = 0; w.d = d + 1; w.m++; return; }
  if (w.d > d) return;   // làm lại trong ngày không tính lên hộp
  w.b = Math.min(5, w.b + 1); w.d = d + BOX_DAYS[w.b];
}
const newToday = () => Object.values(S.words).filter(w => w.s === dayNow()).length;
function dueList() {
  const d = dayNow(), ws = Object.entries(S.words);
  const due = ws.filter(([, w]) => w.s && w.d <= d).sort((a, b) => a[1].d - b[1].d || b[1].m - a[1].m).map(([id]) => id).slice(0, C.REVIEW_MAX);
  const room = Math.max(0, Math.min(C.NEW_PER_DAY - newToday(), C.REVIEW_MAX + C.NEW_PER_DAY - due.length));
  // từ mới: theo thứ tự bài đã gieo, trong bài theo thứ tự cô soạn
  const fresh = ws.filter(([, w]) => !w.s).map(([id]) => id).sort((a, b) => (S.add[W[a].code] - S.add[W[b].code]) || (ord(a) - ord(b))).slice(0, room);
  return { due, fresh };
}
const ORD = {}; P.forEach((a, i) => a.words.forEach((w, j) => { ORD[w.id] = i * 100 + j; }));
const ord = id => ORD[id] || 0;
function buckets() {
  const d = dayNow(), b = { due: 0, grow: 0, sure: 0, fruit: 0, fresh: 0 };
  Object.values(S.words).forEach(w => { if (!w.s) b.fresh++; else if (w.d <= d) b.due++; else if (w.b >= 4) b.fruit++; else if (w.b >= 3) b.sure++; else b.grow++; });
  return b;
}
function streak() { let n = 0, d = dayNow(); if (!S.days[d]) d--; while (S.days[d]) { n++; d--; } return n; }

/* ---------- cây ---------- */
const STAGES = ["Hạt giống", "Mầm non", "Cây con", "Cây non", "Cây lớn", "Cây sai quả"], STAGE_AT = [0, 0, 0.05, 0.25, 0.5, 0.8];
function rnd(seed) { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
const f1 = n => (+n).toFixed(1);
function treeSvg() {
  const id = "th", b = buckets(), nW = Object.keys(S.words).length, cats0 = { due: b.due + b.fresh, grow: b.grow, sure: b.sure, fruit: b.fruit };
  const nU = Object.keys(S.add).length;
  const Wd = 340, G = 186, X = 170;
  let s = '<svg class="tree" viewBox="0 0 340 210" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Cây từ vựng">' +
    '<defs><radialGradient id="' + id + 'sun"><stop offset="0" stop-color="#fef3c7"/><stop offset=".45" stop-color="#fde68a" stop-opacity=".9"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="' + id + 'tk" x1="0" x2="1"><stop offset="0" stop-color="#7c4a21"/><stop offset=".5" stop-color="#a86b36"/><stop offset="1" stop-color="#7c4a21"/></linearGradient>' +
    '<radialGradient id="' + id + 'fr" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fda4af"/><stop offset=".5" stop-color="#f43f5e"/><stop offset="1" stop-color="#dc2626"/></radialGradient>' +
    '<radialGradient id="' + id + 'bd" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fde68a"/><stop offset=".6" stop-color="#fbbf24"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>' +
    '<path id="' + id + 'lf" d="M0 0C3-4 9-4.6 13 0C9 4.6 3 4 0 0Z"/></defs>' +
    '<circle cx="292" cy="40" r="34" fill="url(#' + id + 'sun)"/><circle cx="292" cy="40" r="13" fill="#fcd34d"/>' +
    '<g class="cloud c1" fill="#fff" opacity=".95"><ellipse cx="62" cy="40" rx="22" ry="9"/><circle cx="54" cy="35" r="9"/><circle cx="68" cy="31" r="11"/></g>' +
    '<g class="cloud c2" fill="#fff" opacity=".85"><ellipse cx="222" cy="26" rx="16" ry="6.5"/><circle cx="216" cy="22" r="6.5"/><circle cx="227" cy="19" r="8"/></g>' +
    '<path d="M0 168C55 150 120 154 178 166S286 152 340 160V210H0Z" fill="#86efac"/><path d="M0 188C60 174 128 178 186 186S290 176 340 182V210H0Z" fill="#4ade80"/>';
  [[22, 176, 9], [96, 182, 7], [250, 180, 8], [322, 178, 7]].forEach(([x, y, r]) => { s += '<circle cx="' + (x - r * 0.7) + '" cy="' + (y + 2) + '" r="' + (r * 0.7) + '" fill="#22c55e"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#34d399"/><circle cx="' + (x + r * 0.8) + '" cy="' + (y + 2) + '" r="' + (r * 0.65) + '" fill="#22c55e"/>'; });
  if (!nW) return s + '<ellipse cx="' + X + '" cy="' + (G + 1) + '" rx="16" ry="4.5" fill="#a16207" opacity=".55"/><path d="M' + X + " " + G + " C" + X + " " + (G - 10) + " " + (X - 1) + " " + (G - 16) + " " + X + " " + (G - 22) + '" stroke="#65a30d" stroke-width="2.6" fill="none" stroke-linecap="round"/><use href="#' + id + 'lf" fill="#84cc16" transform="translate(' + X + " " + (G - 22) + ') rotate(205) scale(1.15)"/><use href="#' + id + 'lf" fill="#65a30d" transform="translate(' + X + " " + (G - 21) + ') rotate(-30) scale(1.05)"/></svg>';
  const sc = 0.62 + 0.38 * Math.min(1, nU / 12), TH = 60 * sc, top = G - TH, R = 80 * sc, RV = 62 * sc, cy = top - RV * 0.45;
  s += '<path d="M' + f1(X - 12 * sc) + " " + G + "C" + f1(X - 5 * sc) + " " + f1(G - 8 * sc) + " " + f1(X - 4.5 * sc) + " " + f1(G - 34 * sc) + " " + f1(X - 4 * sc) + " " + f1(top) + "L" + f1(X + 4 * sc) + " " + f1(top) + "C" + f1(X + 4.5 * sc) + " " + f1(G - 34 * sc) + " " + f1(X + 5 * sc) + " " + f1(G - 8 * sc) + " " + f1(X + 12 * sc) + " " + G + "Q" + X + " " + (G + 3) + " " + f1(X - 12 * sc) + " " + G + 'Z" fill="url(#' + id + 'tk)"/>';
  const br = (dx, dy, c1x, c1y) => '<path d="M' + X + " " + f1(top + 10 * sc) + "Q" + f1(X + c1x * sc) + " " + f1(top + c1y * sc) + " " + f1(X + dx * sc) + " " + f1(top + dy * sc) + '" stroke="url(#' + id + 'tk)" stroke-width="' + f1(4.2 * sc) + '" fill="none" stroke-linecap="round"/>';
  s += br(-34, -26, -8, -6) + br(34, -24, 8, -4) + br(2, -38, 1, -16);
  const blob = (pts, fill) => pts.map(([a, b2, r]) => '<circle cx="' + f1(X + a * R) + '" cy="' + f1(cy + b2 * RV) + '" r="' + f1(r * R) + '" fill="' + fill + '"/>').join("");
  s += blob([[-0.62, 0.22, 0.42], [0.62, 0.22, 0.42], [-0.34, -0.3, 0.48], [0.34, -0.3, 0.48], [0, -0.52, 0.46], [0, 0.18, 0.56], [-0.7, -0.05, 0.36], [0.7, -0.05, 0.36]], "#4ade80");
  s += blob([[-0.5, 0.08, 0.38], [0.48, 0.1, 0.38], [-0.24, -0.34, 0.4], [0.28, -0.32, 0.38], [0, -0.04, 0.48]], "#86efac");
  s += blob([[-0.34, -0.42, 0.22], [-0.56, -0.08, 0.16], [0.06, -0.6, 0.16]], "#bbf7d0");
  const M = Math.min(nW, Math.round(12 + 52 * sc * sc)), cats = Object.entries(cats0);
  const cnt = cats.map(([k, n]) => ({ k, n, m: n ? Math.max(1, Math.floor(n / nW * M)) : 0 }));
  let left = M - cnt.reduce((a, c) => a + c.m, 0); cnt.slice().sort((a, c) => (c.n / nW * M % 1) - (a.n / nW * M % 1)).forEach(c => { if (left > 0 && c.n) { c.m++; left--; } });
  const seq = []; cnt.forEach(c => { for (let q = 0; q < c.m; q++) seq.push(c.k); });
  const order = seq.map((k, q) => [k, rnd(q * 13.7 + seq.length)]).sort((a, c) => a[1] - c[1]).map(x => x[0]);
  let marks = "";
  order.forEach((k, q) => {
    const r = Math.sqrt((q + 0.6) / order.length), th = q * 2.39996 + 0.4, x = X + r * R * 0.9 * Math.cos(th), y = cy - RV * 0.06 + r * RV * 0.82 * Math.sin(th), dl = ' style="animation-delay:' + (q * 18) + 'ms"';
    if (k === "fruit") marks += '<g class="mk"' + dl + '><path d="M' + f1(x) + " " + f1(y - 3.6) + 'q.6-2.6 2.6-3.4" stroke="#7c4a21" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="4" fill="url(#' + id + 'fr)"/><circle cx="' + f1(x - 1.4) + '" cy="' + f1(y - 1.4) + '" r="1.1" fill="#fff" opacity=".9"/></g>';
    else if (k === "due") marks += '<g class="mk"' + dl + '><ellipse cx="' + f1(x) + '" cy="' + f1(y) + '" rx="3" ry="3.9" fill="url(#' + id + 'bd)"/><circle cx="' + f1(x - 0.9) + '" cy="' + f1(y - 1.4) + '" r=".8" fill="#fff" opacity=".85"/></g>';
    else marks += '<use class="mk"' + dl + ' href="#' + id + 'lf" fill="' + (k === "sure" ? "#10b981" : "#84cc16") + '" transform="translate(' + f1(x - 4) + " " + f1(y) + ") rotate(" + Math.round(rnd(q * 3.3) * 120 - 60) + ") scale(" + (k === "sure" ? 0.78 : 0.62) + ')"/>';
  });
  return s + marks + "</svg>";
}
const ICONS = {
  due: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3.5C10.6 8.6 7.5 12.2 7.5 16.2a6.5 6.5 0 0 0 13 0c0-4-3.1-7.6-6.5-12.7Z" fill="#f59e0b"/><path d="M11 15.5a3.4 3.4 0 0 0 2.4 3.6" stroke="#fff7d6" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  grow: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 24V13" stroke="#4d7c0f" stroke-width="2.2" stroke-linecap="round"/><path d="M14 14C13.6 9 9.8 6.6 5 7c.2 4.9 3.8 7.6 9 7Z" fill="#65a30d"/><path d="M14 12.5c.6-4.6 4.3-7 9-6.4-.4 4.6-4 7-9 6.4Z" fill="#84cc16"/></svg>',
  sure: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23C5 12 11 5 23 4c.4 11.6-6 18.6-18 19Z" fill="#059669"/><path d="M6 22C10 16 14 12 20 7.5" stroke="#a7f3d0" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>',
  fruit: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 4c-.4 4-2.6 8-5.6 11M14 4c1 4 3.2 7.6 6.2 10.6" stroke="#7c4a21" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="8.6" cy="18.6" r="5" fill="#e11d48"/><circle cx="19.8" cy="18.2" r="5" fill="#e11d48"/><circle cx="7" cy="17" r="1.4" fill="#fff" opacity=".85"/></svg>'
};
function treeCard() {
  const b = buckets(), nW = Object.keys(S.words).length, sure = b.sure + b.fruit, pct = Math.round(sure / Math.max(1, nW) * 100);
  let k = 0; if (nW) { const p = sure / ALL; k = 1; while (k < 5 && p >= STAGE_AT[k + 1]) k++; }
  const L = dueList(), n = L.due.length + L.fresh.length, done = S.rev === dayNow(), C2 = 2 * Math.PI * 28;
  const tile = (kk, v, lab) => '<div class="tt ' + kk + '">' + ICONS[kk] + "<div><b>" + v + "</b><small>" + lab + "</small></div></div>";
  return '<section class="card treecard"><div class="trtop"><div class="trinfo"><span class="trkick">Cây từ vựng học thuật</span><div class="trname"><h2>' + STAGES[k] + '</h2><span class="lvl">Cấp ' + k + "/5</span></div>" +
    '<span class="stage">' + [1, 2, 3, 4, 5].map(j => '<i class="' + (j <= k ? "on" : "") + '"></i>').join("") + "</span></div>" +
    '<div class="ring3"><svg viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="28" stroke="#e2e8f0"/><circle cx="34" cy="34" r="28" stroke="#10b981" stroke-dasharray="' + f1(C2 * pct / 100) + " " + f1(C2) + '" transform="rotate(-90 34 34)"' + (pct ? "" : ' opacity="0"') + "/></svg><b>" + pct + "%</b><small>nhớ chắc</small></div></div>" +
    '<div class="scene' + (nW ? "" : " seed") + '">' + treeSvg() + (nW ? "" : '<p class="seedtip">Chọn bài đọc em đang học ở dưới để gieo hạt 🌱</p>') + "</div>" +
    '<div class="trtiles">' + tile("due", b.due + b.fresh, "Cần ôn / từ mới") + tile("grow", b.grow, "Đang lớn") + tile("sure", b.sure, "Nhớ chắc") + tile("fruit", b.fruit, "Ra quả") + "</div>" +
    (n ? '<button class="btn water" id="go"><span>💧 Tưới cây · ' + n + " từ</span>" + '<span class="pill">' + (L.fresh.length ? L.fresh.length + " mới · " : "") + "⏱ ~" + Math.max(2, Math.round(n * 0.25)) + " phút</span></button>"
      : nW ? '<p class="watered">✓ Hôm nay cây đã được tưới đủ' + (streak() > 1 ? " · " + streak() + " ngày liền 🔥" : "") + "</p>" : "") +
    '<p class="trnote">🌱 Mỗi ngày ôn vài phút: từ cũ đến hạn + tối đa ' + C.NEW_PER_DAY + " từ mới. Đúng hạn thì cây xanh tán và kết trái.</p></section>";
}

/* ---------- khung ---------- */
function shell(html) {
  app.innerHTML = html; window.scrollTo(0, 0);
  const who = document.getElementById("who");
  if (student) { who.hidden = false; who.textContent = student.name + " · " + student.cls; who.onclick = () => entry(home); } else who.hidden = true;
}
function entry(then) {
  shell('<section class="card narrow"><span class="kick">IELTS Reading · Cây từ vựng học thuật</span><h1>Em điền thông tin để vào</h1>' +
    '<form id="ef" novalidate><label class="field"><span>Họ và tên</span><input id="en" autocomplete="name" maxlength="80" placeholder="Nhập đầy đủ họ tên" value="' + esc(student ? student.name : "") + '"></label>' +
    '<label class="field"><span>Lớp</span><select id="ec"><option value="">Chọn lớp</option>' + C.CLASSES.map(c => "<option" + (student && student.cls === c ? " selected" : "") + ">" + esc(c) + "</option>").join("") + "</select></label>" +
    '<p class="err" id="ee"></p><button class="btn primary block" type="submit">Vào cây của em ➔</button></form>' +
    '<p class="small muted" style="margin-top:12px">Nhập đúng họ tên và lớp như ở bài Reading để cô theo dõi được và em mở trên máy khác vẫn còn cây.</p></section>');
  document.getElementById("ef").onsubmit = async ev => {
    ev.preventDefault();
    const name = document.getElementById("en").value.replace(/\s+/g, " ").trim(), cls = document.getElementById("ec").value, ee = document.getElementById("ee");
    if (name.split(" ").length < 2 || name.length < 5) { ee.textContent = "Em nhập đầy đủ họ và tên nhé."; return; }
    if (C.CLASSES.indexOf(cls) < 0) { ee.textContent = "Em chọn lớp của mình nhé."; return; }
    student = { name, cls }; store.set("rt-student", student); loadLocal(); await pull(); then();
  };
}

/* ---------- trang chủ ---------- */
function home() {
  const q = new URLSearchParams(location.search), addCode = q.get("add");
  const addList = addCode ? codesFor(addCode) : [];
  if (addList.length) {
    let n = 0; addList.forEach(c => { n += addPassage(c); }); save(); history.replaceState(null, "", location.pathname);
    if (n) toast("Đã gieo " + n + " từ của " + (addList.length > 1 ? tName(PW[addList[0]]) : PW[addList[0]].title) + " vào cây 🌱");
  }
  const groups = {}, gKey = a => (a.full ? "F" : "") + a.t; P.forEach(a => (groups[gKey(a)] = groups[gKey(a)] || []).push(a));
  const mine = P.filter(a => S.add[a.code]);
  const pRow = a => {
    const ws = a.words.map(w => S.words[w.id]).filter(Boolean), sure = ws.filter(w => w.s && w.b >= 3).length, on = !!S.add[a.code];
    return '<button class="p' + (on ? " on" : "") + '" data-add="' + esc(a.code) + '"><span class="n">' + (on ? "✓" : "P" + a.p) + '</span><span class="tx"><b>' + esc(a.title) + "</b><small>" + tName(a) + " · Passage " + a.p + " · " + a.words.length + " từ" + (on ? " · nhớ chắc " + sure : "") + "</small>" +
      (on ? '<span class="bar"><i style="width:' + Math.round(sure / a.words.length * 100) + '%"></i></span>' : "") + "</span>" + (on ? "" : '<span class="add">+ Gieo</span>') + "</button>";
  };
  shell('<div class="cols"><div class="left">' + treeCard() + '</div><div>' +
    '<section class="card"><span class="kick">Chào ' + esc(student.name.split(" ").pop()) + '!</span><h1 style="font-size:20px">Học từ học thuật theo bài đọc</h1>' +
    '<div class="how"><b>Không cần học thuộc cả bài một lúc.</b> Em đọc bài nào thì gieo từ bài đó vào cây. Mỗi ngày bấm <b>Tưới cây</b> vài phút: máy đưa ra từ cũ đến hạn và vài từ mới, dạng bài khó dần (chọn nghĩa → chọn từ → điền vào câu của bài đọc → tự gõ từ). Từ nào nhớ chắc thì lâu mới hỏi lại.</div></section>' +
    (mine.length ? '<h2 class="sec">Bài đã gieo (' + mine.length + ")</h2><div class=\"ps\">" + mine.map(pRow).join("") + "</div>" : "") +
    '<h2 class="sec">Gieo từ của bài đọc</h2><div class="tests">' + Object.keys(groups).map(t => '<div class="test"><h3>IELTS Reading ' + tName(groups[t][0]) + '</h3><div class="ps">' + groups[t].map(pRow).join("") + "</div></div>").join("") + "</div>" +
    (Object.keys(S.words).length ? '<h2 class="sec">Sổ từ của em</h2><section class="card"><input id="fq" class="field" style="width:100%;height:44px;border:1.5px solid #cdd5ec;border-radius:12px;padding:0 12px" placeholder="Tìm từ…"><div class="wlist" id="wl"></div></section>' : "") +
    "</div></div>");
  const go = document.getElementById("go"); if (go) go.onclick = review;
  app.querySelectorAll("[data-add]").forEach(b => b.onclick = () => {
    const a = PW[b.dataset.add];
    if (S.add[a.code]) { toast("Từ của bài này đã ở trong cây. Bấm Tưới cây để ôn nhé."); return; }
    const n = addPassage(a.code); save(); toast("Đã gieo " + n + " từ của " + a.title + " 🌱"); home();
  });
  const fq = document.getElementById("fq");
  if (fq) { const draw = () => wordList(fq.value); fq.oninput = draw; draw(); }
}
function stateOf(w) { const d = dayNow(); if (!w.s) return ["new", "Từ mới"]; if (w.d <= d) return ["due", "Cần ôn"]; if (w.b >= 4) return ["fruit", "Ra quả"]; if (w.b >= 3) return ["sure", "Nhớ chắc"]; return ["grow", "Đang lớn"]; }
function wordList(f) {
  const el = document.getElementById("wl"), qq = (f || "").trim().toLowerCase();
  const ids = Object.keys(S.words).filter(id => !qq || W[id].w.toLowerCase().includes(qq) || (W[id].vi || "").toLowerCase().includes(qq)).sort((a, b) => ord(a) - ord(b)).slice(0, 80);
  el.innerHTML = ids.map(id => { const w = W[id], st = stateOf(S.words[id]); return '<button class="wl" data-w="' + esc(id) + '"><i class="dot-' + st[0] + '" title="' + st[1] + '"></i><b>' + esc(w.w) + "</b><span>" + esc(w.vi) + "</span></button>"; }).join("") || '<p class="muted small">Không có từ phù hợp.</p>';
  el.querySelectorAll("[data-w]").forEach(b => b.onclick = () => { const host = b.nextElementSibling && b.nextElementSibling.classList.contains("wcard") ? b.nextElementSibling : null; if (host) { host.remove(); return; } b.insertAdjacentHTML("afterend", cardHtml(W[b.dataset.w])); bindSay(el); });
}

/* ---------- giọng đọc (như trang Reading: giọng Anh của máy) ---------- */
function say(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/·/g, ",")); u.lang = "en-GB"; u.rate = 0.86; const v = speechSynthesis.getVoices(); u.voice = v.find(x => /^en-gb/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null; speechSynthesis.speak(u); } catch (e) {} }
function bindSay(root) { root.querySelectorAll("[data-say]").forEach(b => b.onclick = ev => { ev.stopPropagation(); say(b.dataset.say); }); }
function cardHtml(w) {
  return '<div class="wcard"><div class="w">' + esc(w.w) + '</div><p class="ipa" style="margin:0">' + esc([w.ipa, w.pos].filter(Boolean).join(" · ")) + "</p>" +
    '<button class="say" data-say="' + esc(w.w) + '">▶ Nghe từ</button>' + (w.ex ? '<button class="say" data-say="' + esc(w.ex) + '">▶ Nghe câu</button>' : "") +
    "<p><b>Nghĩa:</b> " + esc(w.vi) + "</p>" + (w.fam ? "<p><b>Word family:</b> " + esc(w.fam) + "</p>" : "") + (w.col ? "<p><b>Collocation:</b> <em>" + esc(w.col) + "</em></p>" : "") + (w.ex ? "<p><b>Ví dụ:</b> " + esc(w.ex) + "</p>" : "") +
    '<p class="small muted">' + esc(PW[w.code].title) + " · " + tName(PW[w.code]) + " P" + PW[w.code].p + "</p></div>";
}

/* ---------- câu hỏi ---------- */
function findForm(word, ex) {
  const base = String(word).toLowerCase().replace(/\(.*?\)/g, "").split(/\s*[\/·;,]\s*/)[0].replace(/…/g, "").trim();
  const parts = base.split(/\s+/).filter(Boolean); if (!parts.length || !ex) return null;
  const stem = p => p.length > 4 ? p.replace(/(e|y|ies|es|s|ed|ing)$/, "").slice(0, Math.max(3, p.length - 3)) : p;
  const re = new RegExp("\\b" + parts.map(p => stem(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z'’-]*").join("[\\s-]+") + "\\b", "i");
  const m = re.exec(ex); return m ? [m.index, m.index + m[0].length] : null;
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function distract(id, field, n) {
  const w = W[id], same = PW[w.code].words.filter(x => x.id !== id), other = Object.values(W).filter(x => x.code !== w.code && (x.pos || "").split(" ")[0] === (w.pos || "").split(" ")[0]);
  const pool = shuffle(same.slice()).concat(shuffle(other.slice())), out = [], seen = new Set([String(w[field]).toLowerCase()]);
  for (const x of pool) { const v = String(x[field] || "").toLowerCase(); if (!v || seen.has(v)) continue; seen.add(v); out.push(x); if (out.length >= n) break; }
  return out;
}
const norm = s => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/\(.*?\)/g, "").replace(/[^a-z' -]/g, "").replace(/\s+/g, " ").trim();
function kindFor(id) {
  const w = S.words[id]; if (!w.s) return "learn";
  const b = w.b, cl = !!findForm(W[id].w, W[id].ex);
  if (b <= 0) return "mean";
  if (b === 1) return "word";
  if (b === 2) return cl ? "cloze" : "word";
  return cl ? "type" : "typemean";
}
function review() {
  const L = dueList(), queue = L.due.concat(L.fresh).map(id => ({ id, k: kindFor(id) })), total = queue.length, wrong = new Set(), first = {};
  let i = 0, right = 0;
  if (!total) return home();
  const next = () => {
    if (i >= queue.length) return finish();
    const q = queue[i], w = W[q.id];
    const head = '<div class="qtop"><span class="prog"><i style="width:' + Math.round(i / queue.length * 100) + '%"></i></span><span class="qcount">' + Math.min(i + 1, queue.length) + "/" + queue.length + "</span></div>";
    if (q.k === "learn") {
      shell('<section class="card">' + head + '<span class="qtype">🌱 Từ mới · làm quen</span>' + cardHtml(w) + '<div class="nav"><button class="btn primary" id="nx">Em đã đọc kỹ ➔ Kiểm tra</button></div></section>');
      bindSay(app); say(w.w);
      document.getElementById("nx").onclick = () => { q.k = "mean"; q.isNew = true; next(); };
      return;
    }
    let prompt = "", opts = null, answer = w.w, typeMode = false, label = "";
    if (q.k === "mean") { label = "Chọn nghĩa đúng"; prompt = '<div class="qbig">' + esc(w.w) + '</div><p class="ipa">' + esc([w.ipa, w.pos].filter(Boolean).join(" · ")) + ' <button class="say" data-say="' + esc(w.w) + '">▶</button></p>'; opts = shuffle([w].concat(distract(q.id, "vi", 3))).map(x => ({ t: x.vi, ok: x.id === q.id })); }
    else if (q.k === "word") { label = "Chọn từ đúng nghĩa"; prompt = '<p class="qtext">' + esc(w.vi) + "</p>" + (w.col ? '<p class="small muted">Gợi ý collocation: ' + esc(w.col.replace(new RegExp(w.w.split(" ")[0], "ig"), "___")) + "</p>" : ""); opts = shuffle([w].concat(distract(q.id, "w", 3))).map(x => ({ t: x.w, ok: x.id === q.id })); }
    else if (q.k === "cloze" || q.k === "type") {
      const r = findForm(w.w, w.ex), form = w.ex.slice(r[0], r[1]); answer = form;
      label = q.k === "cloze" ? "Điền từ vào câu của bài đọc" : "Tự gõ từ còn thiếu";
      prompt = '<p class="qtext">' + esc(w.ex.slice(0, r[0])) + '<span class="gap"></span>' + esc(w.ex.slice(r[1])) + '</p><p class="small muted">Nghĩa: ' + esc(w.vi) + (q.k === "type" ? " · bắt đầu bằng <b>" + esc(form.slice(0, 1)) + "</b> · " + form.length + " chữ cái" : "") + "</p>";
      if (q.k === "cloze") opts = shuffle([w].concat(distract(q.id, "w", 3))).map(x => ({ t: x.w, ok: x.id === q.id })); else typeMode = true;
    } else { label = "Tự gõ từ theo nghĩa"; prompt = '<p class="qtext">' + esc(w.vi) + '</p><p class="small muted">' + (w.pos ? esc(w.pos) + " · " : "") + "bắt đầu bằng <b>" + esc(w.w.slice(0, 1)) + "</b></p>"; typeMode = true; }
    shell('<section class="card">' + head + '<span class="qtype">' + label + "</span>" + prompt +
      (typeMode ? '<form class="typein" id="tf"><input id="ti" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ…"><button class="btn primary" type="submit">Kiểm tra</button></form><button class="btn ghost block" id="idk" style="margin-top:10px">Em chưa nhớ — xem đáp án</button>'
        : '<div class="opts">' + opts.map((o, k) => '<button class="opt" data-k="' + k + '">' + esc(o.t) + "</button>").join("") + "</div>") + '<div id="fb"></div></section>');
    bindSay(app);
    const decide = ok => {
      if (!(q.id in first)) { first[q.id] = ok; grade(q.id, ok); if (ok) right++; else wrong.add(q.id); }
      if (!ok && !q.again) queue.push({ id: q.id, k: q.k === "type" || q.k === "typemean" ? "word" : q.k, again: true });
      S.days[dayNow()] = 1; save();
      document.getElementById("fb").innerHTML = '<div class="fb ' + (ok ? "ok" : "no") + '"><b class="h">' + (ok ? "Đúng rồi! 🎉" : "Chưa đúng — đáp án: " + esc(answer)) + "</b>" + (ok ? (w.col ? "Collocation: <em>" + esc(w.col) + "</em>" : "") : "") + "</div>" + (ok ? "" : cardHtml(w)) +
        '<div class="nav"><button class="btn primary" id="nx">Tiếp ➔</button></div>';
      bindSay(app); if (!ok) say(w.w);
      document.getElementById("nx").onclick = () => { i++; next(); };
      document.getElementById("nx").focus();
    };
    if (typeMode) {
      const ti = document.getElementById("ti"); ti.focus();
      document.getElementById("tf").onsubmit = ev => { ev.preventDefault(); if (!ti.value.trim()) return; ti.disabled = true; app.querySelector("#tf button").disabled = true; document.getElementById("idk").remove();
        const v = norm(ti.value), ok = v === norm(answer) || v === norm(w.w) || norm(w.w).split(" / ").includes(v); decide(ok); };
      document.getElementById("idk").onclick = () => { ti.disabled = true; app.querySelector("#tf button").disabled = true; document.getElementById("idk").remove(); decide(false); };
    } else app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      const o = opts[+b.dataset.k]; app.querySelectorAll(".opt").forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add("ok"); }); if (!o.ok) b.classList.add("no"); decide(o.ok);
    });
  };
  const finish = () => {
    S.rev = dayNow(); save(); flush(false);
    shell('<section class="card done"><div class="big">🌳</div><h1>Cây đã được tưới!</h1><p>Em trả lời đúng ngay lần đầu <b>' + right + "/" + total + "</b> từ." + (wrong.size ? " Những từ chưa nhớ sẽ quay lại vào ngày mai." : "") + "</p>" +
      (streak() > 1 ? "<p>🔥 " + streak() + " ngày liền tưới cây.</p>" : "") + '<button class="btn primary block" id="hm">Xem cây của em</button></section>');
    document.getElementById("hm").onclick = home;
  };
  next();
}

/* ---------- khởi động ---------- */
if (!P.length) { app.innerHTML = '<section class="card narrow center"><h1>Chưa tải được từ vựng</h1><p>Em kiểm tra mạng rồi tải lại trang.</p></section>'; return; }
if (!student) entry(home); else { loadLocal(); home(); pull().then(ch => { if (ch && !app.querySelector(".qtop")) home(); }); }
})();
