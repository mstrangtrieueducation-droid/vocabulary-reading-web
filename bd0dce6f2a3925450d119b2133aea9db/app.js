/* Luyện phát âm IELTS — 50 tuần. Ms Trang Trieu Education.
   Luyện trên web (nghe mẫu, nghe chậm, thu giọng, nghe lại, so sánh) → bước cuối quay màn hình và nộp Google Form.
   Phần ghi âm lấy cách làm của trang Nền tảng IELTS: mỗi lượt xin micro mới rồi tắt hẳn (iPhone), iPhone ghi mp4. */
(() => {
"use strict";
const C = Object.assign({ CLASSES: [], FORM_URL: "", FORM_ENTRIES: {} }, window.PA_CONFIG || {});
const D = window.PA_DATA || [];
const app = document.getElementById("app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mark = s => esc(s).replace(/\*([^*]+)\*/g, '<b class="st">$1</b>').replace(/\s*([↗↘])/g, '<span class="ar">&nbsp;$1</span>').replace(/ \/ /g, ' <span class="pz">/</span> ');
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2800); }
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
let student = store.get("pa-student");
if (student && (!student.name || C.CLASSES.indexOf(student.cls) < 0)) student = null;
const P = store.get("pa-progress") || {};
const saveP = () => store.set("pa-progress", P);
const prog = w => P[w] || (P[w] = { d: {}, sub: 0 });

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
  shell(inAppHtml() + '<section class="card hello"><span class="kick">Luyện phát âm IELTS · 50 tuần</span><h1>Chào ' + esc(student.name.split(" ").pop()) + "!</h1>" +
    "<p>Mỗi tuần một lỗi phát âm và một chủ đề Speaking Part 1, khoảng 10–15 phút. Em nghe mẫu, nghe chậm, thu giọng mình để so sánh, rồi quay màn hình đọc bài và nộp cho cô.</p></section>" +
    groups.map(g => '<h2 class="grp">' + esc(g.name) + "<small>Tuần " + g.items[0].w + "–" + g.items[g.items.length - 1].w + '</small></h2><div class="weeks">' +
      g.items.map(L => '<a class="wk' + (P[L.w] && P[L.w].sub ? " done" : "") + '" href="?w=' + L.w + '"><span class="n">' + (P[L.w] && P[L.w].sub ? "✓" : L.w) + "</span><span><b>" + esc(L.s) + "</b><small>Tuần " + L.w + " · " + esc(L.t) + " · " + L.code + "</small></span></a>").join("") + "</div>").join(""));
}

/* ---------- bài học ---------- */
const STEPS = [["Từ khoá", "Nghe – thu – so sánh"], ["Từng câu", "Câu trả lời Part 1"], ["Trọn câu", "Đọc liền một hơi"], ["Nộp bài", "Quay màn hình"]];
function lesson(L) {
  const pr = prog(L.w), recs = {};
  const hasMarks = /[*↗↘‿]| \/ /.test(JSON.stringify(L.q) + JSON.stringify(L.k.map(x => x.t)));
  const items = [
    L.k.map(x => ({ kind: "w", html: mark(x.t), ipa: x.ipa, vi: x.vi, audio: [x.a], max: 12 })).concat(L.r.map(x => ({ kind: "w", html: mark(x.t), ipa: x.ipa, vi: x.vi, audio: [x.a], max: 12, review: x.from }))),
    [].concat.apply([], L.q.map((q, qi) => q.s.map((s, si) => ({ kind: "s", q: q.q, qa: q.qa, qi, html: mark(s.t), audio: [s.a], max: 25, label: "Câu hỏi " + (qi + 1) + " · câu " + (si + 1) + "/" + q.s.length })))),
    L.q.map((q, qi) => ({ kind: "f", q: q.q, qa: q.qa, qi, html: q.s.map(s => mark(s.t)).join(" "), audio: q.s.map(s => s.a), max: 60, label: "Câu trả lời " + (qi + 1) + "/3" }))
  ];
  let step = 0, idx = 0, recording = false, busy = false, msg = "";
  shell("");
  cleanup = () => { Object.keys(recs).forEach(k => { try { URL.revokeObjectURL(recs[k]); } catch (e) {} }); };
  const done = (s, i) => (pr.d[s] || []).indexOf(i) >= 0;
  const stepOk = s => s < 3 ? items[s].every((x, i) => done(s, i)) : !!pr.sub;

  function head() {
    return '<section class="card lhead"><span class="kick">Tuần ' + L.w + " · " + esc(L.g) + "</span><h1>" + esc(L.s) + '</h1><div class="meta"><span class="tag">Part 1: ' + esc(L.t) + " · " + esc(L.tv) + '</span><span class="tag">Mã bài ' + L.code + "</span></div>" +
      (step === 0 && idx === 0 ? '<ol class="explain">' + L.x.map(t => "<li>" + mark(t) + "</li>").join("") + "</ol>" : '<details class="why"><summary>Xem lại cách đọc</summary><ol class="explain">' + L.x.map(t => "<li>" + mark(t) + "</li>").join("") + "</ol></details>") + "</section>" +
      '<nav class="steps" aria-label="Các bước">' + STEPS.map((s, i) => '<button data-step="' + i + '" class="' + (i === step ? "cur " : "") + (stepOk(i) ? "ok" : "") + '"><b>' + (stepOk(i) ? "✓ " : "") + "BƯỚC " + (i + 1) + "</b>" + s[0] + "</button>").join("") + "</nav>";
  }
  function bindSteps() { app.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { step = +b.dataset.step; idx = 0; msg = ""; draw(true); }); }

  function draw(top) {
    recordStop(); recording = false; busy = false; stopAudio();
    if (step === 3) return submit();
    const list = items[step], it = list[idx], key = step + ":" + idx, rec = recs[key];
    const legend = hasMarks && step > 0 ? '<p class="legend"><b class="st">từ gạch chân</b> = nhấn mạnh · <span class="pz">/</span> = ngắt hơi · <span class="ar">↗ ↘</span> = lên / xuống giọng · ‿ = nối âm</p>' : "";
    const html = inAppHtml() + head() + '<section class="card"><div class="fc-top"><span class="count">' + (it.kind === "w" ? "Từ " + (idx + 1) + " / " + list.length + (it.review ? " · ôn lại tuần " + it.review : "") : esc(it.label)) + '</span><span class="dots">' + list.map((x, i) => '<i class="' + (done(step, i) ? "d " : "") + (i === idx ? "c" : "") + '"></i>').join("") + "</span></div>" +
      (it.q ? '<div class="qline"><span><b>GIÁM KHẢO HỎI</b>' + esc(it.q) + '</span><button class="btn ghost sm" id="qa" aria-label="Nghe câu hỏi">🔊</button></div>' : "") + legend +
      '<h2 class="term ' + (it.kind === "s" ? "sent" : it.kind === "f" ? "full" : "") + '">' + it.html + "</h2>" +
      (it.ipa ? '<p class="ipa">' + esc(it.ipa) + '</p><p class="vi">' + esc(it.vi) + "</p>" : "") +
      '<div class="audio"><button class="btn sound" id="mdl">🔊 Nghe mẫu</button><button class="btn ghost" id="slow">🐢 Nghe chậm</button></div>' +
      (canRecord ? '<button class="mic" id="mic"><span class="mi">🎙️</span><span class="ml">' + (rec ? "Thu lại" : "Bấm để thu giọng em") + "</span></button>" : '<p class="hint warn">Trình duyệt này chưa ghi âm được. Em vẫn nghe mẫu và đọc theo được; muốn thu giọng thì mở bằng Chrome hoặc Safari.</p>') +
      '<p class="hint' + (msg ? " warn" : "") + '" id="hint">' + (msg || (rec ? "Nghe lại giọng em rồi so với mẫu. Chưa giống thì thu lại, bao nhiêu lần cũng được." : it.kind === "f" ? "Nghe mẫu cả câu trả lời, rồi bấm micro và đọc liền một hơi." : "Nghe mẫu 2–3 lần, nghe chậm để bắt từng âm, rồi bấm micro và đọc.")) + "</p>" +
      (rec ? '<div class="audio"><button class="btn ghost" id="me">▶ Giọng em</button><button class="btn ghost" id="cmp">🔁 So sánh: mẫu → em</button></div>' : "") +
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
    app.innerHTML = head() + '<section class="card"><span class="kick">Bước 4 · Trả bài</span><h2 style="margin-top:4px">Quay màn hình, đọc 3 câu trả lời và nộp cho cô</h2>' +
      (practised ? "" : '<p class="hint warn" style="text-align:left;margin-top:10px">Em chưa luyện hết các bước 1–3. Em nên luyện xong rồi mới quay bài nộp.</p>') +
      '<div class="codebar"><span><small>Mã bài</small><b>' + L.code + "</b></span><span><small>Học sinh</small><b>" + esc(student.name) + " · " + esc(student.cls) + "</b></span></div>" +
      "<h3>Hướng dẫn trả bài</h3><ol class=\"guide\"><li>Em mở đúng màn hình này, tắt giọng mẫu, rồi bật <b>quay màn hình</b> và thu cả <b>micro</b>. Em không cần quay mặt.</li>" +
      "<li>Em <b>quay thử 10 giây</b>, nói một câu rồi xem lại để chắc chắn nghe rõ giọng em.</li>" +
      "<li>Em đọc to, rõ lần lượt <b>3 câu trả lời</b> trong khung vàng bên dưới (không cần đọc câu hỏi). Nhớ đúng âm của tuần này: <b>" + esc(L.s) + "</b>.</li>" +
      "<li>Đọc xong, em dừng quay màn hình rồi bấm <b>Nộp bài</b> để gửi đúng video của bài này.</li></ol>" +
      '<div class="sheet"><h3>Em đọc 3 câu trả lời này trong video</h3>' + L.q.map((q, i) => '<div class="a"><p class="qq">' + (i + 1) + ". " + esc(q.q) + '</p><p class="aa">' + q.s.map(s => mark(s.t)).join(" ") + "</p></div>").join("") + "</div>" +
      '<div class="checks">' + L.q.map((q, i) => '<label><input type="checkbox"> Em đã đọc câu trả lời ' + (i + 1) + " trong video.</label>").join("") + '<label><input type="checkbox"> Em đã xem lại video: có hình màn hình này và nghe rõ giọng em.</label></div>' +
      (url ? '<a class="btn gold big block" id="send" href="' + esc(url) + '" target="_blank" rel="noopener">Nộp bài</a><p class="small muted center" style="margin-top:10px">Form đã điền sẵn họ tên, lớp và mã bài <b>' + L.code + "</b>. Em đăng nhập Google để tải video lên, bấm <b>Gửi</b> và chờ xác nhận đã nộp.</p>" :
        '<button class="btn gold big block off" id="send" disabled>Nộp bài</button><p class="hint warn">Cô chưa mở Form nộp bài cho khoá này. Em giữ video lại và báo cô nhé.</p>') +
      '<div class="nav"><button class="btn ghost" id="pv">← Luyện lại</button><a class="btn ghost" href="./">Danh sách 50 tuần</a></div></section>';
    window.scrollTo(0, 0); bindSteps();
    document.getElementById("pv").onclick = () => { step = 2; idx = 0; draw(true); };
    const send = document.getElementById("send");
    if (url) send.onclick = () => { pr.sub = Date.now(); saveP(); const t = app.querySelector('[data-step="3"]'); if (t) { t.classList.add("ok"); t.querySelector("b").textContent = "✓ BƯỚC 4"; } };
  }
  draw(true);
}

if (!D.length) app.innerHTML = '<section class="card narrow center"><h1>Chưa tải được bài học</h1><p>Em kiểm tra mạng rồi tải lại trang.</p><button class="btn primary" onclick="location.reload()">Tải lại</button></section>';
else route();
})();
