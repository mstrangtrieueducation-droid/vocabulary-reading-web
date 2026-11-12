/* Nền tảng IELTS — Vocab B1 + Ngữ pháp nền tảng. Ms Trang Trieu Education. */
(() => {
"use strict";
const C = Object.assign({ API_URL: "", DAYS: 30, PASS: 80, FINAL_PASS: 70 }, window.NT_CONFIG || {});
const V = window.NT_VOCAB || [];
const G = window.NT_GRAMMAR || [];
const N_UNITS = V.length;
const app = document.getElementById("app");
const token = (new URLSearchParams(location.search).get("hs") || "").trim();
const KEY = "nt-ielts:" + token;
const DAY = 86400000;
let S = null;          // tiến độ của học sinh
let student = null;    // thông tin từ Sheet
let localMode = !C.API_URL;
let pendingEvents = [];

/* ---------- tiện ích ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const norm = s => String(s || "").toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fmtDate = t => { const d = new Date(t); return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(); };
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600); }
const entryOf = n => { for (const u of V) for (const e of u.entries) if (e.n === n) return e; return null; };
const unitOfEntry = n => V.find(u => u.entries.some(e => e.n === n));

/* ---------- lưu tiến độ ---------- */
function blank() { return { v: 1, start: null, units: {}, words: {}, final: null, updatedAt: 0 }; }
function U(i) { return S.units[i] || (S.units[i] = {}); }
function loadLocal() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function save(event) {
  S.updatedAt = Date.now();
  saveLocal();
  if (event) pendingEvents.push(Object.assign({ at: new Date().toISOString() }, event));
  if (localMode) return Promise.resolve();
  return push();
}
let pushing = null;
function push() {
  if (pushing) return pushing.then(() => push());
  const events = pendingEvents.splice(0);
  const body = JSON.stringify({ action: "save", hs: token, state: S, summary: summary(), events });
  setSync("saving");
  pushing = fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body })
    .then(r => r.json()).then(j => { if (!j.ok) throw new Error(j.error || "save"); setSync("ok"); })
    .catch(() => { pendingEvents = events.concat(pendingEvents); setSync("err"); })
    .finally(() => { pushing = null; });
  return pushing;
}
function setSync(s) {
  const el = document.getElementById("sync"); if (!el) return;
  el.className = "sync " + s;
  el.textContent = s === "ok" ? "☁️ Đã lưu" : s === "saving" ? "⏳ Đang lưu…" : s === "local" ? "💾 Bản thử" : "⚠️ Chưa lưu";
  el.hidden = false;
}
window.addEventListener("online", () => { if (!localMode && pendingEvents.length) push(); });
setInterval(() => { if (!localMode && pendingEvents.length) push(); }, 60000);

/* ---------- tiến độ & hạn ---------- */
const unitDone = i => { const u = S.units[i] || {}; return !!(u.learn && u.speak && u.speak.done && (u.quiz && u.quiz.best >= C.PASS) && u.gread && (u.gex && u.gex.best >= C.PASS)); };
const doneCount = () => { let n = 0; for (let i = 1; i <= N_UNITS; i++) if (unitDone(i)) n++; return n; };
const unlocked = i => i === 1 || unitDone(i - 1);
const allDone = () => doneCount() === N_UNITS;
const completed = () => !!(S.final && S.final.best >= C.FINAL_PASS && allDone());
function startTime() { return student && student.start ? new Date(student.start).getTime() : (S.start || Date.now()); }
function deadlineTime() { if (student && student.deadline) return new Date(student.deadline).getTime(); const s = new Date(startTime()); s.setHours(23, 59, 59, 0); return s.getTime() + (C.DAYS - 1) * DAY; }
function dayIndex() { const s = new Date(startTime()); s.setHours(0, 0, 0, 0); return Math.floor((today0() - s.getTime()) / DAY) + 1; }
function dayNow() { return Math.floor((today0() - (() => { const s = new Date(startTime()); s.setHours(0, 0, 0, 0); return s.getTime(); })()) / DAY); }
function pace() {
  const d = Math.max(1, dayIndex());
  const studyDays = C.DAYS - 2; // 2 ngày cuối: ôn tập & kiểm tra cuối khoá
  const target = Math.min(N_UNITS, Math.ceil(d * N_UNITS / studyDays));
  const done = doneCount();
  return { d, target, done, behind: Math.max(0, target - 1 - done) };
}
function summary() {
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : "";
  const q = [], g = [], sp = [];
  for (let i = 1; i <= N_UNITS; i++) { const u = S.units[i] || {}; if (u.quiz) q.push(u.quiz.best); if (u.gex) g.push(u.gex.best); if (u.speak && u.speak.score != null) sp.push(u.speak.score); }
  const weak = Object.entries(S.words).filter(([, w]) => w.miss > 0).sort((a, b) => b[1].miss - a[1].miss).slice(0, 10).map(([n]) => (entryOf(+n) || {}).term).filter(Boolean);
  const cur = (() => { for (let i = 1; i <= N_UNITS; i++) if (!unitDone(i)) return "Bài " + i; return S.final && S.final.best >= C.FINAL_PASS ? "Hoàn thành" : "Kiểm tra cuối khoá"; })();
  return {
    unitsDone: doneCount(), percent: Math.round((doneCount() + (completed() ? 1 : 0)) / (N_UNITS + 1) * 100), current: cur,
    vocab: avg(q), grammar: avg(g), speak: avg(sp), final: S.final ? S.final.best : "", weak: weak.join(", "), completed: completed()
  };
}

/* ---------- âm thanh ---------- */
let voice = null;
function pickVoice() {
  const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  const en = vs.filter(v => /^en[-_]US/i.test(v.lang));
  voice = en.find(v => /Google US English/i.test(v.name)) || en.find(v => /Samantha|Aria|Jenny|Ava|Allison/i.test(v.name)) || en[0] || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
const AUDIO = window.NT_AUDIO || {};
const player = new Audio(); player.preload = "auto";
let playQueue = [];
function cleanText(t) { return String(t).replace(/…/g, "").trim(); }
function playNext(rate) {
  const h = playQueue.shift(); if (!h) return;
  player.src = "./audio/" + h + ".mp3"; player.playbackRate = rate; try { player.preservesPitch = true; } catch (e) {}
  player.onended = () => setTimeout(() => playNext(rate), 250);
  const p = player.play(); if (p && p.catch) p.catch(() => {});
}
function ttsSay(text, slow) {
  if (!window.speechSynthesis) { toast("Máy này chưa phát được âm thanh. Em mở bằng Chrome hoặc Safari nhé."); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/…/g, "").replace(/\s*(~|><|#)\s*/g, ", ").replace(/\s*·\s*/g, ", "));
  u.lang = "en-US"; if (voice) u.voice = voice; u.rate = slow ? 0.6 : 0.9;
  speechSynthesis.speak(u);
}
function say(text, slow) {
  const t = cleanText(text);
  const parts = AUDIO[t] ? [t] : t.split(/\s*,\s*/).map(cleanText);
  const hs = parts.map(p => AUDIO[p]);
  if (hs.every(Boolean)) {
    if (window.speechSynthesis) speechSynthesis.cancel();
    player.pause(); playQueue = hs.slice(); playNext(slow ? 0.7 : 1);
    return;
  }
  ttsSay(text, slow);
}
function stopAudio() { playQueue = []; try { player.pause(); } catch (e) {} if (window.speechSynthesis) speechSynthesis.cancel(); }

/* ---------- nhận giọng nói & chấm ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const canListen = !!SR;
const UA = navigator.userAgent || "";
const IN_APP = /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|TikTok|musical_ly|; wv\)/i.test(UA);
const IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/i.test(UA);
function openOutsideHtml() {
  const url = location.href;
  const chrome = "intent://" + url.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;end";
  return '<div class="inapp"><b>Em đang mở trong ' + (/Zalo/i.test(UA) ? "Zalo" : /FBAN|FBAV|FB_IAB|Messenger/i.test(UA) ? "Facebook/Messenger" : "ứng dụng") + '.</b> Trong ứng dụng này máy thường không phát được âm thanh và không chấm được phát âm. ' +
    (IS_ANDROID ? '<a class="btn-open" href="' + esc(chrome) + '">Mở bằng Chrome</a>' : 'Em bấm nút <b>⋯</b> ở góc trên → chọn <b>Mở bằng trình duyệt / Safari</b>.') +
    ' <button class="mini" data-copylink>Copy link</button></div>';
}
function bindCopyLink() { app.querySelectorAll("[data-copylink]").forEach(b => b.onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => toast("Đã sao chép link, dán vào Chrome/Safari."), () => prompt("Sao chép link:", location.href)); }); }
function releaseAudio() {
  playQueue = [];
  try { player.pause(); player.removeAttribute("src"); player.load(); } catch (e) {}
  if (window.speechSynthesis) speechSynthesis.cancel();
}
function listenOnce() {
  return new Promise((resolve, reject) => {
    const r = new SR(); activeRec = r; r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 6; r.continuous = false;
    let done = false; const out = [];
    const finish = () => { done = true; clearTimeout(t); if (activeRec === r) activeRec = null; };
    const t = setTimeout(() => { try { r.stop(); } catch (e) {} }, 7000);
    r.onaudiostart = () => { const m = document.getElementById("mic"); if (m) { m.classList.add("live"); const l = m.querySelector(".ml"); if (l) l.textContent = "Đang nghe… đọc đi"; } };
    r.onresult = ev => { for (const res of ev.results) for (const alt of res) { out.push(alt.transcript); if (out.conf == null && alt.confidence > 0) out.conf = alt.confidence; } };
    r.onerror = ev => { if (done) return; finish(); reject(ev.error || "error"); };
    r.onend = () => { if (done) return; finish(); out.length ? resolve(out) : reject("no-speech"); };
    r.onnomatch = () => {};
    try { r.start(); } catch (e) { finish(); reject("busy"); }
  });
}
// Gọi ngay trong lúc bấm (iPhone cần), nếu máy báo "aborted"/"busy" thì tự thử lại tối đa 2 lần.
function listen() {
  releaseAudio();
  const attempt = n => listenOnce().catch(err => {
    if ((err === "aborted" || err === "busy") && n < 2 && !userStopped) return new Promise(res => setTimeout(res, 450)).then(() => attempt(n + 1));
    throw err;
  });
  userStopped = false;
  return attempt(0);
}
let userStopped = false;
let speakBroken = false;
const DEVICE_ERRORS = new Set(["not-allowed", "service-not-allowed", "network", "audio-capture", "language-not-supported", "bad-grammar", "error"]);
const OPTIONAL = new Set(["somebody", "something", "sb", "st", "a", "an", "the", "or", "verb", "b"]);
const SAME = [["flu", "flew"], ["weight", "wait"], ["sale", "sail"], ["fare", "fair"], ["whether", "weather"], ["piece", "peace"], ["principal", "principle"], ["aloud", "allowed"], ["brake", "break"], ["meat", "meet"], ["right", "write"], ["sole", "soul"], ["male", "mail"], ["bored", "board"], ["two", "to", "too", "2"], ["four", "for", "4"], ["one", "won", "1"], ["eight", "ate", "8"], ["hour", "our"], ["knew", "new"], ["know", "no"], ["through", "threw"], ["tale", "tail"], ["dear", "deer"], ["pain", "pane"], ["steal", "steel"], ["waist", "waste"], ["role", "roll"], ["site", "sight", "cite"], ["cell", "sell"], ["check", "cheque"], ["ok", "okay"], ["advert", "advirt"], ["licence", "license"], ["practise", "practice"], ["programme", "program"], ["colour", "color"], ["favour", "favor"], ["behaviour", "behavior"], ["centre", "center"], ["organise", "organize"], ["realise", "realize"]];
const sameMap = {}; SAME.forEach(g => g.forEach(w => sameMap[w] = g));
const eq = (a, b) => a === b || (sameMap[a] && sameMap[a].includes(b)) || a.replace(/-/g, "") === b.replace(/-/g, "");
function required(target) {
  const ws = norm(target.replace(/-/g, " ")).split(" ").filter(Boolean);
  const req = ws.filter(w => !OPTIONAL.has(w));
  return req.length ? req : ws;
}
function matches(target, alts) {
  const req = required(target);
  for (const alt of alts) {
    const hw = norm(alt.replace(/-/g, " ")).split(" ");
    let i = 0;
    for (const w of hw) if (i < req.length && eq(w, req[i])) i++;
    if (i === req.length) return true;
    if (norm(alt).replace(/ /g, "") === req.join("")) return true; // ví dụ: "eco friendly" ~ "ecofriendly"
  }
  return false;
}
function lev(a, b) { const m = []; for (let i = 0; i <= a.length; i++) { m[i] = [i]; } for (let j = 1; j <= b.length; j++) m[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
function advice(target, alts, entry) {
  const heard = alts[0] || "";
  const req = required(target);
  const hw = norm(heard).split(" ").filter(Boolean);
  const tips = [];
  for (const w of req) {
    if (hw.some(h => eq(h, w))) continue;
    let best = null, bd = 99; for (const h of hw) { const d = lev(h, w); if (d < bd) { bd = d; best = h; } }
    if (!best) { tips.push("Máy chưa nghe rõ từ “" + w + "”. Em đọc chậm, to và rõ hơn."); break; }
    if (w.startsWith(best) && best.length < w.length) tips.push("Em bị mất âm cuối của “" + w + "” (máy nghe thành “" + best + "”). Bật rõ âm cuối /" + w.slice(best.length) + "/.");
    else if (/s$/.test(w) && !/s$/.test(best)) tips.push("Nhớ đọc rõ âm /s/ hoặc /z/ ở cuối “" + w + "”.");
    else if (/ed$/.test(w) && !/(ed|t|d)$/.test(best)) tips.push("Nhớ đọc đuôi -ed của “" + w + "”.");
    else tips.push("Máy nghe “" + w + "” thành “" + best + "”. Nghe mẫu, chú ý nguyên âm và trọng âm rồi đọc lại.");
    break;
  }
  if (entry && entry.focus && entry.focus.length) tips.push("Lưu ý của cô: " + entry.focus.join(" "));
  return tips;
}
function micErrorText(e) {
  let m;
  if (IN_APP && e !== "no-speech") m = "Ứng dụng đang mở link (Zalo/Facebook…) không cho dùng micro. Em mở link bằng Chrome hoặc Safari để được chấm.";
  else if (e === "no-speech") m = "Máy chưa nghe thấy giọng em. Bấm micro, đợi nút chuyển sang “Đang nghe” rồi đọc to, gần máy.";
  else if ((e === "not-allowed" || e === "service-not-allowed") && IS_IOS) m = "iPhone đang chặn nhận giọng nói. Em vào Cài đặt → Cài đặt chung → Bàn phím → bật “Đọc chính tả”, và Cài đặt → Safari → Micrô → Cho phép. Sau đó tải lại trang.";
  else if (e === "not-allowed" || e === "service-not-allowed") m = "Em cần cho phép dùng micro: bấm biểu tượng ổ khoá/ⓘ cạnh địa chỉ web → Quyền → Micro → Cho phép, rồi tải lại trang.";
  else if (e === "network") m = "Chấm phát âm cần mạng ổn định. Em kiểm tra wifi/4G rồi thử lại.";
  else if (e === "audio-capture") m = "Không tìm thấy micro. Em kiểm tra tai nghe hoặc cho phép micro.";
  else if (e === "aborted" || e === "busy") m = "Micro vừa bị ngắt (thường do âm thanh mẫu đang phát). Em đợi 1 giây rồi bấm micro lại.";
  else m = "Máy chưa chấm được.";
  return m + " (mã: " + e + ")";
}

/* ---------- ôn tập ngắt quãng ---------- */
const BOX_DAYS = [0, 1, 3, 7, 14];
function mark(n, ok) {
  const w = S.words[n] || (S.words[n] = { box: 0, due: 0, miss: 0 });
  if (ok) w.box = Math.min(4, w.box + 1); else { w.box = 0; w.miss++; }
  w.due = dayNow() + BOX_DAYS[w.box] + (ok ? 0 : 1);
}
const dueWords = () => Object.entries(S.words).filter(([, w]) => w.box < 4 && w.due <= dayNow()).map(([n]) => +n);


/* ---------- khung trang ---------- */
const SH = window.NT_SHEET || [];
const STEPS = [
  { k: "learn", icon: "🎧", name: "Từ vựng", sub: "" },
  { k: "speak", icon: "🎙️", name: "Phát âm", sub: "" },
  { k: "quiz", icon: "⚡", name: "Luyện từ", sub: "20 câu" },
  { k: "gread", icon: "📐", name: "Công thức NP", sub: "" },
  { k: "gex", icon: "✍️", name: "Bài tập NP", sub: "12 câu" }
];
let keyHandler = null;
function onKeys(fn) { keyHandler = fn; }
document.addEventListener("keydown", e => {
  if (!keyHandler || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && e.key !== "Enter") return;
  keyHandler(e);
});
let shellSeq = 0;
function shell(inner, cls) {
  keyHandler = null; stopListening(); shellSeq++;
  app.className = cls || "";
  app.innerHTML = inner;
  app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(b.dataset.say, b.dataset.slow === "1"));
  app.querySelectorAll("[data-howto]").forEach(b => b.onclick = howto);
  bindCopyLink();
  window.scrollTo(0, 0);
}
let activeRec = null;
function stopListening() { if (activeRec) { userStopped = true; const r = activeRec; activeRec = null; try { r.abort(); } catch (e) {} } }
function go(where) {
  if (isLocked()) return lockScreen();
  const [v, a] = where.split(":");
  if (v === "home") return home();
  if (v === "unit") return unitView(+a);
  if (v === "learn") return learn(+a, firstUnseen(+a));
  if (v === "speak") return speak(+a);
  if (v === "quiz") return vocabQuiz(+a);
  if (v === "gread") return grammarRead(+a);
  if (v === "gex") return grammarQuiz(+a);
  if (v === "review") return review();
  if (v === "final") return finalTest();
}
function isLocked() { return !completed() && Date.now() > deadlineTime() && !localMode; }
function lockScreen() {
  shell('<section class="card center narrow"><img class="titi-lg" src="./titi/titi-calm.webp" alt=""><h1>Đã hết 30 ngày</h1><p>Chương trình kết thúc ngày ' + fmtDate(deadlineTime()) + " · em đã xong " + doneCount() + "/" + N_UNITS + " bài.</p><p class=\"muted\">Em liên hệ cô Trang để được gia hạn.</p></section>");
}
function howto() {
  const d = document.createElement("div"); d.className = "modal";
  d.innerHTML = '<div class="modal-box"><h2>Mỗi bài có 5 bước</h2><div class="pills">' + STEPS.map((s, j) => '<span class="pill">' + (j + 1) + ". " + s.icon + " " + s.name + (s.sub ? " (" + s.sub + ")" : "") + "</span>").join('<span class="arrow">➔</span>') + '</div><p class="muted">Luyện từ và Bài tập NP đạt ≥ ' + C.PASS + '% để mở bài kế tiếp. Nên dùng Chrome hoặc Safari, đeo tai nghe có micro.</p><button class="btn primary" id="mclose">Đã hiểu</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove();
  d.onclick = e => { if (e.target === d) close(); };
  d.querySelector("#mclose").onclick = close;
}

/* ---------- trạng thái bước ---------- */
function stepOk(i, k) {
  const u = S.units[i] || {};
  if (k === "learn") return !!u.learn;
  if (k === "speak") return !!(u.speak && u.speak.done);
  if (k === "quiz") return !!(u.quiz && u.quiz.best >= C.PASS);
  if (k === "gread") return !!u.gread;
  if (k === "gex") return !!(u.gex && u.gex.best >= C.PASS);
}
function stepScore(i, k) {
  const u = S.units[i] || {};
  if (k === "speak" && u.speak) return u.speak.score == null ? "không chấm" : u.speak.score + "%";
  if (k === "quiz" && u.quiz) return u.quiz.best + "%";
  if (k === "gex" && u.gex) return u.gex.best + "%";
  return stepOk(i, k) ? "✓" : "";
}
const stepOpen = (i, j) => unlocked(i) && (j === 0 || stepOk(i, STEPS[j - 1].k) || stepOk(i, STEPS[j].k));
const stepsDone = i => STEPS.filter(s => stepOk(i, s.k)).length;
function nextStep(i) { const j = STEPS.findIndex(s => !stepOk(i, s.k)); return j < 0 ? null : j; }
function currentUnit() { for (let i = 1; i <= N_UNITS; i++) if (!unitDone(i)) return i; return 0; }
function stepper(i, cur) {
  return '<nav class="stepper">' + STEPS.map((s, j) => {
    const ok = stepOk(i, s.k), open = stepOpen(i, j);
    return '<button class="st ' + (j === cur ? "cur " : "") + (ok ? "ok" : open ? "open" : "lock") + '" ' + (open ? 'data-go="' + s.k + ":" + i + '"' : "disabled") + '><span class="sn">' + (ok ? "✓" : j + 1) + '</span><span class="sl">' + s.icon + " " + s.name + "</span></button>";
  }).join("") + "</nav>";
}
function lessonHead(i, cur) {
  return '<header class="lhead"><button class="crumb" data-go="unit:' + i + '">← Bài ' + i + "</button><div class=\"lt\"><b>" + esc(V[i - 1].title) + '</b><span class="tag">' + esc((SH[i - 1] || {}).short || G[i - 1].title) + "</span></div></header>" + stepper(i, cur);
}

/* ---------- trang chủ ---------- */
function home() {
  const p = pace(), cu = currentUnit();
  const left = Math.max(0, Math.ceil((deadlineTime() - Date.now()) / DAY));
  const name = student && student.name ? student.name : "em";
  let status;
  if (completed()) status = '<span class="pace good">🏆 Đã hoàn thành chương trình</span>';
  else if (p.done >= p.target) status = '<span class="pace good">Đi trước tiến độ</span>';
  else if (p.behind === 0) status = '<span class="pace ok">Đúng tiến độ</span>';
  else status = '<span class="pace bad">Chậm ' + p.behind + " bài</span>";
  let today = "";
  if (cu) {
    const ns = nextStep(cu), dots = STEPS.map((s, j) => '<i class="' + (stepOk(cu, s.k) ? "ok" : j === ns ? "cur" : "") + '" title="' + s.name + '">' + s.icon + "</i>").join("");
    today = '<div class="today"><div class="tt"><span class="kick">BÀI HÔM NAY</span><h2>Bài ' + cu + " · " + esc(V[cu - 1].title) + '</h2><span class="tag light">' + esc((SH[cu - 1] || {}).short || "") + '</span><div class="dots">' + dots + '</div><span class="small">Tiến độ ' + stepsDone(cu) + '/5 bước</span><button class="btn gold big" data-go="' + STEPS[ns].k + ":" + cu + '">▶ ' + (stepsDone(cu) ? "Tiếp tục" : "Bắt đầu") + " Bài " + cu + " (Bước " + (ns + 1) + "/5) ➔</button></div><img class=\"titi-hero\" src=\"./titi/titi-good.webp\" alt=\"Cô giáo Titi\"></div>";
  } else {
    today = '<div class="today"><div class="tt"><span class="kick">CHẶNG CUỐI</span><h2>' + (completed() ? "Hoàn thành xuất sắc!" : "Kiểm tra cuối khoá") + '</h2><span class="small">40 câu · đạt ≥ ' + C.FINAL_PASS + '%</span><button class="btn gold big" data-go="final">' + (completed() ? "Làm lại để nâng điểm" : "▶ Vào bài kiểm tra") + ' ➔</button></div><img class="titi-hero" src="./titi/titi-top.webp" alt=""></div>';
  }
  const due = dueWords().length;
  let grid = "";
  for (let i = 1; i <= N_UNITS; i++) {
    const d = unitDone(i), op = unlocked(i), n = stepsDone(i);
    const seg = STEPS.map(s => '<i class="' + (stepOk(i, s.k) ? "on" : "") + '"></i>').join("");
    grid += '<button class="lc ' + (d ? "done" : op ? "open" : "lock") + (i === cu ? " cur" : "") + '" ' + (op ? 'data-go="unit:' + i + '"' : "disabled") + '><span class="no">' + String(i).padStart(2, "0") + '</span><span class="lcs">' + (d ? "✓ Xong" : op ? n + "/5" : "🔒") + '</span><b class="lct">' + esc(V[i - 1].title) + '</b><span class="tag">' + esc((SH[i - 1] || {}).short || "") + '</span><span class="seg">' + seg + "</span></button>";
  }
  const fin = S.final ? S.final.best + "%" : "";
  shell(
    (IN_APP ? openOutsideHtml() : "") + (localMode ? '<p class="demo">Bản thử: tiến độ chỉ lưu trên máy này.</p>' : "") +
    '<section class="hero"><div class="hello"><span class="kick">NỀN TẢNG IELTS · VOCAB B1 + NGỮ PHÁP</span><h1>Chào ' + esc(name) + "!</h1>" + status +
    '<div class="kpis"><div class="kpi"><span>📅</span><b>Ngày ' + Math.min(p.d, C.DAYS) + "/" + C.DAYS + "</b><small>Còn " + left + ' ngày</small></div><div class="kpi"><span>📚</span><b>' + p.done + "/" + N_UNITS + ' bài</b><small>Đã hoàn thành</small></div><div class="kpi"><span>🎯</span><b>' + (cu ? "Bài " + Math.max(p.target, cu) : "Cuối khoá") + "</b><small>Mục tiêu hôm nay</small></div></div>" +
    (due ? '<button class="review" data-go="review">🔁 Ôn ' + due + " từ đến hạn hôm nay ➔</button>" : "") + "</div>" + today + "</section>" +
    '<div class="sechead"><h2>Lộ trình 14 bài</h2><span class="muted">Đạt ≥ ' + C.PASS + '% để mở bài kế tiếp</span><button class="howbtn" data-howto>? Cách học</button></div>' +
    '<section class="grid">' + grid + "</section>" +
    '<button class="finalbar ' + (completed() ? "done" : allDone() ? "open" : "lock") + '" ' + (allDone() ? 'data-go="final"' : "disabled") + '><span class="fi">★</span><span><b>Kiểm tra cuối khoá</b><small>40 câu từ vựng + ngữ pháp · đạt ≥ ' + C.FINAL_PASS + "%</small></span><span class=\"fs\">" + (completed() ? "✓ " + fin : allDone() ? (fin || "Vào thi ➔") : "🔒 Xong 14 bài để mở") + "</span></button>",
    "wide");
  if (localMode) setSync("local"); else setSync(pendingEvents.length ? "err" : "ok");
}

/* ---------- trang bài (5 bước) ---------- */
function unitView(i) {
  if (!unlocked(i)) return home();
  const ns = nextStep(i);
  let cards = "";
  STEPS.forEach((s, j) => {
    const ok = stepOk(i, s.k), open = stepOpen(i, j), sc = stepScore(i, s.k);
    cards += '<button class="sc ' + (ok ? "ok" : open ? "open" : "lock") + (j === ns ? " next" : "") + '" ' + (open ? 'data-go="' + s.k + ":" + i + '"' : "disabled") + '><span class="si">' + s.icon + '</span><span class="sno">Bước ' + (j + 1) + "</span><b>" + s.name + "</b><small>" + (s.k === "learn" ? V[i - 1].entries.length + " từ" : s.k === "gread" ? esc((SH[i - 1] || {}).short || "") : s.sub || "Máy chấm") + '</small><span class="sb">' + (sc || (open ? "Bắt đầu ➔" : "🔒")) + "</span></button>";
  });
  shell('<header class="lhead"><button class="crumb" data-go="home">← Lộ trình</button><div class="lt"><b>Bài ' + i + " · " + esc(V[i - 1].title) + '</b><span class="tag">' + esc((SH[i - 1] || {}).short || "") + '</span></div><button class="howbtn" data-howto>? Cách học</button></header>' +
    stepper(i, ns == null ? -1 : ns) + '<section class="steps5">' + cards + "</section>" +
    (unitDone(i) ? '<div class="donebar">✓ Em đã xong Bài ' + i + (i < N_UNITS ? ' <button class="btn primary" data-go="unit:' + (i + 1) + '">Sang Bài ' + (i + 1) + " ➔</button>" : ' <button class="btn gold" data-go="final">Vào kiểm tra cuối khoá ➔</button>') + "</div>" : '<p class="muted center">Luyện từ & Bài tập NP đạt ≥ ' + C.PASS + "% để mở bài kế tiếp</p>"), "lesson");
}

/* ---------- Bước 1: học từ ---------- */
const seen = {};
function firstUnseen(i) { const s = seen[i] || new Set(); const es = V[i - 1].entries; const k = es.findIndex((e, j) => !s.has(j)); return k < 0 ? 0 : k; }
function exampleHtml(e) {
  if (!e.blank) return esc(e.ex);
  const [a, b] = e.blank; return esc(e.ex.slice(0, a)) + "<mark>" + esc(e.ex.slice(a, b)) + "</mark>" + esc(e.ex.slice(b));
}
function learn(i, k) {
  const es = V[i - 1].entries, e = es[k];
  const s = seen[i] || (seen[i] = new Set()); s.add(k);
  if (U(i).learn) es.forEach((x, j) => s.add(j));
  const all = s.size >= es.length;
  const spoken = e.speak.join(", ");
  const list = es.map((x, j) => '<button class="wl ' + (j === k ? "cur " : "") + (s.has(j) ? "seen" : "") + '" data-k="' + j + '"><span>' + (j + 1) + "</span>" + esc(x.term) + "</button>").join("");
  const more = (e.def || e.note || e.focus.length) ? '<details class="more"><summary>Giải thích thêm</summary>' + (e.def ? "<p>" + esc(e.def) + "</p>" : "") + (e.note ? "<p>📝 " + esc(e.note) + "</p>" : "") + (e.focus.length ? "<p>🎯 " + esc(e.focus.join(" ")) + "</p>" : "") + "</details>" : "";
  shell(lessonHead(i, 0) +
    '<section class="learn"><aside class="wlist">' + list + '</aside><article class="card flash"><div class="fc-top"><span class="count">' + (k + 1) + " / " + es.length + '</span><span class="type">' + esc(e.type) + "</span></div>" +
    '<h1 class="term">' + esc(e.term) + '</h1><p class="ipa">' + esc(e.ipa) + "</p>" +
    '<div class="audio"><button class="btn sound" data-say="' + esc(spoken) + '">🔊 Nghe</button><button class="btn ghost" data-say="' + esc(spoken) + '" data-slow="1">🐢 Chậm</button></div>' +
    '<p class="vi">' + esc(e.vi) + '</p><p class="ex">' + exampleHtml(e) + ' <button class="mini" data-say="' + esc(e.ex) + '" aria-label="Nghe câu ví dụ">🔊</button></p>' + more +
    '<div class="nav"><button class="btn ghost" id="prev" ' + (k ? "" : "disabled") + '>←</button>' +
    (k + 1 < es.length ? '<button class="btn primary" id="next">Từ tiếp ➔</button>' : "") +
    (all || k + 1 === es.length ? '<button class="btn gold" id="done">Hoàn thành bước 1 ✓</button>' : "") + "</div></article></section>", "lesson");
  say(spoken);
  app.querySelectorAll(".wl").forEach(b => b.onclick = () => learn(i, +b.dataset.k));
  const cur = app.querySelector(".wl.cur"); if (cur && cur.scrollIntoView && window.innerWidth >= 900) cur.scrollIntoView({ block: "nearest" });
  const pv = document.getElementById("prev"), nx = document.getElementById("next"), dn = document.getElementById("done");
  if (pv) pv.onclick = () => learn(i, k - 1);
  if (nx) nx.onclick = () => learn(i, k + 1);
  const finish = () => { U(i).learn = 1; save({ unit: i, part: "Học từ", score: "", detail: es.length + " từ" }); toast("Xong bước 1!"); speak(i); };
  if (dn) dn.onclick = finish;
  onKeys(ev => {
    if (ev.key === "ArrowRight" && k + 1 < es.length) learn(i, k + 1);
    else if (ev.key === "ArrowLeft" && k) learn(i, k - 1);
    else if (ev.key === " ") { ev.preventDefault(); say(spoken); }
    else if (ev.key === "Enter") { if (nx) nx.click(); else if (dn) dn.click(); }
  });
  // vuốt trái/phải trên điện thoại
  const card = app.querySelector(".flash"); let sx = null;
  card.addEventListener("touchstart", ev => { sx = ev.touches[0].clientX; }, { passive: true });
  card.addEventListener("touchend", ev => { if (sx == null) return; const dx = ev.changedTouches[0].clientX - sx; sx = null; if (dx < -60 && k + 1 < es.length) learn(i, k + 1); else if (dx > 60 && k) learn(i, k - 1); });
}

/* ---------- Bước 2: phát âm ---------- */
function micHtml(label) { return '<button class="mic" id="mic"><span class="mi">🎙️</span><span class="ml">' + (label || "Bấm để đọc") + "</span></button>"; }
function speak(i) {
  const es = V[i - 1].entries;
  if (!canListen || speakBroken) {
    shell(lessonHead(i, 1) + (IN_APP ? openOutsideHtml() : "") + '<section class="card center narrow"><div class="big-ico">🎙️</div><h2>Máy chưa chấm được phát âm</h2><p>' + (IN_APP ? "Mở link bằng Chrome hoặc Safari rồi vào lại bài này." : IS_IOS ? "iPhone: <b>Cài đặt → Cài đặt chung → Bàn phím → bật Đọc chính tả</b>; <b>Cài đặt → Safari → Micrô → Cho phép</b>. Mở bằng Safari rồi tải lại trang." : "Mở bằng <b>Chrome</b>, cho phép micro và có mạng ổn định.") + '</p><div class="nav center">' + (canListen ? '<button class="btn primary" id="retry">Thử lại</button>' : "") + '<button class="btn ghost" id="skip">Bỏ qua chấm bài này</button></div></section>', "lesson");
    const rt = document.getElementById("retry"); if (rt) rt.onclick = () => { speakBroken = false; speak(i); };
    document.getElementById("skip").onclick = () => { if (!U(i).speak) U(i).speak = { done: 1, score: null, unsupported: 1 }; else U(i).speak.done = 1; save({ unit: i, part: "Phát âm", score: "", detail: "Máy không hỗ trợ chấm" }); unitView(i); };
    return;
  }
  const res = es.map(() => ({ ok: false }));
  let k = 0, part = 0, tries = 0, viewId = 0, devFails = 0;
  function view(state) {
    ++viewId; state = state || {};
    const e = es[k], target = e.speak[part];
    const dots = [0, 1, 2].map(t => '<i class="' + (t < tries ? (state.good && t === tries - 1 ? "g" : "b") : "") + '"></i>').join("");
    let badge = "";
    if (state.good) badge = '<div class="badge good">' + (state.pct ? state.pct + "% · " : "") + "Chuẩn!</div>";
    else if (state.bad) badge = '<div class="badge bad">Cần đọc lại</div>';
    else if (state.warn) badge = '<div class="badge warn">Chưa chấm được</div>';
    shell(lessonHead(i, 1) + '<section class="card lab"><div class="fc-top"><span class="count">Từ ' + (k + 1) + " / " + es.length + (e.speak.length > 1 ? " · phần " + (part + 1) + "/" + e.speak.length : "") + '</span><span class="tries">' + dots + "</span></div>" +
      '<h1 class="term xl">' + esc(target) + '</h1><p class="ipa">' + esc(e.ipa) + '</p><p class="muted">' + esc(e.vi) + "</p>" +
      '<div class="audio center"><button class="btn sound" data-say="' + esc(target) + '">🔊 Nghe mẫu</button><button class="btn ghost" data-say="' + esc(target) + '" data-slow="1">🐢 Chậm</button></div>' +
      micHtml() + badge + (state.msg ? '<p class="hint">' + state.msg + "</p>" : "") +
      '<div class="nav center">' + (state.warn && devFails >= 2 ? '<button class="btn ghost" id="skipw">Bỏ qua từ này</button>' : "") + (state.good || tries >= 3 ? '<button class="btn primary" id="nx">' + (k + 1 < es.length || part + 1 < e.speak.length ? "Tiếp ➔" : "Xem kết quả ➔") + "</button>" : "") + "</div></section>", "lesson");
    document.getElementById("mic").onclick = doListen;
    const nx = document.getElementById("nx"); if (nx) nx.onclick = next;
    const sw = document.getElementById("skipw"); if (sw) sw.onclick = () => { res[k].skip = true; part = es[k].speak.length - 1; next(); };
    onKeys(ev => { if (ev.key === " ") { ev.preventDefault(); doListen(); } else if (ev.key === "Enter" && nx) nx.click(); });
  }
  function doListen() {
    const btn = document.getElementById("mic"); if (!btn || btn.disabled) return; btn.disabled = true; btn.querySelector(".ml").textContent = "Chuẩn bị…";
    const e = es[k], target = e.speak[part], seq = shellSeq;
    listen().then(alts => {
      if (seq !== shellSeq) return;
      tries++; devFails = 0;
      if (matches(target, alts)) {
        const pct = alts.conf ? Math.round(70 + 30 * alts.conf) : null;
        view({ good: 1, pct }); const id = viewId; setTimeout(() => { if (id === viewId) next(); }, 1100);
      } else {
        const tip = advice(target, alts, e)[0] || "";
        if (tries >= 3) { res[k].fail = true; view({ bad: 1, msg: "Máy nghe: “" + esc(alts[0]) + "”. " + esc(tip) + " Từ này sẽ vào phần ôn tập." }); }
        else view({ bad: 1, msg: "Máy nghe: “" + esc(alts[0]) + "”. " + esc(tip) });
      }
    }).catch(err => {
      if (seq !== shellSeq) return;
      if (DEVICE_ERRORS.has(err)) devFails++;
      if (devFails >= 4) { speakBroken = true; return speak(i); }
      view({ warn: 1, msg: esc(micErrorText(err)) });
    });
  }
  function next() {
    ++viewId;
    const e = es[k]; if (!e) return;
    if (part + 1 < e.speak.length) { part++; tries = 0; return view(); }
    if (!res[k].skip) { res[k].ok = !res[k].fail; mark(e.n, res[k].ok); }
    k++; part = 0; tries = 0;
    if (k < es.length) return view();
    const scored = res.filter(r => !r.skip), skipped = es.length - scored.length;
    const score = scored.length ? Math.round(scored.filter(r => r.ok).length / scored.length * 100) : null;
    const weak = es.filter((x, j) => !res[j].skip && !res[j].ok).map(x => x.n);
    const prev = U(i).speak;
    U(i).speak = { done: 1, score: score == null ? (prev && prev.score != null ? prev.score : null) : Math.max(score, prev && prev.score || 0), last: score, weak, skipped };
    save({ unit: i, part: "Phát âm", score: score == null ? "" : score, detail: (weak.length ? "Chưa đạt: " + weak.map(n => entryOf(n).term).join(", ") : "Đạt tất cả") + (skipped ? " · Không chấm được " + skipped + " từ" : "") });
    resultCard(i, "Phát âm", score == null ? 0 : score, weak.map(n => entryOf(n).term + " — " + entryOf(n).vi), { noPass: true, retry: () => speak(i), next: "quiz:" + i });
  }
  view();
}

/* ---------- bộ máy câu hỏi ---------- */
const LETTERS = ["A", "B", "C", "D", "E"];
function qBody(q, idx) {
  let h = '<p class="qlabel">' + q.label + "</p>";
  if (q.audio) h += '<div class="audio center"><button class="btn sound" data-say="' + esc(q.audio) + '">🔊 Nghe</button><button class="btn ghost" data-say="' + esc(q.audio) + '" data-slow="1">🐢 Chậm</button></div>';
  if (q.prompt) h += '<p class="prompt">' + q.prompt + "</p>";
  if (q.kind === "choice") h += '<div class="opts">' + q.options.map((o, j) => '<button class="opt" data-j="' + j + '"><span class="ol">' + LETTERS[j] + "</span><span>" + esc(o) + "</span></button>").join("") + "</div>";
  if (q.kind === "type") h += '<form id="tf" class="typef"><input id="ti" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Gõ đáp án" enterkeyhint="done"><button class="btn primary">Kiểm tra</button></form>';
  if (q.kind === "speak") h += micHtml("Bấm rồi nói");
  return h;
}
function runQuiz(opt, qs, onEnd) {
  const { title, head } = opt;
  let k = 0, right = 0, skipped = 0; const wrong = [];
  function view() {
    const q = qs[k];
    shell((head || "") + '<section class="card quiz"><div class="qtop"><span class="count">Câu ' + (k + 1) + " / " + qs.length + '</span><span class="qt">' + esc(title) + '</span><span class="score">✓ ' + right + '</span></div><div class="bar"><i style="width:' + Math.round(k / qs.length * 100) + '%"></i></div>' +
      qBody(q) + '<div class="fb" id="fb"></div><div class="nav right"><button class="btn primary" id="nx" hidden>' + (k + 1 < qs.length ? "Câu tiếp ➔" : "Xem kết quả ➔") + "</button></div></section>", "lesson");
    if (q.audio) say(q.audio);
    const fb = document.getElementById("fb"), nx = document.getElementById("nx");
    let answered = false, speakTries = 0;
    const finish = (ok, extra) => {
      if (answered) return; answered = true;
      if (ok) right++; else wrong.push(q.review || q.correctText);
      if (q.n) mark(q.n, ok);
      fb.className = "fb " + (ok ? "good" : "bad");
      fb.innerHTML = (ok ? "<b>✓ Chính xác!</b>" : "<b>✗ Đáp án: " + esc(q.correctText) + "</b>") + (extra ? ' <span class="muted">' + extra + "</span>" : "") + (q.why ? '<div class="why">' + esc(q.why) + "</div>" : "");
      const sc = app.querySelector(".qtop .score"); if (sc) sc.textContent = "✓ " + right;
      nx.hidden = false; nx.focus({ preventScroll: true });
    };
    const opts = app.querySelectorAll(".opt");
    const choose = j => {
      if (answered || !opts[j]) return;
      opts.forEach(x => x.disabled = true);
      opts[q.answer].classList.add("right"); if (j !== q.answer) opts[j].classList.add("wrong");
      finish(j === q.answer);
    };
    opts.forEach(b => b.onclick = () => choose(+b.dataset.j));
    if (q.kind === "type") {
      const ti = document.getElementById("ti"); if (window.innerWidth >= 900) ti.focus();
      document.getElementById("tf").onsubmit = ev => {
        ev.preventDefault(); if (answered) return nx.click();
        const v = ti.value.trim();
        if (!/[a-z0-9]/i.test(v) && !/^[0Ø-]$/.test(v)) { fb.className = "fb warn"; fb.textContent = "Em cần gõ câu trả lời."; return; }
        ti.disabled = true; finish(q.accept.some(a => typeNorm(a) === typeNorm(v)), "Em gõ: “" + esc(v) + "”");
      };
    }
    if (q.kind === "speak") document.getElementById("mic").onclick = () => {
      if (answered) return;
      const m = document.getElementById("mic"); m.disabled = true; m.querySelector(".ml").textContent = "Chuẩn bị…";
      const seq = shellSeq;
      listen().then(alts => {
        if (seq !== shellSeq) return;
        speakTries++;
        if (q.targets.some(t => matches(t, alts))) finish(true, "Máy nghe: “" + esc(alts[0]) + "”");
        else if (speakTries < 2) { fb.className = "fb bad"; fb.innerHTML = "Máy nghe: “" + esc(alts[0]) + "”. Thử lại lần nữa."; m.disabled = false; m.classList.remove("live"); m.querySelector(".ml").textContent = "Nói lại"; }
        else finish(false, "Máy nghe: “" + esc(alts[0]) + "”");
      }).catch(err => {
        if (seq !== shellSeq) return;
        fb.className = "fb warn"; fb.textContent = micErrorText(err); m.disabled = false; m.classList.remove("live"); m.querySelector(".ml").textContent = "Bấm rồi nói";
        if (DEVICE_ERRORS.has(err) && !document.getElementById("qskip")) {
          const sk = document.createElement("button"); sk.id = "qskip"; sk.className = "btn ghost"; sk.textContent = "Bỏ qua câu nói này";
          sk.onclick = () => { if (answered) return; answered = true; skipped++; speakBroken = true; next(); };
          fb.after(sk);
        }
      });
    };
    const next = () => { k++; if (k < qs.length) view(); else onEnd(qs.length - skipped ? Math.round(right / (qs.length - skipped) * 100) : 0, wrong); };
    nx.onclick = next;
    onKeys(ev => {
      if (ev.key === "Enter" && answered) { ev.preventDefault(); next(); return; }
      if (answered || q.kind !== "choice") return;
      const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }, j = map[String(ev.key).toLowerCase()];
      if (j != null) choose(j);
    });
  }
  view();
}
function typeNorm(s) { return String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim().replace(/\b(\w+)is(e|ed|es|ing|ation)\b/g, "$1iz$2").replace(/our\b/g, "or"); }

/* ---------- câu hỏi từ vựng ---------- */
function vocabQuestion(e, kind, pool, noSpeak) {
  const others = pool.filter(x => x.n !== e.n);
  const rv = e.term + " — " + e.vi;
  if (kind === "listen") {
    const opts = shuffle([e].concat(pick(others, 3)));
    return { kind: "choice", n: e.n, sec: "v", label: "🎧 Nghe và chọn từ đúng", audio: e.speak.join(", "), options: opts.map(x => x.term), answer: opts.indexOf(e), correctText: e.term, why: e.vi, review: rv };
  }
  if (kind === "meaning") {
    const opts = shuffle([e].concat(pick(others, 3)));
    return { kind: "choice", n: e.n, sec: "v", label: "Từ nào có nghĩa:", prompt: "<b>" + esc(e.vi) + "</b>", options: opts.map(x => x.term), answer: opts.indexOf(e), correctText: e.term, review: rv };
  }
  if (kind === "cloze" && e.blank) {
    const [a, b] = e.blank, ans = e.ex.slice(a, b);
    const ds = shuffle(others.filter(x => x.blank).map(x => x.ex.slice(x.blank[0], x.blank[1])).filter(t => t.toLowerCase() !== ans.toLowerCase()));
    const opts = shuffle([ans].concat([...new Set(ds)].slice(0, 3)));
    return { kind: "choice", n: e.n, sec: "v", label: "Điền vào chỗ trống", prompt: esc(e.ex.slice(0, a)) + '<span class="gap">______</span>' + esc(e.ex.slice(b)), options: opts, answer: opts.indexOf(ans), correctText: ans, why: e.term + " — " + e.vi, review: rv };
  }
  if (kind === "dict") {
    const w = e.speak.find(p => /^[a-z-]{4,}$/i.test(p));
    if (w) return { kind: "type", n: e.n, sec: "v", label: "🎧 Nghe và gõ lại từ", audio: w, accept: [w], correctText: w, why: e.vi, review: w + " — " + e.vi };
  }
  if (kind === "say" && !noSpeak && canListen && !speakBroken && !IN_APP) {
    return { kind: "speak", n: e.n, sec: "v", label: "🎙️ Nói to từ tiếng Anh nghĩa là:", prompt: "<b>" + esc(e.vi) + "</b>", targets: e.speak, correctText: e.speak.join(" / "), review: rv };
  }
  return vocabQuestion(e, kind === "listen" ? "meaning" : "listen", pool);
}
function vocabQuiz(i) {
  const es = V[i - 1].entries;
  const plan = ["listen", "listen", "listen", "listen", "meaning", "meaning", "meaning", "meaning", "cloze", "cloze", "cloze", "cloze", "cloze", "dict", "dict", "dict", "say", "say", "meaning", "listen"];
  const chosen = pick(es, Math.min(20, es.length));
  while (chosen.length < 20) chosen.push(es[Math.floor(Math.random() * es.length)]);
  const qs = shuffle(chosen.map((e, j) => vocabQuestion(e, plan[j], es)));
  runQuiz({ title: "Luyện từ", head: lessonHead(i, 2) }, qs, (score, wrong) => {
    const p = U(i).quiz || { best: 0, tries: 0 };
    U(i).quiz = { best: Math.max(p.best, score), last: score, tries: p.tries + 1 };
    save({ unit: i, part: "Luyện từ", score, detail: wrong.length ? "Sai: " + wrong.join("; ") : "Đúng hết" });
    resultCard(i, "Luyện từ", score, wrong, { retry: () => vocabQuiz(i), next: "gread:" + i });
  });
}

/* ---------- Bước 4 & 5: ngữ pháp ---------- */
function grammarRead(i) {
  const g = G[i - 1], sh = SH[i - 1];
  let body = "";
  if (sh) {
    body = '<div class="sheet c' + sh.cols.length + '">' + sh.cols.map(c =>
      '<div class="col"><h3>' + esc(c.name) + '</h3><div class="formula">' + c.f.map(([s, f]) => '<div><span class="fs ' + (s === "+" ? "p" : s === "−" ? "m" : s === "?" ? "q" : "") + '">' + esc(s) + "</span><code>" + esc(f) + "</code></div>").join("") + "</div>" +
      (c.use.length ? '<ul class="uses">' + c.use.map(([u, ex]) => "<li>" + (u ? "<b>" + esc(u) + "</b>" : "") + (ex ? (u ? "<br>" : "") + "<i>" + esc(ex) + "</i>" : "") + "</li>").join("") + "</ul>" : "") +
      (c.sig.length ? '<div class="chips">' + c.sig.map(x => '<span class="chip">' + esc(x) + "</span>").join("") + "</div>" : "") + "</div>").join("") + "</div>" +
      (sh.notes.length ? '<div class="notes">' + sh.notes.map(([a, b]) => '<div class="note"><b>⚠️ ' + esc(a) + "</b>" + (b ? "<span>" + esc(b) + "</span>" : "") + "</div>").join("") + "</div>" : "");
  }
  shell(lessonHead(i, 3) + '<section class="card gram"><div class="gtitle"><span class="kick">CÔNG THỨC NGỮ PHÁP</span><h1>' + esc(g.title) + "</h1></div>" + body +
    '<div class="nav right"><button class="btn gold" id="ok">Em đã chép vào vở ✓</button></div></section>', "lesson");
  document.getElementById("ok").onclick = () => { U(i).gread = 1; save({ unit: i, part: "Ngữ pháp", score: "", detail: "Đã đọc lý thuyết" }); grammarQuiz(i); };
}
function grammarQuestion(x, lessonTitle) {
  const pre = lessonTitle ? lessonTitle + ": " : "";
  if (x.t === "mc") {
    const order = shuffle(x.o.map((o, j) => j)), isSent = x.q.startsWith("Chọn câu");
    return { kind: "choice", sec: "g", label: isSent ? "Chọn câu đúng" : "Chọn đáp án đúng", prompt: isSent ? "" : esc(x.q).replace(/___/g, '<span class="gap">______</span>'), options: order.map(j => x.o[j]), answer: order.indexOf(x.a), correctText: x.o[x.a], why: x.why, review: pre + x.q.replace("___", "[" + x.o[x.a] + "]") };
  }
  return { kind: "type", sec: "g", label: "Gõ đáp án vào chỗ trống", prompt: esc(x.q).replace(/___/g, '<span class="gap">______</span>'), accept: x.a, correctText: x.a[0], why: x.why, review: pre + x.q.replace("___", "[" + x.a[0] + "]") };
}
function grammarQuiz(i) {
  runQuiz({ title: "Bài tập NP", head: lessonHead(i, 4) }, shuffle(G[i - 1].ex).map(x => grammarQuestion(x)), (score, wrong) => {
    const p = U(i).gex || { best: 0, tries: 0 };
    U(i).gex = { best: Math.max(p.best, score), last: score, tries: p.tries + 1 };
    save({ unit: i, part: "Bài tập ngữ pháp", score, detail: wrong.length ? "Sai: " + wrong.join("; ") : "Đúng hết" });
    resultCard(i, "Bài tập ngữ pháp", score, wrong, { retry: () => grammarQuiz(i), next: unitDone(i) && i < N_UNITS ? "unit:" + (i + 1) : "unit:" + i });
  });
}

/* ---------- ôn tập ---------- */
function review() {
  const ns = pick(dueWords(), 15);
  if (!ns.length) { toast("Hôm nay em không có từ nào cần ôn."); return home(); }
  const qs = ns.map(n => { const u = unitOfEntry(n); return vocabQuestion(entryOf(n), pick(["listen", "meaning", "cloze", "say"], 1)[0], u.entries); });
  runQuiz({ title: "Ôn tập", head: '<header class="lhead"><button class="crumb" data-go="home">← Lộ trình</button><div class="lt"><b>🔁 Ôn tập từ đến hạn</b></div></header>' }, qs, (score, wrong) => {
    save({ unit: "", part: "Ôn tập", score, detail: ns.length + " từ" + (wrong.length ? " · Sai: " + wrong.join("; ") : "") });
    resultCard(0, "Ôn tập", score, wrong, { noPass: true });
  });
}

/* ---------- kiểm tra cuối khoá (làm hết rồi nộp) ---------- */
function finalTest() {
  if (!allDone()) return home();
  const all = V.flatMap(u => u.entries.map(e => ({ e, pool: u.entries })));
  const kinds = ["listen", "meaning", "cloze", "dict", "meaning"];
  const vq = pick(all, 25).map(({ e, pool }, j) => vocabQuestion(e, kinds[j % kinds.length], pool, true));
  const gq = G.map(g => grammarQuestion(pick(g.ex, 1)[0], g.title)).concat(pick(G, 1).map(g => grammarQuestion(pick(g.ex, 1)[0], g.title)));
  const qs = vq.concat(gq);
  const ans = qs.map(() => null);
  let k = 0, drawer = false;
  const answered = () => ans.filter(a => a !== null && a !== "").length;
  function nav() { return '<div class="qnav' + (drawer ? " open" : "") + '">' + qs.map((q, j) => '<button class="qn ' + (j === k ? "cur " : "") + (ans[j] !== null && ans[j] !== "" ? "done" : "") + '" data-q="' + j + '">' + (j + 1) + "</button>").join("") + "</div>"; }
  function view() {
    const q = qs[k];
    shell('<header class="lhead"><button class="crumb" data-go="home">← Lộ trình</button><div class="lt"><b>★ Kiểm tra cuối khoá</b><span class="tag">' + answered() + "/" + qs.length + ' câu đã làm</span></div><button class="howbtn" id="dr">☰ Bảng câu</button></header>' +
      '<section class="exam"><aside class="navwrap">' + nav() + '<button class="btn gold block" id="submit">Nộp bài</button></aside><article class="card quiz"><div class="qtop"><span class="count">Câu ' + (k + 1) + " / " + qs.length + '</span><span class="qt">' + (q.sec === "g" ? "Ngữ pháp" : "Từ vựng") + "</span></div>" + qBody(q) +
      '<div class="nav"><button class="btn ghost" id="pv" ' + (k ? "" : "disabled") + '>← Câu trước</button><button class="btn primary" id="nx">' + (k + 1 < qs.length ? "Câu sau ➔" : "Xem bảng câu") + "</button></div></article></section>", "lesson exam-mode");
    if (q.audio) say(q.audio);
    const opts = app.querySelectorAll(".opt");
    if (q.kind === "choice") { if (ans[k] !== null) opts[ans[k]].classList.add("picked"); opts.forEach(b => b.onclick = () => { ans[k] = +b.dataset.j; opts.forEach(x => x.classList.remove("picked")); b.classList.add("picked"); updNav(); }); }
    if (q.kind === "type") { const ti = document.getElementById("ti"); ti.value = ans[k] || ""; ti.oninput = () => { ans[k] = ti.value.trim(); updNav(); }; document.getElementById("tf").onsubmit = ev => { ev.preventDefault(); ans[k] = ti.value.trim(); move(1); }; app.querySelector("#tf .btn").textContent = "Lưu"; }
    app.querySelectorAll(".qn").forEach(b => b.onclick = () => { k = +b.dataset.q; drawer = false; view(); });
    document.getElementById("pv").onclick = () => move(-1);
    document.getElementById("nx").onclick = () => k + 1 < qs.length ? move(1) : (drawer = true, view());
    document.getElementById("dr").onclick = () => { drawer = !drawer; app.querySelector(".qnav").classList.toggle("open", drawer); };
    document.getElementById("submit").onclick = submit;
    onKeys(ev => {
      if (q.kind === "choice") { const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }, j = map[String(ev.key).toLowerCase()]; if (j != null && opts[j]) { opts[j].click(); return; } }
      if (ev.key === "ArrowRight" || ev.key === "Enter") move(1); else if (ev.key === "ArrowLeft") move(-1);
    });
  }
  function updNav() { const b = app.querySelector('.qn[data-q="' + k + '"]'); if (b) b.classList.toggle("done", ans[k] !== null && ans[k] !== ""); const t = app.querySelector(".lhead .tag"); if (t) t.textContent = answered() + "/" + qs.length + " câu đã làm"; }
  function move(d) { const n = k + d; if (n < 0 || n >= qs.length) return; k = n; view(); }
  function submit() {
    const left = qs.length - answered();
    if (left && !confirm("Còn " + left + " câu chưa làm. Em vẫn nộp bài?")) return;
    let right = 0, rv = 0, rg = 0; const wrong = [];
    qs.forEach((q, j) => {
      const a = ans[j];
      const ok = q.kind === "choice" ? a === q.answer : q.accept.some(x => a && typeNorm(x) === typeNorm(a));
      if (ok) { right++; if (q.sec === "g") rg++; else rv++; } else wrong.push("Câu " + (j + 1) + ": " + (q.review || q.correctText));
      if (q.n) mark(q.n, ok);
    });
    const score = Math.round(right / qs.length * 100);
    const p = S.final || { best: 0, tries: 0 };
    S.final = { best: Math.max(p.best, score), last: score, tries: p.tries + 1, at: new Date().toISOString() };
    save({ unit: "Cuối khoá", part: "Kiểm tra cuối khoá", score, detail: "Từ vựng " + rv + "/" + vq.length + " · Ngữ pháp " + rg + "/" + gq.length });
    resultCard(0, "Kiểm tra cuối khoá", score, wrong, { pass: C.FINAL_PASS, retry: finalTest, stats: [["Từ vựng", rv + "/" + vq.length], ["Ngữ pháp", rg + "/" + gq.length], ["Tổng", right + "/" + qs.length]] });
  }
  view();
}

/* ---------- thẻ kết quả ---------- */
function resultCard(i, part, score, wrong, o) {
  o = o || {};
  const pass = o.pass || C.PASS, ok = o.noPass || score >= pass;
  const img = score >= 90 ? "titi-top" : ok ? "titi-good" : "titi-calm";
  const msg = score >= 90 ? "Xuất sắc!" : ok ? "Đạt yêu cầu — tốt lắm!" : "Chưa đạt " + pass + "% · làm lại để nâng điểm";
  const deg = Math.round(score * 3.6);
  let h = (i ? lessonHead(i, STEPS.findIndex(s => ({ "Phát âm": "speak", "Luyện từ": "quiz", "Bài tập ngữ pháp": "gex" })[part] === s.k)) : "") +
    '<section class="card result"><div class="rleft"><div class="ring ' + (ok ? "good" : "bad") + '" style="--d:' + deg + 'deg"><span>' + score + "%</span></div><img class=\"titi-lg\" src=\"./titi/" + img + '.webp" alt=""></div><div class="rright"><span class="kick">' + (i ? "BÀI " + i + " · " : "") + esc(part.toUpperCase()) + "</span><h1>" + msg + "</h1>" +
    (o.stats ? '<div class="kpis">' + o.stats.map(([a, b]) => '<div class="kpi"><b>' + esc(b) + "</b><small>" + esc(a) + "</small></div>").join("") + "</div>" : "") +
    (wrong.length ? '<details class="wrong"' + (wrong.length <= 6 ? " open" : "") + "><summary>Cần xem lại (" + wrong.length + ")</summary><ul>" + wrong.map(w => "<li>" + esc(w) + "</li>").join("") + "</ul></details>" : "") +
    '<div class="nav">' + (o.retry ? '<button class="btn ' + (ok ? "ghost" : "gold") + '" id="again">↻ Làm lại</button>' : "") +
    (ok && o.next ? '<button class="btn primary" data-go="' + o.next + '">Bước tiếp ➔</button>' : '<button class="btn primary" data-go="' + (i ? "unit:" + i : "home") + '">' + (i ? "Về Bài " + i : "Về lộ trình") + "</button>") + "</div></div></section>";
  shell(h, i ? "lesson" : "lesson");
  const a = document.getElementById("again"); if (a) a.onclick = o.retry;
}

/* ---------- khởi động ---------- */
function merge(server, local) {
  if (!server) return local; if (!local) return server;
  return (local.updatedAt || 0) > (server.updatedAt || 0) ? local : server;
}
function boot() {
  if (!token) { shell('<section class="card center narrow"><h1>Nền tảng IELTS</h1><p>Em mở đúng link riêng cô Trang đã gửi nhé.</p></section>'); return; }
  if (localMode) {
    S = loadLocal() || blank(); if (!S.start) { S.start = Date.now(); saveLocal(); }
    student = { name: token === "demo" ? "cô (bản thử)" : "", start: null, deadline: null };
    return home();
  }
  fetch(C.API_URL + "?action=load&hs=" + encodeURIComponent(token)).then(r => r.json()).then(j => {
    if (!j.ok) {
      if (j.error === "notfound") return shell('<section class="card center narrow"><h1>Link chưa đúng</h1><p>Không tìm thấy học sinh với link này. Em kiểm tra lại link cô gửi.</p></section>');
      throw new Error(j.error);
    }
    student = j.student;
    S = merge(j.state, loadLocal()) || blank();
    if (!S.start) S.start = new Date(student.start).getTime();
    saveLocal();
    if (isLocked()) return lockScreen();
    home();
    if (!j.state || (S.updatedAt || 0) > (j.state.updatedAt || 0)) push();
  }).catch(() => {
    const l = loadLocal();
    if (l) { S = l; localMode = false; student = student || { name: "" }; home(); toast("Mạng yếu: em vẫn học được, tiến độ tự lưu khi có mạng."); }
    else shell('<section class="card center narrow"><h1>Chưa kết nối được</h1><p>Em kiểm tra mạng rồi tải lại trang.</p><button class="btn primary" onclick="location.reload()">Tải lại</button></section>');
  });
}
boot();
})();
