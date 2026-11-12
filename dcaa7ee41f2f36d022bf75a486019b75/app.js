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
  el.textContent = s === "ok" ? "Đã lưu lên hệ thống" : s === "saving" ? "Đang lưu…" : "Chưa lưu được — sẽ tự lưu lại";
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
function say(text, slow) {
  if (!window.speechSynthesis) { toast("Máy này không phát được âm thanh mẫu."); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/…/g, "").replace(/\s*(~|><|#)\s*/g, ", ").replace(/\s*·\s*/g, ", "));
  u.lang = "en-US"; if (voice) u.voice = voice; u.rate = slow ? 0.6 : 0.9;
  speechSynthesis.speak(u);
}

/* ---------- nhận giọng nói & chấm ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const canListen = !!SR;
function listen() {
  return new Promise((resolve, reject) => {
    const r = new SR(); r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 6; r.continuous = false;
    let done = false; const out = [];
    const t = setTimeout(() => { try { r.stop(); } catch (e) {} }, 8000);
    r.onresult = ev => { for (const res of ev.results) for (const alt of res) out.push(alt.transcript); };
    r.onerror = ev => { if (done) return; done = true; clearTimeout(t); reject(ev.error || "error"); };
    r.onend = () => { if (done) return; done = true; clearTimeout(t); out.length ? resolve(out) : reject("no-speech"); };
    try { r.start(); } catch (e) { reject("busy"); }
  });
}
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
  if (e === "not-allowed" || e === "service-not-allowed") return "Em cần cho phép trình duyệt dùng micro (bấm biểu tượng ổ khoá cạnh địa chỉ web → Micro → Cho phép), rồi thử lại.";
  if (e === "no-speech") return "Máy chưa nghe thấy giọng em. Bấm micro rồi đọc to, gần máy hơn.";
  if (e === "network") return "Mạng yếu nên máy chưa chấm được. Em kiểm tra mạng rồi thử lại.";
  if (e === "audio-capture") return "Không tìm thấy micro. Em kiểm tra tai nghe/micro.";
  return "Máy chưa chấm được, em thử lại.";
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
function shell(inner, back) {
  app.innerHTML = (back ? '<button class="back" data-go="' + back + '">← ' + (back === "home" ? "Trang chính" : "Quay lại bài") + "</button>" : "") + inner;
  app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(b.dataset.say, b.dataset.slow === "1"));
  window.scrollTo(0, 0);
}
function go(where) {
  if (isLocked()) return lockScreen();
  const [v, a] = where.split(":");
  if (v === "home") return home();
  if (v === "unit") return unitView(+a);
  if (v === "learn") return learn(+a, 0);
  if (v === "speak") return speak(+a);
  if (v === "quiz") return vocabQuiz(+a);
  if (v === "gread") return grammarRead(+a);
  if (v === "gex") return grammarQuiz(+a);
  if (v === "review") return review();
  if (v === "final") return finalTest();
}
function isLocked() { return !completed() && Date.now() > deadlineTime() && !localMode; }

function lockScreen() {
  shell('<section class="card center"><img class="titi" src="./titi/titi-calm.webp" alt=""><h1>Đã hết thời hạn 30 ngày</h1><p>Chương trình Nền tảng IELTS của em đã kết thúc vào ngày ' + fmtDate(deadlineTime()) + ". Em đã hoàn thành " + doneCount() + "/" + N_UNITS + " bài.</p><p>Em liên hệ cô Trang để được hướng dẫn tiếp nhé.</p></section>");
}

/* ---------- trang chính ---------- */
function home() {
  const p = pace();
  const left = Math.max(0, Math.ceil((deadlineTime() - Date.now()) / DAY));
  const name = student && student.name ? student.name : "em";
  let status;
  if (completed()) status = '<p class="pace good">Em đã hoàn thành chương trình Nền tảng IELTS. Xuất sắc!</p>';
  else if (p.done >= p.target) status = '<p class="pace good">Em đang đi trước tiến độ. Giữ vững nhé!</p>';
  else if (p.behind === 0) status = '<p class="pace ok">Đúng tiến độ — hôm nay em cần hoàn thành <b>Bài ' + p.target + "</b>.</p>";
  else status = '<p class="pace bad">Em đang chậm <b>' + p.behind + " bài</b>. Hôm nay cần làm xong đến <b>Bài " + p.target + "</b> để kịp hạn.</p>";
  const due = dueWords().length;
  let list = "";
  for (let i = 1; i <= N_UNITS; i++) {
    const u = V[i - 1], g = G[i - 1], d = unitDone(i), op = unlocked(i);
    const steps = stepState(i).filter(x => x.ok).length;
    list += '<button class="unit ' + (d ? "done" : op ? "open" : "lock") + '" ' + (op ? 'data-go="unit:' + i + '"' : "disabled") + '><span class="num">' + i + '</span><span class="ut"><b>' + esc(u.title) + "</b><small>Ngữ pháp: " + esc(g.title) + '</small></span><span class="st">' + (d ? "✓ Xong" : op ? steps + "/5" : "🔒") + "</span></button>";
  }
  const fin = S.final ? S.final.best + "%" : "";
  list += '<button class="unit ' + (completed() ? "done" : allDone() ? "open" : "lock") + '" ' + (allDone() ? 'data-go="final"' : "disabled") + '><span class="num">★</span><span class="ut"><b>Kiểm tra cuối khoá</b><small>40 câu từ vựng + ngữ pháp · đạt từ ' + C.FINAL_PASS + '%</small></span><span class="st">' + (completed() ? "✓ " + fin : allDone() ? (fin || "Làm bài") : "🔒") + "</span></button>";
  shell(
    (localMode ? '<p class="demo">Chế độ thử: tiến độ chỉ lưu trên máy này (chưa nối Sheet theo dõi).</p>' : "") +
    '<section class="hero"><div><p class="kicker">NỀN TẢNG IELTS · VOCAB B1 + NGỮ PHÁP</p><h1>Chào ' + esc(name) + "!</h1>" +
    '<p class="days">Ngày <b>' + Math.min(p.d, C.DAYS) + "/" + C.DAYS + "</b> · còn <b>" + left + " ngày</b> (hạn " + fmtDate(deadlineTime()) + ")</p>" + status +
    '<div class="bar"><i style="width:' + summary().percent + '%"></i></div><p class="small">' + p.done + "/" + N_UNITS + ' bài · mỗi bài gồm 5 bước, làm đạt ' + C.PASS + '% mới mở bài tiếp theo.</p><p id="sync" class="sync"></p></div><img class="titi" src="./titi/titi-good.webp" alt="Cô giáo Titi"></section>' +
    (due ? '<button class="review-cta" data-go="review">Ôn tập hôm nay: <b>' + due + " từ</b> đến hạn ôn →</button>" : "") +
    '<section class="units">' + list + "</section>" +
    '<section class="card howto"><h2>Cách học mỗi bài</h2><ol><li><b>Học từ</b>: nghe, đọc nghĩa và ví dụ, chép vào vở.</li><li><b>Phát âm</b>: bấm micro, đọc to từng từ, máy chấm ngay.</li><li><b>Luyện từ</b>: 20 câu nghe – chọn – điền – chính tả – nói.</li><li><b>Ngữ pháp</b>: đọc lý thuyết, chép công thức vào vở.</li><li><b>Bài tập ngữ pháp</b>: 12 câu tự chấm.</li></ol><p class="small">Nên dùng Chrome trên điện thoại Android hoặc máy tính, đeo tai nghe có micro để chấm phát âm chính xác nhất.</p></section>'
  );
  if (!localMode) setSync(pendingEvents.length ? "err" : "ok");
}

/* ---------- trang bài ---------- */
function stepState(i) {
  const u = S.units[i] || {};
  return [
    { k: "learn", name: "Học từ", info: V[i - 1].entries.length + " từ", ok: !!u.learn, score: "" },
    { k: "speak", name: "Phát âm", info: "đọc to, máy chấm", ok: !!(u.speak && u.speak.done), score: u.speak ? (u.speak.score == null ? "không chấm" : u.speak.score + "%") : "" },
    { k: "quiz", name: "Luyện từ", info: "20 câu · đạt " + C.PASS + "%", ok: !!(u.quiz && u.quiz.best >= C.PASS), score: u.quiz ? u.quiz.best + "%" : "" },
    { k: "gread", name: "Ngữ pháp", info: G[i - 1].title, ok: !!u.gread, score: "" },
    { k: "gex", name: "Bài tập ngữ pháp", info: "12 câu · đạt " + C.PASS + "%", ok: !!(u.gex && u.gex.best >= C.PASS), score: u.gex ? u.gex.best + "%" : "" }
  ];
}
function unitView(i) {
  if (!unlocked(i)) return home();
  const st = stepState(i);
  let h = '<section class="card"><p class="kicker">BÀI ' + i + " / " + N_UNITS + " · " + esc(V[i - 1].code) + "</p><h1>" + esc(V[i - 1].title) + '</h1><p class="small">Ngữ pháp: ' + esc(G[i - 1].title) + '</p><div class="steps">';
  st.forEach((s, k) => {
    const open = k === 0 || st[k - 1].ok || s.ok;
    h += '<button class="step ' + (s.ok ? "done" : open ? "open" : "lock") + '" ' + (open ? 'data-go="' + s.k + ":" + i + '"' : "disabled") + '><span class="num">' + (s.ok ? "✓" : k + 1) + '</span><span class="ut"><b>' + s.name + "</b><small>" + esc(s.info) + '</small></span><span class="st">' + (s.score || (s.ok ? "Xong" : open ? "Bắt đầu" : "🔒")) + "</span></button>";
  });
  h += "</div>" + (unitDone(i) ? '<p class="pace good">Em đã hoàn thành Bài ' + i + "." + (i < N_UNITS ? ' <button class="link" data-go="unit:' + (i + 1) + '">Sang Bài ' + (i + 1) + " →</button>" : "") + "</p>" : '<p class="small">Làm lần lượt 5 bước. Có thể làm lại bước đã xong để nâng điểm.</p>') + "</section>";
  shell(h, "home");
}

/* ---------- Bước 1: học từ ---------- */
function exampleHtml(e) {
  if (!e.blank) return esc(e.ex);
  const [a, b] = e.blank; return esc(e.ex.slice(0, a)) + "<mark>" + esc(e.ex.slice(a, b)) + "</mark>" + esc(e.ex.slice(b));
}
function learn(i, k) {
  const es = V[i - 1].entries, e = es[k];
  const spoken = e.speak.join(", ");
  shell('<section class="card flash"><p class="kicker">BÀI ' + i + " · HỌC TỪ · " + (k + 1) + "/" + es.length + '</p><div class="bar thin"><i style="width:' + Math.round((k + 1) / es.length * 100) + '%"></i></div>' +
    '<h1 class="term">' + esc(e.term) + '</h1><p class="ipa">' + esc(e.ipa) + ' <span class="type">' + esc(e.type) + "</span></p>" +
    '<div class="audio"><button data-say="' + esc(spoken) + '">🔊 Nghe</button><button data-say="' + esc(spoken) + '" data-slow="1">🐢 Nghe chậm</button></div>' +
    '<p class="vi">' + esc(e.vi) + '</p><p class="def">' + esc(e.def) + "</p>" +
    '<p class="ex">' + exampleHtml(e) + ' <button class="mini" data-say="' + esc(e.ex) + '">🔊</button></p>' +
    (e.note ? '<p class="note">📝 ' + esc(e.note) + "</p>" : "") + (e.focus.length ? '<p class="note">🎯 ' + esc(e.focus.join(" ")) + "</p>" : "") +
    '<div class="nav">' + (k > 0 ? '<button class="ghost" id="prev">← Trước</button>' : "<span></span>") + '<button class="primary" id="next">' + (k + 1 < es.length ? "Từ tiếp theo →" : "Hoàn thành bước 1 ✓") + "</button></div></section>", "unit:" + i);
  say(spoken);
  const p = document.getElementById("prev"); if (p) p.onclick = () => learn(i, k - 1);
  document.getElementById("next").onclick = () => {
    if (k + 1 < es.length) return learn(i, k + 1);
    U(i).learn = 1; save({ unit: i, part: "Học từ", score: "", detail: es.length + " từ" }); toast("Xong bước Học từ!"); unitView(i);
  };
}

/* ---------- Bước 2: phát âm ---------- */
function speak(i) {
  const es = V[i - 1].entries;
  if (!canListen) {
    shell('<section class="card center"><h1>Máy chưa hỗ trợ chấm phát âm</h1><p>Trình duyệt này không có chức năng nhận giọng nói. Em mở link bằng <b>Chrome</b> (điện thoại Android hoặc máy tính) để được chấm phát âm.</p><p class="small">Nếu đang dùng iPhone: vào Cài đặt → Siri → bật “Nghe và đọc” / Đọc chính tả (Dictation), rồi mở lại bằng Safari hoặc Chrome.</p><button class="ghost" id="skip">Không có máy khác — bỏ qua chấm phát âm bài này</button></section>', "unit:" + i);
    document.getElementById("skip").onclick = () => { U(i).speak = { done: 1, score: null, unsupported: 1 }; save({ unit: i, part: "Phát âm", score: "", detail: "Máy không hỗ trợ chấm" }); unitView(i); };
    return;
  }
  const res = es.map(() => ({ ok: false, tries: 0 }));
  let k = 0, part = 0, tries = 0, viewId = 0;
  function view(msg, cls) {
    ++viewId;
    const e = es[k], target = e.speak[part];
    shell('<section class="card"><p class="kicker">BÀI ' + i + " · PHÁT ÂM · " + (k + 1) + "/" + es.length + '</p><div class="bar thin"><i style="width:' + Math.round(k / es.length * 100) + '%"></i></div>' +
      '<p class="small">Đọc to cụm sau' + (e.speak.length > 1 ? " (phần " + (part + 1) + "/" + e.speak.length + ")" : "") + ":</p>" +
      '<h1 class="term">' + esc(target) + '</h1><p class="ipa">' + esc(e.ipa) + '</p><p class="vi small">' + esc(e.vi) + "</p>" +
      '<div class="audio"><button data-say="' + esc(target) + '">🔊 Nghe mẫu</button><button data-say="' + esc(target) + '" data-slow="1">🐢 Chậm</button></div>' +
      '<button class="mic" id="mic">🎤 Bấm rồi đọc</button>' +
      '<div class="fb ' + (cls || "") + '">' + (msg || "Lượt " + (tries + 1) + "/3") + "</div>" +
      '<div class="nav"><span></span><button class="ghost" id="nx" ' + (cls === "good" || tries >= 3 ? "" : "hidden") + ">" + (k + 1 < es.length || part + 1 < e.speak.length ? "Tiếp →" : "Xem kết quả →") + "</button></div></section>", "unit:" + i);
    document.getElementById("mic").onclick = doListen;
    document.getElementById("nx").onclick = next;
  }
  function doListen() {
    const btn = document.getElementById("mic"); btn.disabled = true; btn.textContent = "Đang nghe… em đọc đi";
    if (window.speechSynthesis) speechSynthesis.cancel();
    const e = es[k], target = e.speak[part];
    listen().then(alts => {
      tries++;
      if (matches(target, alts)) { view("✓ Chuẩn! Máy nghe được: “" + esc(alts[0]) + "”", "good"); const id = viewId; setTimeout(() => { if (id === viewId) next(); }, 1300); }
      else {
        const tips = advice(target, alts, e).map(esc).join("<br>");
        if (tries >= 3) { res[k].fail = true; view("Chưa đạt sau 3 lượt — từ này sẽ được đưa vào danh sách ôn tập.<br>" + tips, "bad"); }
        else view("✗ Chưa đúng (lượt " + tries + "/3).<br>" + tips, "bad");
      }
    }).catch(err => view(esc(micErrorText(err)), "warn"));
  }
  function next() {
    ++viewId;
    const e = es[k]; if (!e) return;
    if (part + 1 < e.speak.length) { part++; tries = 0; return view(); }
    res[k].ok = !res[k].fail; mark(e.n, res[k].ok);
    k++; part = 0; tries = 0;
    if (k < es.length) return view();
    const score = Math.round(res.filter(r => r.ok).length / es.length * 100);
    const weak = es.filter((e, j) => !res[j].ok).map(e => e.n);
    const prev = U(i).speak; U(i).speak = { done: 1, score: Math.max(score, prev && prev.score || 0), last: score, weak };
    save({ unit: i, part: "Phát âm", score, detail: weak.length ? "Chưa đạt: " + weak.map(n => entryOf(n).term).join(", ") : "Đạt tất cả" });
    resultCard(i, "Phát âm", score, weak.map(n => entryOf(n).term), true);
  }
  view();
}

/* ---------- bộ máy câu hỏi chung ---------- */
function runQuiz(title, back, qs, onEnd) {
  let k = 0, right = 0; const wrong = [];
  function view() {
    const q = qs[k];
    let body = '<section class="card"><p class="kicker">' + esc(title) + " · CÂU " + (k + 1) + "/" + qs.length + '</p><div class="bar thin"><i style="width:' + Math.round(k / qs.length * 100) + '%"></i></div>';
    body += '<p class="qlabel">' + q.label + "</p>";
    if (q.audio) body += '<div class="audio"><button data-say="' + esc(q.audio) + '">🔊 Nghe</button><button data-say="' + esc(q.audio) + '" data-slow="1">🐢 Chậm</button></div>';
    if (q.prompt) body += '<p class="prompt">' + q.prompt + "</p>";
    if (q.kind === "choice") body += '<div class="opts">' + q.options.map((o, j) => '<button class="opt" data-j="' + j + '">' + esc(o) + "</button>").join("") + "</div>";
    if (q.kind === "type") body += '<form id="tf" class="typef"><input id="ti" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ câu trả lời"><button class="primary">Kiểm tra</button></form>';
    if (q.kind === "speak") body += '<button class="mic" id="mic">🎤 Bấm rồi nói</button>';
    body += '<div class="fb" id="fb"></div><div class="nav"><span></span><button class="primary" id="nx" hidden>' + (k + 1 < qs.length ? "Câu tiếp →" : "Xem kết quả →") + "</button></div></section>";
    shell(body, back);
    if (q.audio) setTimeout(() => say(q.audio), 250);
    const fb = document.getElementById("fb"), nx = document.getElementById("nx");
    let answered = false, speakTries = 0;
    const finish = (ok, shown) => {
      if (answered) return; answered = true;
      if (ok) right++; else wrong.push(q.review || q.correctText);
      if (q.n) mark(q.n, ok);
      fb.className = "fb " + (ok ? "good" : "bad");
      fb.innerHTML = (ok ? "✓ Chính xác!" : "✗ Chưa đúng. Đáp án: <b>" + esc(q.correctText) + "</b>") + (shown ? "<br>" + shown : "") + (q.why ? '<br><span class="why">' + esc(q.why) + "</span>" : "");
      nx.hidden = false; nx.focus();
    };
    if (q.kind === "choice") app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      if (answered) return;
      const j = +b.dataset.j; app.querySelectorAll(".opt").forEach(x => x.disabled = true);
      app.querySelectorAll(".opt")[q.answer].classList.add("right"); if (j !== q.answer) b.classList.add("wrong");
      finish(j === q.answer);
    });
    if (q.kind === "type") {
      const ti = document.getElementById("ti"); ti.focus();
      document.getElementById("tf").onsubmit = ev => {
        ev.preventDefault(); if (answered) return;
        const v = ti.value.trim();
        if (!/[a-z0-9]/i.test(v) && !/^[0Ø-]$/.test(v)) { fb.className = "fb warn"; fb.textContent = "Em cần gõ câu trả lời thật, không để trống hoặc gõ ký tự đánh dấu."; return; }
        ti.disabled = true; finish(q.accept.some(a => typeNorm(a) === typeNorm(v)), "Em trả lời: “" + esc(v) + "”");
      };
    }
    if (q.kind === "speak") document.getElementById("mic").onclick = () => {
      if (answered) return;
      const m = document.getElementById("mic"); m.disabled = true; m.textContent = "Đang nghe…";
      listen().then(alts => {
        speakTries++;
        if (q.targets.some(t => matches(t, alts))) finish(true, "Máy nghe được: “" + esc(alts[0]) + "”");
        else if (speakTries < 2) { fb.className = "fb bad"; fb.innerHTML = "Máy nghe thành “" + esc(alts[0]) + "”. Em thử lại một lần nữa."; m.disabled = false; m.textContent = "🎤 Nói lại"; }
        else finish(false, "Máy nghe thành “" + esc(alts[0]) + "”");
      }).catch(err => { fb.className = "fb warn"; fb.textContent = micErrorText(err); m.disabled = false; m.textContent = "🎤 Bấm rồi nói"; });
    };
    nx.onclick = () => { k++; if (k < qs.length) view(); else onEnd(Math.round(right / qs.length * 100), wrong); };
  }
  view();
}
function typeNorm(s) { return String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim().replace(/\b(\w+)is(e|ed|es|ing|ation)\b/g, "$1iz$2").replace(/our\b/g, "or"); }

/* ---------- câu hỏi từ vựng ---------- */
function vocabQuestion(e, kind, pool) {
  const others = pool.filter(x => x.n !== e.n);
  if (kind === "listen") {
    const opts = shuffle([e].concat(pick(others, 3)));
    return { kind: "choice", n: e.n, label: "Nghe và chọn từ/cụm từ em nghe được:", audio: e.speak.join(", "), options: opts.map(x => x.term), answer: opts.indexOf(e), correctText: e.term, review: e.term + " — " + e.vi };
  }
  if (kind === "meaning") {
    const opts = shuffle([e].concat(pick(others, 3)));
    return { kind: "choice", n: e.n, label: "Chọn từ/cụm từ có nghĩa:", prompt: "<b>" + esc(e.vi) + "</b>", options: opts.map(x => x.term), answer: opts.indexOf(e), correctText: e.term, review: e.term + " — " + e.vi };
  }
  if (kind === "cloze" && e.blank) {
    const [a, b] = e.blank, ans = e.ex.slice(a, b);
    const ds = shuffle(others.filter(x => x.blank).map(x => x.ex.slice(x.blank[0], x.blank[1])).filter(t => t.toLowerCase() !== ans.toLowerCase()));
    const uniq = [...new Set(ds)].slice(0, 3);
    const opts = shuffle([ans].concat(uniq));
    return { kind: "choice", n: e.n, label: "Chọn từ đúng điền vào chỗ trống:", prompt: esc(e.ex.slice(0, a)) + '<span class="gap">______</span>' + esc(e.ex.slice(b)), options: opts, answer: opts.indexOf(ans), correctText: ans, review: e.term + " — " + e.vi };
  }
  if (kind === "dict") {
    const w = e.speak.find(p => /^[a-z-]{4,}$/i.test(p));
    if (w) return { kind: "type", n: e.n, label: "Nghe và gõ lại từ em nghe được (chính tả):", audio: w, accept: [w], correctText: w, review: w + " — " + e.vi };
  }
  if (kind === "say" && canListen) {
    return { kind: "speak", n: e.n, label: "Nói to từ tiếng Anh có nghĩa sau (bấm micro):", prompt: "<b>" + esc(e.vi) + "</b>", targets: e.speak, correctText: e.speak.join(" / "), review: e.term + " — " + e.vi };
  }
  return vocabQuestion(e, "meaning", pool);
}
function vocabQuiz(i) {
  const es = V[i - 1].entries;
  const plan = ["listen", "listen", "listen", "listen", "meaning", "meaning", "meaning", "meaning", "cloze", "cloze", "cloze", "cloze", "cloze", "dict", "dict", "dict", "say", "say", "meaning", "listen"];
  const chosen = pick(es, Math.min(20, es.length));
  while (chosen.length < 20) chosen.push(es[Math.floor(Math.random() * es.length)]);
  const qs = shuffle(chosen.map((e, j) => vocabQuestion(e, plan[j], es)));
  runQuiz("BÀI " + i + " · LUYỆN TỪ", "unit:" + i, qs, (score, wrong) => {
    const p = U(i).quiz || { best: 0, tries: 0 };
    U(i).quiz = { best: Math.max(p.best, score), last: score, tries: p.tries + 1 };
    save({ unit: i, part: "Luyện từ", score, detail: wrong.length ? "Sai: " + wrong.join("; ") : "Đúng hết" });
    resultCard(i, "Luyện từ", score, wrong);
  });
}

/* ---------- Bước 4 & 5: ngữ pháp ---------- */
function grammarRead(i) {
  const g = G[i - 1];
  let h = '<section class="card gram"><p class="kicker">BÀI ' + i + ' · NGỮ PHÁP</p><h1>' + esc(g.title) + '</h1><p class="lead">' + esc(g.intro) + "</p>";
  g.rules.forEach(r => { h += '<div class="rule"><h3>' + esc(r.name) + '</h3><p class="form">' + esc(r.form) + "</p><p>" + esc(r.use) + "</p><ul>" + r.ex.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>"; });
  h += '<div class="tips"><h3>Ghi nhớ & mẹo IELTS</h3><ul>' + g.tips.map(t => "<li>" + esc(t) + "</li>").join("") + "</ul></div>";
  h += '<p class="small">Chép công thức và ví dụ vào vở trước khi làm bài tập.</p><div class="nav"><span></span><button class="primary" id="ok">Em đã đọc và chép xong ✓</button></div></section>';
  shell(h, "unit:" + i);
  document.getElementById("ok").onclick = () => { U(i).gread = 1; save({ unit: i, part: "Ngữ pháp", score: "", detail: "Đã đọc lý thuyết" }); unitView(i); };
}
function grammarQuestion(x, lessonTitle) {
  if (x.t === "mc") {
    const order = shuffle(x.o.map((o, j) => j));
    return { kind: "choice", label: x.q.startsWith("Chọn câu") ? esc(x.q) : "Chọn đáp án đúng:", prompt: x.q.startsWith("Chọn câu") ? "" : esc(x.q).replace(/___/g, '<span class="gap">______</span>'), options: order.map(j => x.o[j]), answer: order.indexOf(x.a), correctText: x.o[x.a], why: x.why, review: (lessonTitle ? lessonTitle + ": " : "") + x.q.replace("___", "[" + x.o[x.a] + "]") };
  }
  return { kind: "type", label: "Gõ đáp án đúng vào chỗ trống:", prompt: esc(x.q).replace(/___/g, '<span class="gap">______</span>'), accept: x.a, correctText: x.a[0], why: x.why, review: (lessonTitle ? lessonTitle + ": " : "") + x.q.replace("___", "[" + x.a[0] + "]") };
}
function grammarQuiz(i) {
  const g = G[i - 1];
  runQuiz("BÀI " + i + " · BÀI TẬP NGỮ PHÁP", "unit:" + i, shuffle(g.ex).map(x => grammarQuestion(x)), (score, wrong) => {
    const p = U(i).gex || { best: 0, tries: 0 };
    U(i).gex = { best: Math.max(p.best, score), last: score, tries: p.tries + 1 };
    save({ unit: i, part: "Bài tập ngữ pháp", score, detail: wrong.length ? "Sai: " + wrong.join("; ") : "Đúng hết" });
    resultCard(i, "Bài tập ngữ pháp", score, wrong);
  });
}

/* ---------- ôn tập & kiểm tra cuối ---------- */
function review() {
  const ns = pick(dueWords(), 15);
  if (!ns.length) { toast("Hôm nay em không có từ nào cần ôn."); return home(); }
  const qs = ns.map(n => { const u = unitOfEntry(n); return vocabQuestion(entryOf(n), pick(["listen", "meaning", "cloze", "say"], 1)[0], u.entries); });
  runQuiz("ÔN TẬP", "home", qs, (score, wrong) => {
    save({ unit: "", part: "Ôn tập", score, detail: ns.length + " từ" + (wrong.length ? " · Sai: " + wrong.join("; ") : "") });
    resultCard(0, "Ôn tập", score, wrong, true);
  });
}
function finalTest() {
  if (!allDone()) return home();
  const all = V.flatMap(u => u.entries.map(e => ({ e, pool: u.entries })));
  const kinds = ["listen", "meaning", "cloze", "dict", "say"];
  const vq = pick(all, 25).map(({ e, pool }, j) => vocabQuestion(e, kinds[j % kinds.length], pool));
  const gq = G.map(g => grammarQuestion(pick(g.ex, 1)[0], g.title)).concat(pick(G, 1).map(g => grammarQuestion(pick(g.ex, 1)[0], g.title)));
  runQuiz("KIỂM TRA CUỐI KHOÁ", "home", shuffle(vq.concat(gq)), (score, wrong) => {
    const p = S.final || { best: 0, tries: 0 };
    S.final = { best: Math.max(p.best, score), last: score, tries: p.tries + 1, at: new Date().toISOString() };
    save({ unit: "Cuối khoá", part: "Kiểm tra cuối khoá", score, detail: wrong.length ? "Sai " + wrong.length + " câu" : "Đúng hết" });
    resultCard(0, "Kiểm tra cuối khoá", score, wrong, false, C.FINAL_PASS);
  });
}

/* ---------- thẻ kết quả ---------- */
function resultCard(i, part, score, wrong, noPass, passMark) {
  const pass = passMark || C.PASS;
  const ok = noPass || score >= pass;
  const img = score >= 90 ? "titi-top" : ok ? "titi-good" : "titi-calm";
  const msg = score >= 90 ? "Xuất sắc! Cô giáo Titi rất tự hào về em." : ok ? "Tốt lắm! Em đã đạt yêu cầu." : "Chưa đạt " + pass + "%. Em xem lại các câu sai rồi làm lại nhé — điểm cao nhất sẽ được giữ.";
  let h = '<section class="card center result"><img class="titi" src="./titi/' + img + '.webp" alt="Cô giáo Titi"><p class="kicker">' + (i ? "BÀI " + i + " · " : "") + esc(part.toUpperCase()) + '</p><p class="score ' + (ok ? "good" : "bad") + '">' + score + "%</p><p>" + msg + "</p>";
  if (wrong.length) h += '<div class="wrong"><h3>Cần xem lại (' + wrong.length + ')</h3><ul>' + wrong.map(w => "<li>" + esc(w) + "</li>").join("") + "</ul></div>";
  const back = i ? "unit:" + i : "home";
  h += '<div class="nav center">' + (ok ? "" : '<button class="ghost" id="again">Làm lại</button>') + '<button class="primary" data-go="' + back + '">' + (i ? "Về Bài " + i : "Trang chính") + " →</button></div></section>";
  shell(h);
  const a = document.getElementById("again");
  if (a) a.onclick = () => { if (part === "Luyện từ") vocabQuiz(i); else if (part === "Bài tập ngữ pháp") grammarQuiz(i); else if (part === "Kiểm tra cuối khoá") finalTest(); else go(back); };
}

/* ---------- khởi động ---------- */
function merge(server, local) {
  if (!server) return local; if (!local) return server;
  return (local.updatedAt || 0) > (server.updatedAt || 0) ? local : server;
}
function boot() {
  if (!token) { shell('<section class="card center"><h1>Nền tảng IELTS</h1><p>Em vui lòng mở đúng đường link riêng mà cô Trang đã gửi.</p></section>'); return; }
  if (localMode) {
    S = loadLocal() || blank(); if (!S.start) { S.start = Date.now(); saveLocal(); }
    student = { name: token === "demo" ? "cô (bản thử)" : "", start: null, deadline: null };
    return home();
  }
  fetch(C.API_URL + "?action=load&hs=" + encodeURIComponent(token)).then(r => r.json()).then(j => {
    if (!j.ok) {
      if (j.error === "notfound") return shell('<section class="card center"><h1>Link chưa đúng</h1><p>Không tìm thấy học sinh với đường link này. Em kiểm tra lại link cô gửi nhé.</p></section>');
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
    if (l) { S = l; localMode = false; student = student || { name: "" }; home(); toast("Mạng yếu: em vẫn học được, tiến độ sẽ tự lưu khi có mạng."); }
    else shell('<section class="card center"><h1>Chưa kết nối được</h1><p>Em kiểm tra mạng rồi tải lại trang.</p><button class="primary" onclick="location.reload()">Tải lại</button></section>');
  });
}
boot();
})();
