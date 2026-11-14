/* Luyện tập trên web — thẻ từ, trò chơi, bài tập lý thuyết, kiểm tra 10 câu.
   Không gửi dữ liệu đi đâu; tiến độ chỉ lưu trong localStorage của máy học sinh. */
(function () {
  "use strict";
  var root = document.getElementById("wp-root");
  if (!root || !window.WP_DATA) return;
  var lessonId = root.getAttribute("data-lesson");
  var L = window.WP_DATA[lessonId];
  if (!L) return;
  var assets = root.getAttribute("data-assets") || "";
  var KEY = "wp-practice:" + lessonId;

  var S = {};
  try { S = JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  if (typeof S !== "object" || Array.isArray(S)) S = {};
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* bỏ qua */ } }

  function el(tag, attrs, kids) {
    var node = document.createElement(tag), k;
    if (attrs) for (k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null) continue;
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k === "onclick") node.addEventListener("click", attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (kid) { if (kid) node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid); });
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function shuffle(list) {
    var a = list.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function image(file, alt) { return el("img", { src: assets + file, alt: alt || "", loading: "lazy" }); }
  function button(cls, text, onclick, extra) {
    var attrs = { type: "button", "class": cls, text: text, onclick: onclick }, k;
    if (extra) for (k in extra) attrs[k] = extra[k];
    return el("button", attrs);
  }
  function bar(done, total) {
    var inner = el("span");
    inner.style.width = (total ? Math.round(done / total * 100) : 0) + "%";
    return el("div", { "class": "wp-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(done) }, [inner]);
  }

  var cards = L.cards || [];
  var isImg = !!L.imageDeck;
  var isNote = !!L.noteDeck; /* thẻ ghi nhớ lý thuyết (buổi không có danh sách từ) */
  var groups = L.groups || null;
  var PASS = 8;
  var cardWord = isImg ? "Thẻ biểu đồ" : isNote ? "Thẻ ghi nhớ" : "Thẻ từ";
  var lessonLabel = L.lessonLabel || ("Buổi " + lessonId);
  function sameVi(a, b) { return a.vi === b.vi; }

  /* ---------- thời gian luyện tập thật (chống làm đối phó) ----------
     Chỉ cộng giây khi tab đang hiển thị VÀ học sinh có thao tác trong 60 giây gần nhất. */
  var IDLE_MS = 60000, SECTIONS = ["cards", "game", "theory", "quiz"];
  var MIN_SEC = Math.round(cards.length / 10 * 30 + (L.theory || []).length * 20); /* 0,5 phút / 10 thẻ + 20 giây / câu lý thuyết */
  var MIN_AVG_Q = 2; /* giây / câu trong bài kiểm tra */
  var MIN_CARD_MS = 2000;
  var currentTab = "cards", lastAct = 0, unsaved = 0;
  if (!S.time || typeof S.time !== "object") S.time = {};
  function secs(id) { return Math.max(0, Math.floor(Number(S.time[id]) || 0)); }
  function activeSecs() { return SECTIONS.reduce(function (n, id) { return n + secs(id); }, 0); }
  function mins(sec) { return (Math.round(sec / 6) / 10).toString().replace(".", ","); }
  function touch() { lastAct = Date.now(); }
  var section = root.closest ? (root.closest(".wp") || root) : root;
  ["pointerdown", "keydown", "input"].forEach(function (type) { section.addEventListener(type, touch, true); });
  window.setInterval(function () {
    if (document.visibilityState && document.visibilityState !== "visible") return;
    if (!lastAct || Date.now() - lastAct > IDLE_MS) return;
    S.time[currentTab] = secs(currentTab) + 1;
    if (++unsaved >= 10) { unsaved = 0; save(); renderStatus(); }
  }, 1000);
  document.addEventListener("visibilitychange", function () { if (unsaved) { unsaved = 0; save(); } });

  /* ---------- ghi nhận kết quả về hệ thống của cô (cùng Form điểm mà trang bài học đang dùng) ---------- */
  var SUBMIT = window.WP_SUBMIT || null, CODE = L.code || null;
  function profileFromUrl() {
    var out = { name: "", cls: "" };
    try {
      var q = new URLSearchParams(window.location.search);
      var first = function (keys) { for (var i = 0; i < keys.length; i++) { var v = q.get(keys[i]); if (v) return v; } return ""; };
      out.name = first(["studentName", "fullName", "name", "student", "hoTen", "hoten"]);
      out.cls = first(["studentClass", "className", "class", "lop"]);
    } catch (e) { /* bỏ qua */ }
    return out;
  }
  function normClass(v) {
    var m = String(v || "").trim().toUpperCase().replace(/\s+/g, " ").match(/^(?:IELTS\s*)?(\d{2})$/);
    return m ? "IELTS " + m[1] : "";
  }
  function post(row) {
    var body = new URLSearchParams(), e = SUBMIT.entries;
    body.set(e.name, row.name); body.set(e.className, row.cls); body.set(e.assignmentCode, row.code);
    body.set(e.score, String(row.score)); body.set(e.total, "10");
    body.set(e.wrong, String(10 - row.score)); body.set(e.percent, String(row.score * 10));
    return window.fetch(SUBMIT.formResponseUrl, { method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: body });
  }
  var flushing = false;
  function flush(done) {
    if (!SUBMIT || !CODE || flushing || !(S.outbox && S.outbox.length)) { if (done) done(!(S.outbox && S.outbox.length)); return; }
    flushing = true;
    var row = S.outbox[0];
    var p; try { p = post(row); } catch (e) { p = Promise.reject(e); }
    p.then(function () {
      S.outbox.shift(); save(); flushing = false;
      if (S.outbox.length) flush(done); else if (done) done(true);
    }, function () { flushing = false; if (done) done(false); });
  }
  function queue(rows, done) {
    if (!SUBMIT || !CODE) { if (done) done(null); return; }
    S.outbox = (S.outbox || []).concat(rows).slice(-12); save(); flush(done);
  }
  window.addEventListener("online", function () { flush(); });

  /* ---------- khung chung ---------- */
  var statusList = el("ul", { "class": "wp-status", "aria-label": "Tiến độ của em" });
  var tabList = el("div", { "class": "wp-tabs", role: "tablist", "aria-label": "Các phần luyện tập" });
  var panel = el("div", { "class": "wp-panel", role: "tabpanel", id: "wp-panel", tabindex: "-1" });
  var TABS = [
    { id: "cards", label: "1. " + cardWord, build: buildCards },
    { id: "game", label: "2. Trò chơi", build: buildGame },
    { id: "theory", label: "3. Bài tập lý thuyết", build: buildTheory },
    { id: "quiz", label: "4. Kiểm tra 10 câu", build: buildQuiz }
  ];
  var tabButtons = TABS.map(function (tab) {
    var b = button("wp-tab", tab.label, function () { select(tab.id, true); },
      { role: "tab", id: "wp-tab-" + tab.id, "aria-controls": "wp-panel", "aria-selected": "false", "data-tab": tab.id });
    tabList.appendChild(b);
    return b;
  });
  tabList.addEventListener("keydown", function (ev) {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    var i = tabButtons.indexOf(document.activeElement);
    if (i < 0) return;
    var n = (i + (ev.key === "ArrowRight" ? 1 : tabButtons.length - 1)) % tabButtons.length;
    tabButtons[n].focus();
    select(TABS[n].id, false);
    ev.preventDefault();
  });
  function select(id, remember) {
    currentTab = id;
    TABS.forEach(function (tab, i) {
      var on = tab.id === id;
      tabButtons[i].setAttribute("aria-selected", on ? "true" : "false");
      tabButtons[i].setAttribute("tabindex", on ? "0" : "-1");
      if (on) { panel.setAttribute("aria-labelledby", "wp-tab-" + tab.id); clear(panel); tab.build(); }
    });
    if (remember) { S.tab = id; save(); }
  }
  function renderStatus() {
    clear(statusList);
    var known = (S.known || []).filter(function (t) { return cards.some(function (c) { return c.t === t; }); }).length;
    var rows = [
      [cardWord + ": " + known + "/" + cards.length + " đã nhớ", known === cards.length],
      ["Trò chơi: " + (S.game ? "đã chơi " + S.game + " lần" : "chưa chơi"), !!S.game],
      ["Bài tập: " + (S.theory ? "đúng " + S.theory.best + "/" + L.theory.length : "chưa làm"), !!S.theory],
      ["Kiểm tra: " + (S.quiz ? (S.quiz.done ? "ĐÃ GHI NHẬN " + S.quiz.done.score + "/10" : "cao nhất " + (S.quiz.best || 0) + "/10 · chưa được ghi nhận") : "chưa làm"), !!(S.quiz && S.quiz.done)]
    ];
    rows.push(["Thời gian luyện tập: " + mins(activeSecs()) + " phút", activeSecs() >= MIN_SEC]);
    rows.forEach(function (r) { statusList.appendChild(el("li", { "class": r[1] ? "is-done" : "", text: r[0] })); });
  }

  /* ---------- 1. thẻ ---------- */
  function buildCards() {
    var known = (S.known || []).filter(function (t) { return cards.some(function (c) { return c.t === t; }); });
    var gid = groups && groups.some(function (g) { return g.id === S.group; }) ? S.group : null;
    function inGroup(c) { return !gid || c.g === gid; }
    var deck = cards.filter(inGroup);
    var queue = shuffle(deck.filter(function (c) { return known.indexOf(c.t) < 0; }));
    var flipped = false;
    var box = el("div");
    panel.appendChild(el("h3", { text: L.deckTitle }));
    panel.appendChild(el("p", { "class": "wp-meta", text: isImg
      ? "Nhìn hình, tự gọi tên dạng biểu đồ rồi bấm vào thẻ để xem đáp án. Thẻ “chưa nhớ” sẽ quay lại."
      : isNote ? "Đọc câu hỏi, tự trả lời rồi bấm vào thẻ để xem ý trong tài liệu của cô. Thẻ “chưa nhớ” sẽ quay lại."
      : "Đọc từ, tự nhớ nghĩa rồi bấm vào thẻ để xem nghĩa và ví dụ của cô. Thẻ “chưa nhớ” sẽ quay lại." }));
    if (groups) {
      panel.appendChild(el("div", { "class": "wp-groups", role: "group", "aria-label": "Chọn nhóm từ" },
        [{ id: null, label: "Tất cả (" + cards.length + ")" }].concat(groups.map(function (g) {
          return { id: g.id, label: g.label + " (" + cards.filter(function (c) { return c.g === g.id; }).length + ")" };
        })).map(function (g) {
          return button("wp-chip" + (g.id === gid ? " is-on" : ""), g.label, function () {
            S.group = g.id; save(); clear(panel); buildCards();
            var on = panel.querySelector(".wp-chip.is-on"); if (on) on.focus();
          }, { "aria-pressed": g.id === gid ? "true" : "false", "data-group": g.id || "all" });
        })));
    }
    panel.appendChild(box);
    function restart() {
      S.known = (S.known || []).filter(function (t) { return !deck.some(function (c) { return c.t === t; }); });
      save(); renderStatus(); clear(panel); buildCards();
    }
    function knownHere() { return deck.filter(function (c) { return known.indexOf(c.t) >= 0; }).length; }
    var shownAt = Date.now(), note = "";
    function draw() {
      clear(box);
      box.appendChild(el("p", { "class": "wp-meta", "aria-live": "polite", text: (note ? note + " " : "") + "Đã nhớ " + knownHere() + "/" + deck.length + " thẻ" }));
      box.appendChild(bar(knownHere(), deck.length));
      if (!queue.length) {
        box.appendChild(el("p", { text: "Em đã nhớ hết " + deck.length + " thẻ" + (gid ? " của nhóm này. Hãy chọn nhóm khác hoặc sang phần Trò chơi." : " của buổi này. Hãy sang phần Trò chơi.") }));
        box.appendChild(el("div", { "class": "wp-row" }, [
          button("wp-btn wp-btn--ghost", "Học lại từ đầu", restart, { "data-act": "restart" }),
          button("wp-btn", "Sang Trò chơi", function () { select("game", true); panel.focus(); })
        ]));
        return;
      }
      var c = queue[0];
      var face = flipped
        ? [isImg ? image(c.img, c.alt) : el("span", { "class": "wp-card-term", text: c.t }),
           el("span", { "class": "wp-card-vi", text: c.vi }),
           c.ex ? el("span", { "class": "wp-card-ex", text: c.ex }) : null,
           c.exVi ? el("span", { "class": "wp-card-exvi", text: c.exVi }) : null]
        : [isImg ? image(c.img, c.alt) : el("span", { "class": "wp-card-term", text: c.t }),
           c.pos ? el("span", { "class": "wp-card-pos", text: "(" + c.pos + ")" }) : null,
           el("span", { "class": "wp-card-hint", text: "Bấm để lật thẻ" })];
      var card = button("wp-card" + (flipped ? " is-back" : ""), "", function () { flipped = !flipped; draw(); focusCard(); },
        { "data-act": "flip", "aria-label": flipped ? "Mặt sau: " + c.vi + ". " + (c.ex ? c.ex + ". " : "") + "Bấm để lật lại." : (isImg ? "Thẻ hình: " + c.alt : "Thẻ từ: " + c.t) + ". Bấm để xem đáp án." });
      face.forEach(function (n) { if (n) card.appendChild(n); });
      box.appendChild(card);
      box.appendChild(el("div", { "class": "wp-row" }, [
        button("wp-btn wp-btn--no", "Chưa nhớ", function () { queue.push(queue.shift()); flipped = false; note = ""; shownAt = Date.now(); draw(); focusCard(); }, { "data-act": "unknown" }),
        button("wp-btn wp-btn--yes", "Đã nhớ", function () {
          if (Date.now() - shownAt < MIN_CARD_MS) { /* thẻ phải được xem ít nhất 2 giây mới tính là nhớ */
            note = "Em xem kỹ thẻ này ít nhất 2 giây rồi mới bấm “Đã nhớ” nhé."; draw();
            var y = box.querySelector('[data-act="known"]'); if (y) y.focus(); return;
          }
          note = ""; shownAt = Date.now();
          known.push(queue.shift().t); S.known = known.slice(); save(); renderStatus(); flipped = false; draw(); focusCard();
        }, { "data-act": "known" })
      ]));
    }
    function focusCard() { var b = box.querySelector(".wp-card") || box.querySelector(".wp-btn"); if (b) b.focus(); }
    draw();
  }

  /* ---------- 2. trò chơi ---------- */
  function buildGame() {
    var holder = el("div");
    panel.appendChild(holder);
    matchGame(holder);
    if (L.sort) {
      var sub = el("div", { "class": "wp-sub" });
      panel.appendChild(sub);
      sortGame(sub);
    }
  }
  function gamePlayed() { S.game = (S.game || 0) + 1; save(); renderStatus(); }

  function matchGame(holder) {
    var rounds = [], pool = shuffle(cards), size = pool.length > 5 ? Math.ceil(pool.length / 2) : pool.length;
    if (pool.length > 12) { /* bộ thẻ lớn: mỗi lần chơi lấy ngẫu nhiên 18 thẻ, 3 lượt × 6 cặp */
      var picked18 = [];
      pool.forEach(function (c) { if (picked18.length < 18 && !picked18.some(function (o) { return sameVi(o, c); })) picked18.push(c); });
      pool = picked18; size = 6;
    }
    while (pool.length) rounds.push(pool.splice(0, size));
    var roundNo = 0, mistakes = 0;
    function drawRound() {
      clear(holder);
      holder.appendChild(el("h3", { text: isImg ? "Ghép hình với tên dạng biểu đồ" : isNote ? "Ghép câu hỏi với ý trong tài liệu" : "Ghép từ với nghĩa" }));
      holder.appendChild(el("p", { "class": "wp-meta", text: "Lượt " + (roundNo + 1) + "/" + rounds.length + ". Bấm một ô bên trái rồi bấm ô đúng bên phải." }));
      var live = el("p", { "class": "wp-meta", "aria-live": "polite", text: "Số lần ghép sai: " + mistakes });
      var set = rounds[roundNo], left = el("div"), right = el("div"), picked = null, done = 0;
      function mark(btn, cls) { btn.className = "wp-pair " + cls; }
      shuffle(set).forEach(function (c) {
        var b = button("wp-pair", isImg ? "" : c.t, function () {
          if (picked) mark(picked, "");
          picked = b; mark(b, "is-picked");
        }, { "data-side": "l", "data-key": c.t, "data-vi": c.vi, "aria-label": isImg ? "Hình: " + c.alt : null });
        if (isImg) b.appendChild(image(c.img, c.alt));
        left.appendChild(b);
      });
      shuffle(set).forEach(function (c) {
        var b = button("wp-pair", c.vi, function () {
          if (!picked) { live.textContent = "Hãy chọn một ô bên trái trước."; return; }
          if (picked.getAttribute("data-key") === c.t || picked.getAttribute("data-vi") === c.vi) {
            mark(picked, "is-right"); mark(b, "is-right"); picked.disabled = true; b.disabled = true; picked = null; done++;
            live.textContent = "Đúng. Số lần ghép sai: " + mistakes;
            if (done === set.length) finishRound();
          } else {
            mistakes++;
            var wrongL = picked; picked = null;
            mark(wrongL, "is-wrong"); mark(b, "is-wrong");
            live.textContent = "Chưa đúng, thử lại. Số lần ghép sai: " + mistakes;
            window.setTimeout(function () { if (!wrongL.disabled) mark(wrongL, ""); if (!b.disabled) mark(b, ""); }, 600);
          }
        }, { "data-side": "r", "data-key": c.t });
        right.appendChild(b);
      });
      holder.appendChild(el("div", { "class": "wp-match" }, [left, right]));
      holder.appendChild(live);
    }
    function finishRound() {
      var row = el("div", { "class": "wp-row" });
      if (roundNo + 1 < rounds.length) {
        row.appendChild(button("wp-btn", "Lượt tiếp theo", function () { roundNo++; drawRound(); }, { "data-act": "next-round" }));
      } else {
        gamePlayed();
        holder.appendChild(el("p", { "data-done": "match", text: "Hoàn thành! Em ghép sai " + mistakes + " lần." }));
        row.appendChild(button("wp-btn wp-btn--ghost", "Chơi lại", function () { matchGame(holder); }, { "data-act": "replay" }));
      }
      holder.appendChild(row);
      var next = row.querySelector("button"); if (next) next.focus();
    }
    drawRound();
  }

  function sortGame(holder) {
    var items = shuffle(L.sort.items), i = 0, right = 0, missed = [];
    function draw() {
      clear(holder);
      holder.appendChild(el("h3", { text: L.sort.title }));
      if (i >= items.length) {
        gamePlayed();
        holder.appendChild(el("p", { "class": "wp-score", "data-done": "sort", text: right + "/" + items.length }));
        if (missed.length) {
          holder.appendChild(el("p", { text: "Cần xem lại:" }));
          holder.appendChild(el("ul", { "class": "wp-review" }, missed.map(function (m) {
            return el("li", { text: m[0] + " → " + L.sort.cats[m[1]] });
          })));
        }
        holder.appendChild(el("div", { "class": "wp-row" }, [button("wp-btn wp-btn--ghost", "Chơi lại", function () { sortGame(holder); }, { "data-act": "replay-sort" })]));
        return;
      }
      var it = items[i], answered = false;
      holder.appendChild(el("p", { "class": "wp-meta", text: L.sort.intro + " (" + (i + 1) + "/" + items.length + ")" }));
      holder.appendChild(el("div", { "class": "wp-sort-item", "data-sort-item": it[0], text: it[0] }));
      var fb = el("div", { "aria-live": "polite" });
      var opts = el("div", { "class": "wp-opts" }, L.sort.cats.map(function (cat, ci) {
        return button("wp-opt", cat, function (ev) {
          if (answered) return;
          answered = true;
          var ok = ci === it[1];
          if (ok) right++; else missed.push(it);
          Array.prototype.forEach.call(opts.children, function (b, bi) {
            b.disabled = true;
            if (bi === it[1]) b.className = "wp-opt is-right";
            else if (b === ev.currentTarget) b.className = "wp-opt is-wrong";
          });
          fb.appendChild(el("div", { "class": "wp-ex " + (ok ? "is-right" : "is-wrong") }, [
            el("strong", { text: ok ? "Đúng" : "Chưa đúng" }), it[0] + " thuộc nhóm: " + L.sort.cats[it[1]] + "."
          ]));
          var next = button("wp-btn", i + 1 < items.length ? "Tiếp" : "Xem kết quả", function () { i++; draw(); var f = holder.querySelector(".wp-opt,.wp-btn"); if (f) f.focus(); }, { "data-act": "next" });
          fb.appendChild(el("div", { "class": "wp-row" }, [next]));
          next.focus();
        }, { "data-cat": String(ci) });
      }));
      holder.appendChild(opts);
      holder.appendChild(fb);
    }
    draw();
  }

  /* ---------- câu hỏi dùng chung (bài tập + kiểm tra) ---------- */
  function runSet(opt) {
    var items = opt.items, i = 0, right = 0, missed = [], times = [];
    var box = el("div");
    panel.appendChild(box);
    function draw() {
      clear(box);
      if (i >= items.length) return finish();
      var it = items[i];
      box.appendChild(el("p", { "class": "wp-meta", text: "Câu " + (i + 1) + "/" + items.length }));
      box.appendChild(bar(i, items.length));
      var q = el("div", { "class": "wp-q", "data-q": String(i) }, [it.q]);
      if (it.img) q.appendChild(image(it.img, it.alt));
      box.appendChild(q);
      var fb = el("div", { "aria-live": "polite" }), t0 = Date.now();
      function answered(ok, extra) {
        times.push(Date.now() - t0);
        if (ok) right++; else missed.push(it);
        fb.appendChild(el("div", { "class": "wp-ex " + (ok ? "is-right" : "is-wrong") }, [el("strong", { text: ok ? "Đúng" : "Chưa đúng" }), extra, it.ex]));
        var next = button("wp-btn", i + 1 < items.length ? "Câu tiếp" : "Xem kết quả", function () {
          i++; draw(); var f = box.querySelector(".wp-opt,.wp-move,.wp-btn"); if (f) f.focus();
        }, { "data-act": "next" });
        fb.appendChild(el("div", { "class": "wp-row" }, [next]));
        next.focus();
      }
      if (it.type === "order") drawOrder(it, box, answered); else drawChoice(it, box, answered);
      box.appendChild(fb);
    }
    function finish() {
      var extra = opt.onDone(right, items.length, times);
      box.appendChild(el("h3", { text: opt.doneTitle }));
      if (extra) box.appendChild(extra);
      box.appendChild(el("p", { "class": extra ? "wp-meta" : "wp-score", "data-score": right + "/" + items.length, text: (extra ? "Điểm lần này: " : "") + right + "/" + items.length }));
      var doneText = opt.doneText(right, items.length);
      if (doneText) box.appendChild(el("p", { text: doneText }));
      if (missed.length) {
        box.appendChild(el("p", { text: "Các câu cần xem lại:" }));
        box.appendChild(el("ol", { "class": "wp-review" }, missed.map(function (m) {
          return el("li", { text: m.q + " — " + (m.type === "order" ? m.ex : "Đáp án: " + m.opts[m.a] + ". " + m.ex) });
        })));
      }
      box.appendChild(el("div", { "class": "wp-row" }, [button("wp-btn wp-btn--ghost", "Làm lại", function () { clear(panel); opt.again(); panel.focus(); }, { "data-act": "again" })]));
    }
    draw();
  }
  function drawChoice(it, box, answered) {
    var order = it.opts.map(function (_, n) { return n; });
    if (!it.keepOrder) order = shuffle(order);
    var done = false;
    var wrap = el("div", { "class": "wp-opts" }, order.map(function (n) {
      return button("wp-opt", it.opts[n], function (ev) {
        if (done) return;
        done = true;
        Array.prototype.forEach.call(wrap.children, function (b) {
          b.disabled = true;
          if (b.getAttribute("data-n") === String(it.a)) b.className = "wp-opt is-right";
          else if (b === ev.currentTarget) b.className = "wp-opt is-wrong";
        });
        answered(n === it.a, null);
      }, { "data-n": String(n) });
    }));
    box.appendChild(wrap);
  }
  function drawOrder(it, box, answered) {
    var order = it.items.map(function (_, n) { return n; }), cur, tries = 0;
    do { cur = shuffle(order); tries++; } while (tries < 20 && cur.every(function (v, k) { return v === k; }));
    var list = el("ol", { "class": "wp-order" }), locked = false;
    var check = button("wp-btn", "Kiểm tra thứ tự", function () {
      if (locked) return;
      locked = true; check.disabled = true;
      Array.prototype.forEach.call(list.querySelectorAll("button"), function (b) { b.disabled = true; });
      var ok = cur.every(function (v, k) { return v === k; });
      answered(ok, ok ? null : el("ol", null, it.items.map(function (t) { return el("li", { text: t }); })));
    }, { "data-act": "check" });
    function move(pos, d) {
      var to = pos + d;
      if (locked || to < 0 || to >= cur.length) return;
      var t = cur[pos]; cur[pos] = cur[to]; cur[to] = t;
      drawList();
      var b = list.querySelector('[data-pos="' + to + '"][data-dir="' + d + '"]');
      if (!b || b.disabled) b = list.querySelector('[data-pos="' + to + '"]:not([disabled])');
      if (b) b.focus();
    }
    function drawList() {
      clear(list);
      cur.forEach(function (n, pos) {
        var up = button("wp-move", "↑", function () { move(pos, -1); }, { "aria-label": "Chuyển lên: " + it.items[n], "data-pos": String(pos), "data-dir": "-1" });
        var down = button("wp-move", "↓", function () { move(pos, 1); }, { "aria-label": "Chuyển xuống: " + it.items[n], "data-pos": String(pos), "data-dir": "1" });
        if (pos === 0) up.disabled = true;
        if (pos === cur.length - 1) down.disabled = true;
        list.appendChild(el("li", { "data-n": String(n) }, [el("span", { text: it.items[n] }), up, down]));
      });
    }
    drawList();
    box.appendChild(el("p", { "class": "wp-meta", text: "Dùng nút ↑ ↓ để đổi chỗ, rồi bấm “Kiểm tra thứ tự”." }));
    box.appendChild(list);
    box.appendChild(el("div", { "class": "wp-row" }, [check]));
  }

  /* ---------- 3. bài tập lý thuyết ---------- */
  function buildTheory() {
    panel.appendChild(el("h3", { text: "Bài tập lý thuyết (" + L.theory.length + " câu)" }));
    panel.appendChild(el("p", { "class": "wp-meta", text: "Mỗi câu có lời giải thích ngay sau khi em trả lời." }));
    runSet({
      items: L.theory,
      doneTitle: "Kết quả bài tập lý thuyết",
      doneText: function (r, n) { return r === n ? "Tuyệt vời, em nắm chắc lý thuyết của buổi này." : "Em xem lại các câu sai rồi làm lại cho tới khi đúng hết nhé."; },
      onDone: function (r) { S.theory = { last: r, best: Math.max(r, S.theory ? S.theory.best : 0) }; save(); renderStatus(); },
      again: buildTheory
    });
  }

  /* ---------- 4. kiểm tra 10 câu + thẻ kết quả ---------- */
  function vocabQuestion(c) {
    var others = [];
    shuffle(cards).forEach(function (o) {
      if (others.length < 3 && o.t !== c.t && !sameVi(o, c) && !others.some(function (x) { return sameVi(x, o); })) others.push(o);
    });
    others = others.map(function (o) { return o.t; });
    return isImg
      ? { q: "Đây là dạng biểu đồ nào?", img: c.img, alt: "Hình một dạng biểu đồ trong bài giảng", opts: [c.t].concat(others), a: 0, ex: c.ex }
      : { q: "Từ/cụm từ nào có nghĩa là “" + c.vi + "”?", opts: [c.t].concat(others), a: 0, ex: c.t + ": " + c.vi + "." + (c.ex ? " Ví dụ: " + c.ex : "") };
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function stamp(d) { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " · " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  /* r = { score, when, fast, avg, active } */
  function verdict(r) {
    if (r.score < PASS) return ["fail", "CHƯA ĐẠT · cần từ " + PASS + "/10"];
    if (r.fast) return ["fast", "CHƯA ĐƯỢC GHI NHẬN · làm quá nhanh"];
    return ["pass", "ĐẠT · ĐÃ GHI NHẬN HOÀN THÀNH"];
  }
  function resultCard(r) {
    var v = verdict(r);
    return el("div", { "class": "wp-result is-" + v[0], "data-result": v[0], role: "group", "aria-label": "Thẻ kết quả" }, [
      el("p", { "class": "wp-result-brand", text: "MS. TRANG TRIEU EDUCATION · LUYỆN TẬP TRÊN WEB" }),
      el("p", { "class": "wp-result-lesson", "data-result-lesson": "", text: lessonLabel }),
      el("p", { "class": "wp-result-name", "data-result-name": "", text: (S.name || "(chưa nhập tên)") + (S.cls ? " · " + S.cls : "") }),
      el("p", { "class": "wp-result-score", "data-result-score": r.score + "/10", text: r.score + "/10" }),
      el("p", { "class": "wp-result-verdict", text: v[1] }),
      el("p", { "class": "wp-result-time", "data-result-time": "", text: "Hoàn thành lúc " + r.when + " · luyện tập " + mins(r.active) + " phút" })
    ]);
  }
  function detailCode(r, attempt) {
    var v = verdict(r)[0];
    return "LT-" + CODE + " | " + (v === "pass" ? "DAT" : v === "fast" ? "LAM QUA NHANH - khong tinh" : "CHUA DAT") +
      " | luyen " + mins(r.active) + "ph (the " + mins(secs("cards")) + " · tro choi " + mins(secs("game")) + " · ly thuyet " + mins(secs("theory")) + " · kiem tra " + mins(secs("quiz")) + ")" +
      " | toi thieu " + mins(MIN_SEC) + "ph | lan kiem tra " + attempt + " | TB " + (Math.round(r.avg * 10) / 10).toString().replace(".", ",") + " giay/cau";
  }
  function buildQuiz() {
    var pool = L.quiz || [];
    var nTheory = Math.min(pool.length, L.quizTheory || pool.length, 10);
    var quizCards = cards.filter(function (c) { return !c.noQuiz; });
    var nVocab = isNote ? 0 : Math.min(10 - nTheory, quizCards.length);
    var title = "Kiểm tra cuối buổi (10 câu)";
    panel.appendChild(el("h3", { text: title }));
    panel.appendChild(el("p", { "class": "wp-meta", text: (nVocab ? (isImg ? nVocab + " câu nhận diện biểu đồ" : nVocab + " câu từ vựng") + " và " : "") + nTheory + " câu lý thuyết. Đúng từ " + PASS + "/10 và luyện tập nghiêm túc (ít nhất " + mins(MIN_SEC) + " phút cho cả 4 phần) thì máy tự ghi nhận em đã hoàn thành. Em được làm lại không giới hạn." }));
    var gate = el("div");
    panel.appendChild(gate);
    if (S.quiz && S.quiz.done) {
      gate.appendChild(el("p", { "class": "wp-meta", text: "Kết quả đã được ghi nhận của em trên máy này:" }));
      gate.appendChild(resultCard(S.quiz.done));
    }
    var fromUrl = profileFromUrl();
    var input = el("input", { type: "text", id: "wp-name", "class": "wp-input", autocomplete: "name", maxlength: "60", placeholder: "Ví dụ: Nguyễn Văn A" });
    input.value = S.name || fromUrl.name || "";
    var clsInput = el("input", { type: "text", id: "wp-class", "class": "wp-input", maxlength: "12", placeholder: "Ví dụ: IELTS 45", inputmode: "text", autocomplete: "off" });
    clsInput.value = S.cls || normClass(fromUrl.cls) || "";
    var warn = el("p", { "class": "wp-warn", role: "alert" });
    function start() {
      var name = input.value.replace(/\s+/g, " ").trim(), cls = normClass(clsInput.value);
      if (name.length < 2) { warn.textContent = "Em nhập họ và tên trước khi làm bài kiểm tra nhé."; input.focus(); return; }
      if (!cls) { warn.textContent = "Em nhập đúng lớp của mình, ví dụ: IELTS 45."; clsInput.focus(); return; }
      S.name = name; S.cls = cls; save();
      clear(panel);
      panel.appendChild(el("h3", { text: title }));
      var sendNote = el("p", { "class": "wp-send", "data-send": "", role: "status" });
      runSet({
        items: shuffle(quizCards).slice(0, nVocab).map(vocabQuestion).concat(shuffle(pool).slice(0, nTheory)),
        doneTitle: "Kết quả kiểm tra",
        doneText: function () { return ""; },
        onDone: function (score, total, times) {
          var prev = S.quiz || {}, attempt = (prev.times || 0) + 1;
          var avg = times.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, times.length) / 1000;
          var active = activeSecs();
          var tooQuick = avg < MIN_AVG_Q, tooShort = active < MIN_SEC;
          var r = { score: score, when: stamp(new Date()), fast: tooQuick || tooShort, avg: avg, active: active };
          var v = verdict(r)[0];
          S.quiz = { last: score, best: Math.max(score, prev.best || 0), times: attempt, done: prev.done || null };
          var rows = [{ name: S.name, cls: S.cls, code: detailCode(r, attempt), score: score }];
          if (v === "pass" && !(prev.done && prev.done.score >= score)) {
            S.quiz.done = r;
            /* countRow=false: mã này đã dùng cho điểm bài test 40 câu trên cùng Form, nên chỉ gửi dòng chi tiết "LT-…" để không lẫn điểm. */
            if (L.countRow) rows.unshift({ name: S.name, cls: S.cls, code: CODE, score: score });
          }
          save(); renderStatus();
          var wrap = el("div", null, [resultCard(r)]);
          var msg = v === "pass" ? "Em đã hoàn thành phần Luyện tập trên web của buổi này."
            : v === "fail" ? "Chưa đạt. Em học lại thẻ và bài tập lý thuyết, sau đó bấm “Làm lại” (không giới hạn số lần)."
            : tooShort ? "Điểm của em đủ, nhưng em mới luyện " + mins(active) + " phút — bài này cần ít nhất " + mins(MIN_SEC) + " phút học thẻ, chơi trò chơi và làm bài tập lý thuyết cho cẩn thận. Em luyện thêm rồi làm lại bài kiểm tra nhé, cô tin em làm được."
            : "Điểm của em đủ, nhưng em trả lời quá nhanh (trung bình dưới " + MIN_AVG_Q + " giây một câu). Em đọc kỹ từng câu rồi làm lại nhé — kết quả làm cẩn thận mới được ghi nhận.";
          wrap.appendChild(el("p", { "data-verdict-msg": v, text: msg }));
          wrap.appendChild(sendNote);
          if (SUBMIT && CODE) {
            sendNote.textContent = "Đang gửi kết quả về hệ thống của cô…";
            queue(rows, function (ok) {
              sendNote.textContent = ok
                ? (v === "pass" ? "Máy đã gửi kết quả về hệ thống của cô (họ tên, lớp, điểm, thời gian luyện tập). Em không cần chụp ảnh hay nộp gì thêm."
                                : "Máy đã ghi lại lượt làm này (điểm và thời gian luyện tập) để cô theo dõi.")
                : "Chưa gửi được kết quả (mạng yếu). Em giữ trang mở; máy sẽ tự gửi lại khi có mạng hoặc khi em mở lại trang này.";
              sendNote.setAttribute("data-send", ok ? "ok" : "pending");
            });
          }
          return wrap;
        },
        again: buildQuiz
      });
      var f = panel.querySelector(".wp-opt,.wp-move,.wp-btn"); if (f) f.focus();
    }
    [input, clsInput].forEach(function (c) { c.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); start(); } }); });
    gate.appendChild(el("label", { "class": "wp-label", "for": "wp-name", text: "Họ và tên của em (đúng như trong danh sách lớp)" }));
    gate.appendChild(input);
    gate.appendChild(el("label", { "class": "wp-label", "for": "wp-class", text: "Lớp của em" }));
    gate.appendChild(clsInput);
    gate.appendChild(warn);
    gate.appendChild(el("div", { "class": "wp-row" }, [button("wp-btn", S.quiz ? "Làm lại bài kiểm tra" : "Bắt đầu kiểm tra", start, { "data-act": "start-quiz" })]));
  }

  root.appendChild(statusList);
  root.appendChild(tabList);
  root.appendChild(panel);
  renderStatus();
  flush();
  select(TABS.some(function (t) { return t.id === S.tab; }) ? S.tab : "cards", false);
})();
