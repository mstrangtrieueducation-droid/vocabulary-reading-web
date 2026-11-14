/* Luyện phát âm IELTS — 50 tuần. Ms Trang Trieu Education.
   Luyện trên web (nghe mẫu, nghe chậm, thu giọng, nghe lại, so sánh) → bước cuối quay màn hình và nộp Google Form.
   Phần ghi âm lấy cách làm của trang Nền tảng IELTS: mỗi lượt xin micro mới rồi tắt hẳn (iPhone), iPhone ghi mp4. */
(() => {
"use strict";
const C = Object.assign({ CLASSES: [], FORM_URL: "", FORM_ENTRIES: {}, API: "" }, window.PA_CONFIG || {});
const D = window.PA_DATA || [];
const S = window.PA_SOUNDS || {};
const app = document.getElementById("app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mark = s => esc(s).replace(/\*([^*]+)\*/g, '<b class="st">$1</b>').replace(/\s*([↗↘])/g, '<span class="ar">&nbsp;$1</span>').replace(/ \/ /g, ' <span class="pz">/</span> ').replace(/‿/g, '<span class="lk">‿</span>');
/* tô màu âm khó: m = [[đầu, cuối, khoá âm, 1 trọng tâm | 0 chung, màu?]] theo vị trí trong chuỗi gốc (xem scripts/luyen-phat-am/sounds.mjs) */
function render(t, m) {
  const ms = (m || []).filter(x => S[x[2]]).sort((a, b) => a[0] - b[0]);
  if (!ms.length) return mark(t);
  let out = "", pos = 0;
  ms.forEach((x, i) => { if (x[0] < pos) return; out += t.slice(pos, x[0]) + "\uE000" + String.fromCharCode(0xE100 + i) + t.slice(x[0], x[1]) + "\uE001"; pos = x[1]; });
  out += t.slice(pos);
  return mark(out).replace(/\uE000([\uE100-\uEFFF])/g, (_, c) => { const x = ms[c.charCodeAt(0) - 0xE100]; return '<span class="snd c-' + (x[4] || S[x[2]].c) + (x[3] ? " f" : "") + '" data-k="' + esc(x[2]) + '">'; }).replace(/\uE001/g, "</span>");
}
const wordAt = (t, a, b) => { while (a > 0 && /[A-Za-zé'’]/.test(t[a - 1])) a--; while (b < t.length && /[A-Za-zé'’]/.test(t[b])) b++; return t.slice(a, b); };
const ipaOf = k => S[k].ipa && S[k].ipa !== "cụm" ? S[k].ipa : "";
/* hộp "Chú ý khi đọc": âm trọng tâm của tuần (kèm cách đọc) + chip các âm khó chung và kí hiệu có trong câu */
function keyBox(parts, compact) {
  const K = new Map();
  parts.forEach(p => (p.m || []).forEach(([a, b, k, f, c]) => {
    if (!S[k]) return;
    let e = K.get(k); if (!e) K.set(k, e = { f: 0, c: c || S[k].c, w: [] });
    if (f) e.f = 1;
    const w = wordAt(p.t, a, b); if (w && e.w.indexOf(w) < 0) e.w.push(w);
  }));
  const all = parts.map(p => p.t).join(" "), focus = [], rest = [];
  K.forEach((e, k) => (e.f && !compact ? focus : rest).push([k, e]));
  const chip = ([k, e]) => '<button type="button" class="kchip c-' + e.c + (e.f ? " f" : "") + '" data-k="' + esc(k) + '"><i></i>' + esc(ipaOf(k) || S[k].n) + (ipaOf(k) ? " <small>" + esc(S[k].n) + "</small>" : "") + "</button>";
  const sym = [];
  if (/\*[^*]+\*/.test(all)) sym.push('<span class="kx"><b class="st">Aa</b> nhấn mạnh</span>');
  if (/ \/ /.test(all)) sym.push('<span class="kx"><span class="pz">/</span> ngắt hơi</span>');
  if (/[↗↘]/.test(all)) sym.push('<span class="kx"><span class="ar">↗↘</span> lên / xuống giọng</span>');
  if (/‿/.test(all)) sym.push('<span class="kx"><span class="lk">‿</span> nối âm</span>');
  if (!focus.length && !rest.length && !sym.length) return "";
  return '<div class="keys">' +
    focus.map(([k, e]) => '<div class="krow c-' + e.c + '"><span class="kb">' + esc(ipaOf(k) || "cụm") + '</span><span class="kt"><b>' + esc(S[k].n.charAt(0).toUpperCase() + S[k].n.slice(1)) + (ipaOf(k) ? " " + esc(ipaOf(k)) : "") + "</b>" + (e.w.length && (parts.length > 1 || e.w[0] !== parts[0].t) ? '<span class="kw">' + e.w.slice(0, 5).map(esc).join(" · ") + "</span>" : "") + "<em>" + esc(S[k].tip) + "</em></span></div>").join("") +
    (rest.length || sym.length ? '<div class="kmore">' + (rest.length && !compact && focus.length ? '<span class="kl">Chú ý thêm</span>' : "") + rest.map(chip).join("") + sym.join("") + "</div>" : "") +
    '<p class="ktip" hidden></p></div>';
}
function showTip(el) {
  const scope = el.closest(".kscope"); if (!scope) return;
  const tip = scope.querySelector(".ktip"), k = el.dataset.k; if (!tip || !S[k]) return;
  const same = tip.dataset.k === k && !tip.hidden && tip.dataset.w === (el.classList.contains("snd") ? el.textContent : "");
  scope.querySelectorAll(".snd.hot").forEach(x => x.classList.remove("hot"));
  if (same) { tip.hidden = true; tip.dataset.k = ""; return; }
  let w = "";
  if (el.classList.contains("snd")) { const host = el.parentNode; const txt = host.textContent; let off = 0; for (const n of host.childNodes) { if (n === el) break; off += n.textContent.length; } w = wordAt(txt, off, off + el.textContent.length); }
  tip.dataset.k = k; tip.dataset.w = el.classList.contains("snd") ? el.textContent : "";
  tip.innerHTML = (w ? "<b>" + esc(w) + "</b> · " : "") + '<span class="kb sm">' + esc(ipaOf(k) || "cụm") + "</span> <b>" + esc(S[k].n.charAt(0).toUpperCase() + S[k].n.slice(1)) + "</b>: " + esc(S[k].tip);
  tip.hidden = false;
  scope.querySelectorAll('.snd[data-k="' + k + '"]').forEach(x => x.classList.add("hot"));
}
app.addEventListener("click", ev => { const el = ev.target.closest && ev.target.closest(".snd, .kchip"); if (el && app.contains(el)) showTip(el); });
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fi" d="M4 9.5v5h3.6L13 19V5L7.6 9.5z"/><path d="M16.2 9a4.2 4.2 0 0 1 0 6M18.8 6.4a8 8 0 0 1 0 11.2"/></svg>',
  slow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fi" d="M4 9.5v5h3.6L13 19V5L7.6 9.5z"/><path d="M16.2 9a4.2 4.2 0 0 1 0 6"/><circle class="fi" cx="20" cy="12" r="1.1"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="fi" x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>',
  me: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fi" d="M8 5.5v13l10.5-6.5z"/></svg>',
  cmp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h12.5l-3-3M20 15H7.5l3 3"/></svg>'
};
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2800); }
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
let student = store.get("pa-student");
try {   // mở từ dashboard lớp (ô 🎙 Luyện phát âm): ?w=…&name=…&cls=… — họ tên + lớp của học sinh đang xem
  const q = new URLSearchParams(location.search), qn = (q.get("name") || "").replace(/\s+/g, " ").trim(), qc = (q.get("cls") || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (qn.length >= 5 && C.CLASSES.indexOf(qc) >= 0) { student = { name: qn, cls: qc }; store.set("pa-student", student); }
  if (q.has("name") || q.has("cls")) { q.delete("name"); q.delete("cls"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "")); }
} catch (e) {}
if (student && (!student.name || C.CLASSES.indexOf(student.cls) < 0)) student = null;
const P = store.get("pa-progress") || {};
const saveP = () => store.set("pa-progress", P);
const prog = w => P[w] || (P[w] = { d: {}, sub: 0 });

/* ---------- kết quả máy chấm (Apps Script → Gemini) ---------- */
let R = null, PASS = 80, rTok = 0;
async function loadResults(force) {
  if (!C.API || !student) return null;
  if (R && !force) return R;
  try {
    const u = new URL(C.API);
    u.searchParams.set("action", "pa"); u.searchParams.set("name", student.name); u.searchParams.set("cls", student.cls); u.searchParams.set("t", Date.now());
    const j = await fetch(u.href).then(r => r.json());
    if (!j || !j.ok) return R;
    PASS = j.pass || 80; R = {};
    (j.results || []).forEach(x => (R[x.code] = R[x.code] || []).push(x));
    store.set("pa-results", { who: student.name + "|" + student.cls, R });
    return R;
  } catch (e) { return R; }
}
(() => { const c = store.get("pa-results"); if (c && student && c.who === student.name + "|" + student.cls) R = c.R; })();
const resList = code => (R && R[code]) || [];
const resLast = code => { const a = resList(code); return a.length ? a[a.length - 1] : null; };
const resBest = code => resList(code).filter(x => x.status === "Đã chấm").sort((a, b) => b.score - a.score)[0] || null;
const PENDING = ["Chờ chấm", "Đang chấm", "Lỗi, thử lại"];
function scoreBadge(code) {
  const last = resLast(code), best = resBest(code);
  if (best && best.pass) return '<span class="sc ok">' + best.score + " điểm ✓</span>";
  if (last && PENDING.indexOf(last.status) >= 0) return '<span class="sc wait">Đang chấm</span>';
  if (last && last.status === "Đã chấm") return '<span class="sc bad">' + last.score + " · nộp lại</span>";
  if (last) return '<span class="sc wait">Cô xem lại</span>';
  return "";
}
const fmtAt = iso => { try { const d = new Date(iso); return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }); } catch (e) { return ""; } };
function resultCard(L) {
  const last = resLast(L.code);
  if (!C.API) return "";
  if (!last) return '<div class="res none"><b>Kết quả chấm</b><p>Em chưa có bài nộp cho ' + L.code + '. Nộp xong, máy chấm trong khoảng 5–15 phút và điểm hiện ngay ở đây.</p><button class="btn ghost sm" id="rf">Cập nhật kết quả</button></div>';
  const head = '<div class="res-h"><b>Kết quả chấm</b><small>Nộp lúc ' + esc(fmtAt(last.at)) + (resList(L.code).length > 1 ? " · lần " + resList(L.code).length : "") + "</small></div>";
  if (PENDING.indexOf(last.status) >= 0) return '<div class="res wait">' + head + "<p>⏳ Cô đã nhận video. Máy đang chấm, khoảng 5–15 phút nữa em bấm <b>Cập nhật kết quả</b> nhé.</p>" + '<button class="btn ghost sm" id="rf">Cập nhật kết quả</button></div>';
  if (last.status !== "Đã chấm" || !last.fb) return '<div class="res wait">' + head + "<p>" + (last.status === "Không có video" ? "Bài nộp chưa có video. Em quay lại và nộp lại nhé." : "Video chưa chấm tự động được, cô sẽ xem và chấm tay.") + '</p><button class="btn ghost sm" id="rf">Cập nhật kết quả</button></div>';
  const fb = last.fb, sents = [].concat.apply([], L.q.map(q => q.s));
  const bad = (fb.sentences || []).filter(x => !x.ok), foc = fb.focus || [];
  return '<div class="res ' + (last.pass ? "ok" : "bad") + '">' + head +
    '<div class="res-s"><span class="big">' + last.score + "</span><span><b>" + (last.pass ? "Đạt" : "Chưa đạt") + "</b><small>" + (last.pass ? "Đạt từ " + PASS + " điểm. Giỏi lắm!" : "Cần từ " + PASS + " điểm. Em luyện lại phần được nhắc, quay và nộp lại nhé.") + "</small></span></div>" +
    (fb.summary ? '<p class="res-sum">' + esc(fb.summary) + "</p>" : "") +
    (bad.length ? '<h4>Câu cần sửa</h4><ul class="res-l">' + bad.map(x => "<li><span class=\"qt\">Câu " + x.i + ": " + render(sents[x.i - 1] ? sents[x.i - 1].t : "", sents[x.i - 1] ? sents[x.i - 1].m : []) + "</span>" + (x.issue ? "<em>" + esc(x.issue) + "</em>" : "") + (x.fix ? "<i>→ " + esc(x.fix) + "</i>" : "") + "</li>").join("") + "</ul>" : "") +
    (foc.length ? '<h4>Âm trọng tâm đọc chưa đúng</h4><ul class="res-l">' + foc.map(x => "<li><b>" + esc(x.w) + "</b>" + (x.heard ? ' <span class="heard">em đọc ' + esc(x.heard) + "</span>" : "") + (x.fix ? "<i>→ " + esc(x.fix) + "</i>" : "") + "</li>").join("") + "</ul>" : "") +
    ((fb.tips || []).length ? '<h4>Lời khuyên</h4><ul class="res-t">' + fb.tips.map(t => "<li>" + esc(t) + "</li>").join("") + "</ul>" : "") +
    '<button class="btn ghost sm" id="rf">Cập nhật kết quả</button></div>';
}

/* ---------- máy & trình duyệt ---------- */
const UA = navigator.userAgent || "";
const IN_APP = /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|TikTok|musical_ly|; wv\)/i.test(UA);
const IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/i.test(UA);
function inAppHtml() {
  if (!IN_APP) return "";
  const url = location.href, chrome = "intent://" + url.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;end";
  return '<div class="inapp"><b>Em đang mở trong ' + (/Zalo/i.test(UA) ? "Zalo" : /FBAN|FBAV|FB_IAB|Messenger/i.test(UA) ? "Facebook/Messenger" : "ứng dụng") + '.</b> Ở đây máy thường không cho dùng micro. ' +
    (IS_ANDROID ? '<a class="btn-open" href="' + esc(chrome) + '">Mở bằng Chrome</a>' : "Em bấm nút <b>⋯</b> ở góc trên → chọn <b>Mở bằng trình duyệt / Safari</b>.") + "</div>";
}

/* ---------- âm thanh: giọng mẫu ---------- */
const player = new Audio(); player.preload = "auto";
const mine = new Audio();
let playTok = 0;
function stopAudio() { playTok++; try { player.pause(); mine.pause(); } catch (e) {} document.querySelectorAll(".btn.playing").forEach(b => b.classList.remove("playing")); }
function playOne(el, src, rate) {
  return new Promise(res => {
    el.onended = () => res(true); el.onerror = () => res(false);
    el.src = src; el.playbackRate = rate || 1; try { el.preservesPitch = true; el.webkitPreservesPitch = true; } catch (e) {}
    const p = el.play(); if (p && p.catch) p.catch(() => res(false));
  });
}
async function playModel(ids, slow, btn) {
  stopAudio(); const tok = playTok; if (btn) btn.classList.add("playing");
  for (const h of ids) {
    const ok = await playOne(player, "./audio/" + h + ".mp3", slow ? 0.7 : 1);
    if (tok !== playTok) return false;
    if (!ok) { toast("Chưa phát được giọng mẫu. Em kiểm tra mạng rồi bấm lại."); break; }
    if (ids.length > 1) await new Promise(r => setTimeout(r, slow ? 450 : 250));
    if (tok !== playTok) return false;
  }
  if (btn) btn.classList.remove("playing");
  return true;
}
async function playMine(url, btn) {
  stopAudio(); const tok = playTok; if (btn) btn.classList.add("playing");
  await playOne(mine, url, 1);
  if (tok === playTok && btn) btn.classList.remove("playing");
}

/* ---------- ghi âm (theo trang Nền tảng IELTS) ---------- */
const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
let micStream = null, recorder = null, autoStop = null;
function pickMime() {
  const list = IS_IOS ? ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"] : ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];
  for (const m of list) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m; return "";
}
function releaseMic() { if (micStream) { micStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); micStream = null; } }
async function getMic() {
  releaseMic();
  micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 } });
  return micStream;
}
function recordStart(onStarted) {
  return getMic().then(stream => new Promise((resolve, reject) => {
    const mime = pickMime(), chunks = [];
    let r; try { r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); } catch (e) { releaseMic(); return reject({ name: "recorder" }); }
    recorder = r; r.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    r.onstop = () => { recorder = null; const blob = new Blob(chunks, { type: r.mimeType || mime || "audio/webm" }); releaseMic(); resolve(blob); };
    r.onerror = () => { recorder = null; releaseMic(); reject({ name: "recorder" }); };
    if (IS_IOS) r.start(); else r.start(250);
    if (onStarted) onStarted();
  }));
}
function recordStop() { clearTimeout(autoStop); if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch (e) {} } }
function recErrorText(e) {
  const n = e && e.name ? e.name : String(e);
  if (IN_APP) return "Ứng dụng đang mở link (Zalo/Facebook…) không cho dùng micro. Em mở bằng Chrome hoặc Safari.";
  if (/NotAllowed|Permission|Security/i.test(n)) return IS_IOS ? "Em cho phép micro: bấm chữ “AA” cạnh địa chỉ web → Cài đặt trang web → Micrô → Cho phép, rồi tải lại trang." : "Em cho phép micro: bấm ổ khoá cạnh địa chỉ web → Micro → Cho phép, rồi tải lại trang.";
  if (/NotFound|Devices/i.test(n)) return "Không tìm thấy micro trên máy này.";
  return "Trình duyệt này chưa ghi âm được. Em dùng Chrome hoặc Safari bản mới.";
}

/* ---------- khung trang ---------- */
let cleanup = null;
function shell(html) {
  if (cleanup) { cleanup(); cleanup = null; }
  stopAudio(); recordStop();
  app.innerHTML = html; window.scrollTo(0, 0);
  const who = document.getElementById("who");
  if (student) { who.hidden = false; who.textContent = student.name + " · " + student.cls; who.title = "Đổi tên / lớp"; who.onclick = () => entry(route); } else who.hidden = true;
}
const weekParam = () => { const n = parseInt(new URLSearchParams(location.search).get("w"), 10); return n >= 1 && n <= D.length ? n : 0; };
function route() { const w = weekParam(); if (!student) return entry(route); return w ? lesson(D[w - 1]) : home(); }

/* ---------- nhập họ tên + lớp ---------- */
function entry(then) {
  const w = weekParam();
  shell('<section class="card narrow"><span class="kick">Luyện phát âm IELTS' + (w ? " · Tuần " + w : "") + '</span><h1 style="margin-top:6px">Em điền thông tin để vào bài</h1>' +
    '<form id="ef" novalidate><label class="field"><span>Họ và tên</span><input id="en" autocomplete="name" maxlength="80" placeholder="Nhập đầy đủ họ tên" value="' + esc(student ? student.name : "") + '"></label>' +
    '<label class="field"><span>Lớp</span><select id="ec"><option value="">Chọn lớp</option>' + C.CLASSES.map(c => '<option' + (student && student.cls === c ? " selected" : "") + ">" + esc(c) + "</option>").join("") + "</select></label>" +
    '<p class="err" id="ee" role="alert"></p><button class="btn primary big block" type="submit">Vào làm bài ➔</button></form>' +
    '<p class="small muted" style="margin-top:12px">Họ tên và lớp được điền sẵn vào Form khi em nộp bài, nên em nhập đúng nhé.</p></section>');
  document.getElementById("ef").onsubmit = ev => {
    ev.preventDefault();
    const name = document.getElementById("en").value.replace(/\s+/g, " ").trim(), cls = document.getElementById("ec").value, ee = document.getElementById("ee");
    if (name.split(" ").length < 2 || name.length < 5) { ee.textContent = "Em nhập đầy đủ họ và tên nhé."; return; }
    if (C.CLASSES.indexOf(cls) < 0) { ee.textContent = "Em chọn lớp của mình nhé."; return; }
    student = { name, cls }; store.set("pa-student", student); then();
  };
}

/* ---------- danh sách 50 tuần ---------- */
function home() {
  const groups = []; D.forEach(L => { let g = groups[groups.length - 1]; if (!g || g.name !== L.g) groups.push(g = { name: L.g, items: [] }); g.items.push(L); });
  const nsub = D.filter(L => P[L.w] && P[L.w].sub).length;
  shell(inAppHtml() + '<section class="card hello"><span class="kick">Luyện phát âm IELTS · 50 tuần</span><h1>Chào ' + esc(student.name.split(" ").pop()) + "!</h1>" +
    "<p>Mỗi tuần một lỗi phát âm và một chủ đề Speaking Part 1, khoảng 10–15 phút. Em nghe mẫu, nghe chậm, thu giọng mình để so sánh, rồi quay màn hình đọc bài và nộp cho cô.</p>" +
    '<div class="prog"><span style="width:' + Math.round(nsub / D.length * 100) + '%"></span></div><p class="progt">Đã nộp <b>' + nsub + "</b> / " + D.length + " tuần</p></section>" +
    groups.map(g => '<h2 class="grp">' + esc(g.name) + "<small>Tuần " + g.items[0].w + "–" + g.items[g.items.length - 1].w + '</small></h2><div class="weeks">' +
      g.items.map(L => '<a class="wk' + (P[L.w] && P[L.w].sub ? " done" : "") + '" href="?w=' + L.w + '"><span class="n">' + (P[L.w] && P[L.w].sub ? "✓" : L.w) + "</span><span><b>" + esc(L.s) + "</b><small>Tuần " + L.w + " · " + esc(L.t) + " · " + L.code + "</small></span>" + scoreBadge(L.code) + "</a>").join("") + "</div>").join(""));
  const tok = ++rTok;
  loadResults(true).then(() => { if (tok === rTok && !weekParam() && R) app.querySelectorAll(".wk").forEach(a => { const w = +new URL(a.href).searchParams.get("w"), L = D[w - 1]; const old = a.querySelector(".sc"); if (old) old.remove(); if (L) a.insertAdjacentHTML("beforeend", scoreBadge(L.code)); }); });
}

/* ---------- bài học ---------- */
const STEPS = [["Từ khoá", "Nghe – thu – so sánh"], ["Từng câu", "Câu trả lời Part 1"], ["Trọn câu", "Đọc liền một hơi"], ["Nộp bài", "Quay màn hình"]];
function lesson(L) {
  const pr = prog(L.w), recs = {};
  const items = [
    L.k.map(x => ({ kind: "w", parts: [x], html: render(x.t, x.m), ipa: x.ipa, vi: x.vi, audio: [x.a], max: 12 })).concat(L.r.map(x => ({ kind: "w", parts: [x], html: render(x.t, x.m), ipa: x.ipa, vi: x.vi, audio: [x.a], max: 12, review: x.from }))),
    [].concat.apply([], L.q.map((q, qi) => q.s.map((s, si) => ({ kind: "s", q: q.q, qa: q.qa, qi, parts: [s], html: render(s.t, s.m), audio: [s.a], max: 25, label: "Câu hỏi " + (qi + 1) + " · câu " + (si + 1) + "/" + q.s.length })))),
    L.q.map((q, qi) => ({ kind: "f", q: q.q, qa: q.qa, qi, parts: q.s, html: q.s.map(s => render(s.t, s.m)).join(" "), audio: q.s.map(s => s.a), max: 60, label: "Câu trả lời " + (qi + 1) + "/3" }))
  ];
  let step = 0, idx = 0, recording = false, busy = false, msg = "";
  shell("");
  cleanup = () => { Object.keys(recs).forEach(k => { try { URL.revokeObjectURL(recs[k]); } catch (e) {} }); };
  const done = (s, i) => (pr.d[s] || []).indexOf(i) >= 0;
  const stepOk = s => s < 3 ? items[s].every((x, i) => done(s, i)) : !!pr.sub;

  function head() {
    return '<section class="card lhead"><span class="kick">Tuần ' + L.w + " · " + esc(L.g) + "</span><h1>" + esc(L.s) + '</h1><div class="meta"><span class="tag">Part 1 · ' + esc(L.t) + " · " + esc(L.tv) + '</span><span class="tag code">' + L.code + "</span>" + scoreBadge(L.code) + "</div>" +
      (step === 0 && idx === 0 ? '<ol class="explain">' + L.x.map(t => "<li>" + mark(t) + "</li>").join("") + "</ol>" : '<details class="why"><summary>Xem lại cách đọc</summary><ol class="explain">' + L.x.map(t => "<li>" + mark(t) + "</li>").join("") + "</ol></details>") + "</section>" +
      '<nav class="steps" aria-label="Các bước">' + STEPS.map((s, i) => '<button data-step="' + i + '" class="' + (i === step ? "cur " : "") + (stepOk(i) ? "ok" : "") + '"><b>' + (stepOk(i) ? "✓ " : "") + "BƯỚC " + (i + 1) + "</b>" + s[0] + "</button>").join("") + "</nav>";
  }
  function bindSteps() { app.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { step = +b.dataset.step; idx = 0; msg = ""; draw(true); }); }

  function draw(top) {
    recordStop(); recording = false; busy = false; stopAudio();
    if (step === 3) return submit();
    const list = items[step], it = list[idx], key = step + ":" + idx, rec = recs[key];
    const html = inAppHtml() + head() + '<section class="card practice kscope"><div class="fc-top"><span class="count">' + (it.kind === "w" ? "Từ " + (idx + 1) + " / " + list.length + (it.review ? " · ôn lại tuần " + it.review : "") : esc(it.label)) + '</span><span class="dots">' + list.map((x, i) => '<i class="' + (done(step, i) ? "d " : "") + (i === idx ? "c" : "") + '"></i>').join("") + "</span></div>" +
      (it.q ? '<div class="qline"><span><b>Giám khảo hỏi</b>' + esc(it.q) + '</span><button class="btn tonal sm icon" id="qa" aria-label="Nghe câu hỏi">' + ICON.play + "</button></div>" : "") +
      '<h2 class="term ' + (it.kind === "s" ? "sent" : it.kind === "f" ? "full" : "") + '">' + it.html + "</h2>" +
      (it.ipa ? '<p class="ipa">' + esc(it.ipa) + '</p><p class="vi">' + esc(it.vi) + "</p>" : "") +
      keyBox(it.parts) +
      '<div class="audio"><button class="btn tonal" id="mdl">' + ICON.play + 'Nghe mẫu</button><button class="btn tonal" id="slow">' + ICON.slow + "Nghe chậm</button></div>" +
      (canRecord ? '<button class="mic' + (rec ? " has" : "") + '" id="mic"><span class="mi">' + ICON.mic + '</span><span class="ml">' + (rec ? "Thu lại" : "Bấm để thu giọng em") + "</span></button>" : '<p class="hint warn">Trình duyệt này chưa ghi âm được. Em vẫn nghe mẫu và đọc theo được; muốn thu giọng thì mở bằng Chrome hoặc Safari.</p>') +
      '<p class="hint' + (msg ? " warn" : "") + '" id="hint">' + (msg || (rec ? "Nghe lại giọng em rồi so với mẫu. Chưa giống thì thu lại, bao nhiêu lần cũng được." : it.kind === "f" ? "Nghe mẫu cả câu trả lời, rồi bấm micro và đọc liền một hơi." : "Nghe mẫu 2–3 lần, nghe chậm để bắt từng âm, rồi bấm micro và đọc.")) + "</p>" +
      (rec ? '<div class="audio mine"><button class="btn ghost" id="me">' + ICON.me + 'Giọng em</button><button class="btn ghost" id="cmp">' + ICON.cmp + "So sánh: mẫu → em</button></div>" : "") +
      '<div class="nav"><button class="btn ghost" id="pv"' + (step === 0 && idx === 0 ? " disabled" : "") + '>← Trước</button><button class="btn ' + (rec || done(step, idx) || !canRecord ? "primary" : "ghost") + '" id="nx">' + (idx + 1 < list.length ? "Tiếp ➔" : step === 2 ? "Sang bước nộp bài ➔" : "Sang bước " + (step + 2) + " ➔") + "</button></div></section>";
    const y = window.scrollY; app.innerHTML = html; if (top) window.scrollTo(0, 0); else window.scrollTo(0, y);
    bindSteps();
    const $ = id => document.getElementById(id);
    $("mdl").onclick = () => playModel(it.audio, false, $("mdl"));
    $("slow").onclick = () => playModel(it.audio, true, $("slow"));
    if ($("qa")) $("qa").onclick = () => playModel([it.qa], false, $("qa"));
    if ($("mic")) $("mic").onclick = toggle;
    if ($("me")) $("me").onclick = () => playMine(rec, $("me"));
    if ($("cmp")) $("cmp").onclick = async () => { const ok = await playModel(it.audio, false, $("cmp")); if (ok && $("cmp")) { await new Promise(r => setTimeout(r, 350)); playMine(recs[key], $("cmp")); } };
    $("pv").onclick = () => { msg = ""; if (idx > 0) idx--; else if (step > 0) { step--; idx = items[step].length - 1; } draw(true); };
    $("nx").onclick = () => { msg = ""; if (!canRecord && !done(step, idx)) { (pr.d[step] = pr.d[step] || []).push(idx); saveP(); } if (idx + 1 < list.length) idx++; else { step++; idx = 0; } draw(true); };
  }
  function setMic(label, live) { const m = document.getElementById("mic"); if (!m) return; m.classList.toggle("live", !!live); m.querySelector(".ml").textContent = label; }
  function toggle() {
    if (recording) { setMic("Đang lưu…"); recordStop(); return; }
    if (busy) return; busy = true; stopAudio();
    const s0 = step, i0 = idx, key = s0 + ":" + i0, it = items[s0][i0];
    setMic("Mở micro…");
    recordStart(() => {
      recording = true; setMic("🔴 Đang thu… đọc xong bấm lại", true);
      const h = document.getElementById("hint"); if (h) { h.className = "hint"; h.textContent = "Đợi nút chuyển đỏ rồi đọc to, rõ. Đọc xong bấm lại để dừng."; }
      autoStop = setTimeout(recordStop, it.max * 1000);
    }).then(blob => {
      recording = false; busy = false;
      if (s0 !== step || i0 !== idx || !document.getElementById("mic")) return;
      if (blob.size < 1200) { msg = "Máy chưa thu được tiếng. Em bấm micro, đợi nút chuyển đỏ rồi đọc to, xong bấm lại."; return draw(); }
      if (recs[key]) { try { URL.revokeObjectURL(recs[key]); } catch (e) {} }
      recs[key] = URL.createObjectURL(blob); msg = "";
      if (!done(s0, i0)) { (pr.d[s0] = pr.d[s0] || []).push(i0); saveP(); }
      draw();
    }).catch(err => { recording = false; busy = false; msg = recErrorText(err); if (s0 === step && i0 === idx) draw(); });
  }

  /* ----- bước cuối: quay màn hình và nộp Form ----- */
  function formUrl() {
    if (!C.FORM_URL) return "";
    try {
      const u = new URL(C.FORM_URL), E = C.FORM_ENTRIES || {};
      u.searchParams.set("usp", "pp_url");
      if (E.name) u.searchParams.set(E.name, student.name);
      if (E.classCode) u.searchParams.set(E.classCode, student.cls);
      if (E.lessonCode) u.searchParams.set(E.lessonCode, L.code);
      return u.href;
    } catch (e) { return ""; }
  }
  function submit() {
    const url = formUrl(), practised = [0, 1, 2].every(stepOk);
    app.innerHTML = head() + '<section class="card"><span class="kick">Bước 4 · Trả bài</span><h2 style="margin-top:4px">Quay màn hình, đọc 3 câu trả lời và nộp cho cô</h2>' + resultCard(L) +
      (practised ? "" : '<p class="hint warn" style="text-align:left;margin-top:10px">Em chưa luyện hết các bước 1–3. Em nên luyện xong rồi mới quay bài nộp.</p>') +
      '<div class="codebar"><span><small>Mã bài</small><b>' + L.code + "</b></span><span><small>Học sinh</small><b>" + esc(student.name) + " · " + esc(student.cls) + "</b></span></div>" +
      "<h3>Hướng dẫn trả bài</h3><ol class=\"guide\"><li>Em mở đúng màn hình này, tắt giọng mẫu, rồi bật <b>quay màn hình</b> và thu cả <b>micro</b>. Em không cần quay mặt.</li>" +
      "<li>Em <b>quay thử 10 giây</b>, nói một câu rồi xem lại để chắc chắn nghe rõ giọng em.</li>" +
      "<li>Em đọc to, rõ lần lượt <b>3 câu trả lời</b> trong khung vàng bên dưới (không cần đọc câu hỏi). Nhớ đúng âm của tuần này: <b>" + esc(L.s) + "</b>.</li>" +
      "<li>Đọc xong, em dừng quay màn hình rồi bấm <b>Nộp bài</b> để gửi đúng video của bài này.</li></ol>" +
      '<div class="sheet kscope"><h3>Em đọc 3 câu trả lời này trong video</h3>' + keyBox([].concat.apply([], L.q.map(q => q.s)), true) + L.q.map((q, i) => '<div class="a"><p class="qq">' + (i + 1) + ". " + esc(q.q) + '</p><p class="aa">' + q.s.map(s => render(s.t, s.m)).join(" ") + "</p></div>").join("") + "</div>" +
      '<div class="checks">' + L.q.map((q, i) => '<label><input type="checkbox"> Em đã đọc câu trả lời ' + (i + 1) + " trong video.</label>").join("") + '<label><input type="checkbox"> Em đã xem lại video: có hình màn hình này và nghe rõ giọng em.</label></div>' +
      (url ? '<a class="btn gold big block" id="send" href="' + esc(url) + '" target="_blank" rel="noopener">Nộp bài</a><p class="small muted center" style="margin-top:10px">Form đã điền sẵn họ tên, lớp và mã bài <b>' + L.code + "</b>. Em đăng nhập Google để tải video lên, bấm <b>Gửi</b> và chờ xác nhận đã nộp.</p>" :
        '<button class="btn gold big block off" id="send" disabled>Nộp bài</button><p class="hint warn">Cô chưa mở Form nộp bài cho khoá này. Em giữ video lại và báo cô nhé.</p>') +
      '<div class="nav"><button class="btn ghost" id="pv">← Luyện lại</button><a class="btn ghost" href="./">Danh sách 50 tuần</a></div></section>';
    window.scrollTo(0, 0); bindSteps();
    document.getElementById("pv").onclick = () => { step = 2; idx = 0; draw(true); };
    const rf = document.getElementById("rf");
    if (rf) rf.onclick = async () => { rf.disabled = true; rf.textContent = "Đang tải…"; await loadResults(true); if (step === 3) { const y = window.scrollY; submit(); window.scrollTo(0, y); } };
    const send = document.getElementById("send");
    if (url) send.onclick = () => { pr.sub = Date.now(); saveP(); const t = app.querySelector('[data-step="3"]'); if (t) { t.classList.add("ok"); t.querySelector("b").textContent = "✓ BƯỚC 4"; } };
  }
  draw(true);
  const tok = ++rTok;
  loadResults(true).then(() => { if (tok !== rTok || !R) return; if (step === 3) { const y = window.scrollY; submit(); window.scrollTo(0, y); } else { const m = app.querySelector(".lhead .meta"); if (m) { const o = m.querySelector(".sc"); if (o) o.remove(); m.insertAdjacentHTML("beforeend", scoreBadge(L.code)); } } });
}

if (!D.length) app.innerHTML = '<section class="card narrow center"><h1>Chưa tải được bài học</h1><p>Em kiểm tra mạng rồi tải lại trang.</p><button class="btn primary" onclick="location.reload()">Tải lại</button></section>';
else route();
})();
