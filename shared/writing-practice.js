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

  /* ---------- khung chung ---------- */
  var statusList = el("ul", { "class": "wp-status", "aria-label": "Tiến độ của em" });
  var tabList = el("div", { "class": "wp-tabs", role: "tablist", "aria-label": "Các phần luyện tập" });
  var panel = el("div", { "class": "wp-panel", role: "tabpanel", id: "wp-panel", tabindex: "-1" });
  var TABS = [
    { id: "cards", label: isImg ? "1. Thẻ biểu đồ" : "1. Thẻ từ", build: buildCards },
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
      [(isImg ? "Thẻ biểu đồ: " : "Thẻ từ: ") + known + "/" + cards.length + " đã nhớ", known === cards.length],
      ["Trò chơi: " + (S.game ? "đã chơi " + S.game + " lần" : "chưa chơi"), !!S.game],
      ["Bài tập: " + (S.theory ? "đúng " + S.theory.best + "/" + L.theory.length : "chưa làm"), !!S.theory],
      ["Kiểm tra: " + (S.quiz ? "cao nhất " + S.quiz.best + "/10" : "chưa làm"), !!S.quiz]
    ];
    rows.forEach(function (r) { statusList.appendChild(el("li", { "class": r[1] ? "is-done" : "", text: r[0] })); });
  }

  /* ---------- 1. thẻ ---------- */
  function buildCards() {
    var known = (S.known || []).filter(function (t) { return cards.some(function (c) { return c.t === t; }); });
    var queue = shuffle(cards.filter(function (c) { return known.indexOf(c.t) < 0; }));
    var flipped = false;
    var box = el("div");
    panel.appendChild(el("h3", { text: L.deckTitle }));
    panel.appendChild(el("p", { "class": "wp-meta", text: isImg
      ? "Nhìn hình, tự gọi tên dạng biểu đồ rồi bấm vào thẻ để xem đáp án. Thẻ “chưa nhớ” sẽ quay lại."
      : "Đọc từ, tự nhớ nghĩa rồi bấm vào thẻ để xem nghĩa và ví dụ của cô. Thẻ “chưa nhớ” sẽ quay lại." }));
    panel.appendChild(box);
    function restart() { S.known = []; save(); renderStatus(); clear(panel); buildCards(); }
    function draw() {
      clear(box);
      box.appendChild(el("p", { "class": "wp-meta", "aria-live": "polite", text: "Đã nhớ " + known.length + "/" + cards.length + " thẻ" }));
      box.appendChild(bar(known.length, cards.length));
      if (!queue.length) {
        box.appendChild(el("p", { text: "Em đã nhớ hết " + cards.length + " thẻ của buổi này. Hãy sang phần Trò chơi." }));
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
           el("span", { "class": "wp-card-ex", text: c.ex })]
        : [isImg ? image(c.img, c.alt) : el("span", { "class": "wp-card-term", text: c.t }),
           c.pos ? el("span", { "class": "wp-card-pos", text: "(" + c.pos + ")" }) : null,
           el("span", { "class": "wp-card-hint", text: "Bấm để lật thẻ" })];
      var card = button("wp-card" + (flipped ? " is-back" : ""), "", function () { flipped = !flipped; draw(); focusCard(); },
        { "data-act": "flip", "aria-label": flipped ? "Mặt sau: " + c.vi + ". " + c.ex + ". Bấm để lật lại." : (isImg ? "Thẻ hình: " + c.alt : "Thẻ từ: " + c.t) + ". Bấm để xem đáp án." });
      face.forEach(function (n) { if (n) card.appendChild(n); });
      box.appendChild(card);
      box.appendChild(el("div", { "class": "wp-row" }, [
        button("wp-btn wp-btn--no", "Chưa nhớ", function () { queue.push(queue.shift()); flipped = false; draw(); focusCard(); }, { "data-act": "unknown" }),
        button("wp-btn wp-btn--yes", "Đã nhớ", function () {
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
    while (pool.length) rounds.push(pool.splice(0, size));
    var roundNo = 0, mistakes = 0;
    function drawRound() {
      clear(holder);
      holder.appendChild(el("h3", { text: isImg ? "Ghép hình với tên dạng biểu đồ" : "Ghép từ với nghĩa" }));
      holder.appendChild(el("p", { "class": "wp-meta", text: "Lượt " + (roundNo + 1) + "/" + rounds.length + ". Bấm một ô bên trái rồi bấm ô đúng bên phải." }));
      var live = el("p", { "class": "wp-meta", "aria-live": "polite", text: "Số lần ghép sai: " + mistakes });
      var set = rounds[roundNo], left = el("div"), right = el("div"), picked = null, done = 0;
      function mark(btn, cls) { btn.className = "wp-pair " + cls; }
      shuffle(set).forEach(function (c) {
        var b = button("wp-pair", isImg ? "" : c.t, function () {
          if (picked) mark(picked, "");
          picked = b; mark(b, "is-picked");
        }, { "data-side": "l", "data-key": c.t, "aria-label": isImg ? "Hình: " + c.alt : null });
        if (isImg) b.appendChild(image(c.img, c.alt));
        left.appendChild(b);
      });
      shuffle(set).forEach(function (c) {
        var b = button("wp-pair", c.vi, function () {
          if (!picked) { live.textContent = "Hãy chọn một ô bên trái trước."; return; }
          if (picked.getAttribute("data-key") === c.t) {
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
    var items = opt.items, i = 0, right = 0, missed = [];
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
      var fb = el("div", { "aria-live": "polite" });
      function answered(ok, extra) {
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
      opt.onDone(right, items.length);
      box.appendChild(el("h3", { text: opt.doneTitle }));
      box.appendChild(el("p", { "class": "wp-score", "data-score": right + "/" + items.length, text: right + "/" + items.length }));
      box.appendChild(el("p", { text: opt.doneText(right, items.length) }));
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

  /* ---------- 4. kiểm tra 10 câu ---------- */
  function vocabQuestion(c) {
    var others = shuffle(cards.filter(function (o) { return o.t !== c.t; })).slice(0, 3).map(function (o) { return o.t; });
    return isImg
      ? { q: "Đây là dạng biểu đồ nào?", img: c.img, alt: "Hình một dạng biểu đồ trong bài giảng", opts: [c.t].concat(others), a: 0, ex: c.ex }
      : { q: "Từ/cụm từ nào có nghĩa là “" + c.vi + "”?", opts: [c.t].concat(others), a: 0, ex: c.t + ": " + c.vi + ". Ví dụ: " + c.ex };
  }
  function buildQuiz() {
    var nVocab = 10 - L.quiz.length;
    var items = shuffle(cards).slice(0, nVocab).map(vocabQuestion).concat(shuffle(L.quiz));
    panel.appendChild(el("h3", { text: "Kiểm tra cuối buổi (10 câu)" }));
    panel.appendChild(el("p", { "class": "wp-meta", text: (isImg ? nVocab + " câu nhận diện biểu đồ" : nVocab + " câu từ vựng") + " và " + L.quiz.length + " câu lý thuyết. Điểm chỉ để em tự kiểm tra." }));
    runSet({
      items: items,
      doneTitle: "Điểm kiểm tra",
      doneText: function (r) { return r >= 8 ? "Em đã nắm được bài. Giữ vững nhé!" : "Em nên học lại thẻ và bài tập lý thuyết, sau đó kiểm tra lại (mục tiêu: từ 8/10)."; },
      onDone: function (r) { S.quiz = { last: r, best: Math.max(r, S.quiz ? S.quiz.best : 0), times: (S.quiz ? S.quiz.times || 0 : 0) + 1 }; save(); renderStatus(); },
      again: buildQuiz
    });
  }

  root.appendChild(statusList);
  root.appendChild(tabList);
  root.appendChild(panel);
  renderStatus();
  select(TABS.some(function (t) { return t.id === S.tab; }) ? S.tab : "cards", false);
})();
