const SHARED_UPLOADER_VERSION = "20260818-3";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const DISPLAY_PARTS_OF_SPEECH = new Set([
  "v",
  "n",
  "a",
  "adj",
  "adv",
  "pre",
  "prep",
  "phr v",
  "phrv",
  "verb",
  "noun",
  "adjective",
  "adverb",
  "conj",
  "conjunction",
]);

function stripPartOfSpeechLabels(value) {
  return String(value ?? "")
    .replace(/\(([^)]+)\)/g, (label, contents) => {
      const normalizedContents = contents
        .toLowerCase()
        .replaceAll(".", "")
        .replace(/\s+/g, " ")
        .trim();
      if (/^(?:phr v|phrv|phrasal verb)$/u.test(normalizedContents)) {
        return "";
      }
      const tokens = contents
        .toLowerCase()
        .replaceAll(".", "")
        .split(/[,/+\s]+/)
        .filter(Boolean);
      return tokens.length > 0 &&
        tokens.every((token) => DISPLAY_PARTS_OF_SPEECH.has(token))
        ? ""
        : label;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function formatDisplayTerm(value) {
  return stripPartOfSpeechLabels(value)
    .replace(/\s*=\s*/g, " ~ ")
    .replace(/\s*→\s*/g, " · ")
    .replace(/\s*·\s*(~|#|><)\s*/g, " $1 ")
    .replace(/\s*(~|#|><)\s*·\s*/g, " $1 ")
    .replace(/(?:\s*·\s*){2,}/g, " · ")
    .replace(/(?:\s*~\s*){2,}/g, " ~ ")
    .replace(/\s+/g, " ")
    .trim();
}

const TYPE_LABEL_MAP = new Map([
  ["v", "verb"],
  ["n", "noun"],
  ["a", "adjective"],
  ["adj", "adjective"],
  ["adv", "adverb"],
  ["pre", "preposition"],
  ["prep", "preposition"],
  ["conj", "conjunction"],
  ["conjunction", "conjunction"],
]);

function typeLabelsFor(item) {
  const labels = [];
  const source = String(item.sourceTerm || item.term || "");
  for (const [, contents] of source.matchAll(/\(([^)]+)\)/g)) {
    const normalized = contents.toLowerCase().replaceAll(".", "");
    if (/^(?:phr\s+v|phrv|phrasal\s+verb)$/u.test(normalized.trim())) {
      labels.push("phrasal verb");
      continue;
    }
    const tokens = normalized.split(/[,/+\s]+/).filter(Boolean);
    const mapped = tokens.map((token) => TYPE_LABEL_MAP.get(token));
    // Parentheses are often examples, e.g. "take up (a sport/hobby)".
    // Only treat the whole parenthesis as a POS label when every token is POS.
    if (mapped.length && mapped.every(Boolean)) labels.push(...mapped);
  }
  if (labels.length) return labels;
  return String(item.type || "word / phrase")
    .split(/\s*·\s*/)
    .filter((label) => label.toLowerCase() !== "word family")
    .filter(Boolean);
}

function formatTypeLine(item) {
  return typeLabelsFor(item).join(" · ") || "word / phrase";
}

function formatFriendlyNote(value) {
  return stripPartOfSpeechLabels(value)
    .replace(
      /Học theo nhóm từ\/cụm và phân biệt đúng từ loại\.?/gi,
      "Học các từ cùng gốc và chọn đúng dạng từ theo vị trí trong câu.",
    )
    .replace(
      /Học cả word family và xác định đúng loại từ cần dùng trong câu\.?/gi,
      "Học các từ cùng gốc và chọn đúng dạng từ theo vị trí trong câu.",
    )
    .replace(
      /Học các từ cùng gốc và chọn đúng dạng(?: từ)? theo vị trí trong câu\.?/gi,
      "Học các từ cùng gốc và chọn đúng dạng từ theo vị trí trong câu.",
    )
    .replace(
      /Giữ đúng mẫu từ đi kèm/gi,
      "Dùng đúng cấu trúc kết hợp của từ",
    )
    .replace(/\bMẫu dùng:/gi, "Cách kết hợp:")
    .replace(/\bword family\b/gi, "nhóm từ cùng gốc")
    .replace(/\s*=\s*/g, ": ")
    .replace(/\s*→\s*/g, " · ")
    .replace(/(?:\s*·\s*){2,}/g, " · ")
    .replace(/^\s*·\s*|\s*·\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isOneExpressionWithSeveralTypes(item) {
  const withoutLabels = stripPartOfSpeechLabels(item.sourceTerm || item.term)
    .replace(/[·~#><]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const labels = [...new Set(typeLabelsFor(item))];
  return (
    withoutLabels.split(/\s+/).filter(Boolean).length <= 3 &&
    labels.length >= 2 &&
    !/[·~#><]/.test(item.sourceTerm || item.term)
  );
}

function normalizeNoteBullet(value) {
  const note = String(value ?? "").trim();
  if (!note) return "";
  // Notes are rendered as list items, so a final full stop is visual noise and
  // creates mixed punctuation when source notes use semicolons. Keep genuine
  // questions, exclamations and ellipses unchanged.
  return note.replace(/(?<!\.)\.(?=[”’"')\]]*$)/u, "");
}

const GENERIC_NOTE_BULLETS = new Set([
  "Dùng đúng cấu trúc kết hợp của từ",
  "sb: somebody, st: something",
  "Các từ gần nghĩa trong nét nghĩa này nhưng có thể khác cấu trúc hoặc sắc thái",
  "chú ý mẫu đi kèm",
  "Hai từ có hình thức hoặc chủ đề gần nhau nhưng khác nghĩa",
  "đối chiếu nghĩa và ví dụ trước khi dùng",
  "Dấu >< chỉ cặp từ trái nghĩa",
  "học cả hai chiều để nhận biết trong văn cảnh",
  "Các từ/cụm có dấu ~ gần nghĩa trong ngữ cảnh phù hợp",
  "Chú ý cặp đối lập hoặc điểm khác nhau được đánh dấu trong danh sách",
]);

function normalizedTermEcho(value) {
  return stripPartOfSpeechLabels(value)
    .toLowerCase()
    .replace(/\bsb\b/g, "somebody")
    .replace(/\bsth?\b/g, "something")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRepeatedTermEcho(note, item) {
  if (/[^\x00-\x7f]/.test(note)) return false;
  const normalizedNote = normalizedTermEcho(note);
  if (!normalizedNote) return false;
  return String(item.sourceTerm || item.term)
    .split(/\s*(?:·|~|#|><)\s*/)
    .some((part) => normalizedTermEcho(part) === normalizedNote);
}

function noteItemsFor(item) {
  const items = [];
  const labels = [...new Set(typeLabelsFor(item))];
  if (isOneExpressionWithSeveralTypes(item)) {
    const vietnameseLabels = labels.map(
      (label) =>
        ({
          verb: "động từ",
          noun: "danh từ",
          adjective: "tính từ",
          adverb: "trạng từ",
          preposition: "giới từ",
        })[label] || label,
    );
    const last = vietnameseLabels.pop();
    items.push(
      `Từ này vừa là ${vietnameseLabels.join(", ")}, vừa là ${last}.`,
    );
  }
  const note = formatFriendlyNote(item.note);
  if (note) {
    items.push(
      ...note
        .split(/;\s+|(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter(Boolean),
    );
  }
  return [
    ...new Set(
      items
        .map(normalizeNoteBullet)
        .filter(Boolean)
        .filter((note) => !GENERIC_NOTE_BULLETS.has(note))
        .filter((note) => !note.startsWith("Cách kết hợp:"))
        .filter(
          (note) =>
            !note.startsWith("Dùng đúng cấu trúc kết hợp của từ:"),
        )
        .filter((note) => !isRepeatedTermEcho(note, item)),
    ),
  ];
}

function renderNoteBlock(item) {
  const notes = noteItemsFor(item);
  if (!notes.length) return "";
  return `<div class="example-block">
    <p class="field-label">Cách dùng / lưu ý</p>
    <ul class="note-list">
      ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
    </ul>
  </div>`;
}

function getUnitNumber() {
  const declared = Number(document.documentElement.dataset.unit);
  if (declared) return declared;
  const match = window.location.pathname.match(/vf2-u(\d{2})/i);
  return Number(match?.[1] || 1);
}

function preferredAmericanVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const american = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("en-us"),
  );
  const preferredNames = [
    "aria",
    "jenny",
    "samantha",
    "zira",
    "ava",
    "allison",
    "female",
    "google us english",
  ];
  return (
    preferredNames
      .map((name) =>
        american.find((voice) => voice.name.toLowerCase().includes(name)),
      )
      .find(Boolean) ||
    american.find(
      (voice) =>
        !/(david|mark|guy|male|richard|christopher)/i.test(voice.name),
    ) ||
    american[0] ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en"))
  );
}

function speak(text, rate = 0.86) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    window.alert(
      "Thiết bị này chưa hỗ trợ giọng đọc. Hãy mở trang bằng Chrome hoặc Edge.",
    );
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    String(text)
      .replaceAll("·", ",")
      .replaceAll("~", ",")
      .replaceAll("><", ","),
  );
  const voice = preferredAmericanVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = rate;
  utterance.pitch = 1.08;
  window.speechSynthesis.speak(utterance);
}

function makeSubmitUrl(unit) {
  const entryId = document.documentElement.dataset.formEntryId;
  const url = new URL("https://docs.google.com/forms/d/e/1FAIpQLSfwQ-rVxYwumoYBkndLUsrakiFPv9LGm47d7pjRfAuoFZ9Rgg/viewform");
  url.searchParams.set("usp", "pp_url");
  if (entryId && entryId !== "PENDING") url.searchParams.set(`entry.${entryId}`, unit.code);
  return url.href;
}

function shouldUseEmbeddedPages() {
  const params = new URLSearchParams(window.location.search);
  const mobileDevice =
    window.matchMedia("(max-width: 700px)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return (
    params.has("google-sites") &&
    (mobileDevice || params.has("mobile-preview"))
  );
}

function pagerMarkup({ currentPage, pageCount, firstLabel, lastLabel }) {
  return `
    <nav class="mobile-entry-pager" aria-label="Chuyển nhóm nội dung">
      <button type="button" data-page-action="previous" ${currentPage === 0 ? "disabled" : ""}>
        Trước
      </button>
      <p>
        <strong>Mục ${escapeHtml(String(firstLabel))}–${escapeHtml(String(lastLabel))}</strong>
        <span>Trang ${currentPage + 1}/${pageCount}</span>
      </p>
      <button type="button" data-page-action="next" ${currentPage === pageCount - 1 ? "disabled" : ""}>
        Tiếp
      </button>
    </nav>
  `;
}

function renderEntries(unit) {
  const list = document.querySelector("#entry-list");
  const useEmbeddedPages = shouldUseEmbeddedPages();
  if (useEmbeddedPages) {
    document.documentElement.classList.add("embedded-pages");
  }
  const pageSize = 3;
  let currentPage = 0;

  const renderPage = () => {
    const firstIndex = useEmbeddedPages ? currentPage * pageSize : 0;
    const visibleEntries = useEmbeddedPages
      ? unit.entries.slice(firstIndex, firstIndex + pageSize)
      : unit.entries;
    const pageCount = Math.ceil(unit.entries.length / pageSize);

    list.innerHTML = visibleEntries
    .map(
      (item, visibleIndex) => {
        const index = firstIndex + visibleIndex;
        return `
        <article class="entry">
          <div class="entry-number">${String(item.number).padStart(2, "0")}</div>
          <div class="entry-word">
            <p class="word-type">${escapeHtml(formatTypeLine(item))}</p>
            <h3>${escapeHtml(formatDisplayTerm(item.term))}</h3>
            <div class="pronunciation-row">
              <span class="ipa">${escapeHtml(item.ipa)}</span>
              <button
                class="listen-button speak-term"
                type="button"
                data-index="${index}"
              >▶ Nghe phát âm chuẩn</button>
            </div>
          </div>
          <div class="entry-reference">
            <div>
              <p class="field-label">Nghĩa tiếng Việt · định hướng</p>
              <p class="meaning">${escapeHtml(item.meaning)}</p>
            </div>
            <div>
              <p class="field-label">Giải nghĩa tiếng Anh</p>
              <p class="definition">${escapeHtml(item.definition)}</p>
            </div>
            ${renderNoteBlock(item)}
            <div class="example-block">
              <div class="example-heading">
                <p class="field-label">Ví dụ học thuật trong văn cảnh</p>
                <button
                  class="listen-button speak-example"
                  type="button"
                  data-index="${index}"
                >▶ Nghe câu</button>
              </div>
              <p class="example">${escapeHtml(item.example)}</p>
            </div>
          </div>
        </article>
      `;
      },
    )
    .join("");

    if (useEmbeddedPages) {
      list.insertAdjacentHTML(
        "afterend",
        pagerMarkup({
          currentPage,
          pageCount,
          firstLabel: visibleEntries[0].number,
          lastLabel: visibleEntries.at(-1).number,
        }),
      );
    }
  };

  renderPage();

  list.addEventListener("click", (event) => {
    const termButton = event.target.closest(".speak-term");
    const exampleButton = event.target.closest(".speak-example");
    if (termButton) {
      speak(unit.entries[Number(termButton.dataset.index)].spoken, 0.84);
    }
    if (exampleButton) {
      speak(unit.entries[Number(exampleButton.dataset.index)].example, 0.9);
    }
  });

  if (useEmbeddedPages) {
    list.parentElement.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page-action]");
      if (!button) return;
      const pageCount = Math.ceil(unit.entries.length / pageSize);
      currentPage += button.dataset.pageAction === "next" ? 1 : -1;
      currentPage = Math.max(0, Math.min(pageCount - 1, currentPage));
      list.parentElement.querySelector(".mobile-entry-pager")?.remove();
      renderPage();
      document.querySelector("#vocabulary-title")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }
}

const PRONUNCIATION_CATEGORY_LABELS = {
  "common-error": "Dễ đọc sai",
  "silent-letter": "Âm câm",
  "final-sound": "Âm cuối",
  linking: "Nối âm",
  "word-stress": "Trọng âm",
};

function renderPronunciation(unit) {
  const entriesByNumber = new Map(
    unit.entries.map((entry) => [Number(entry.number), entry]),
  );
  const studyItems = (unit.pronunciationFocus || [])
    .map((focus) => ({
      focus,
      entry: entriesByNumber.get(Number(focus.entryNumber)),
    }))
    .filter((item) => item.entry);
  const list = document.querySelector("#pronunciation-list");
  const useEmbeddedPages = shouldUseEmbeddedPages();
  const pageSize = 3;
  let currentPage = 0;

  if (!studyItems.length) {
    list.innerHTML =
      '<p class="pronunciation-empty">Chưa có lưu ý phát âm riêng cho Unit này.</p>';
    return;
  }

  const renderPage = () => {
    const firstIndex = useEmbeddedPages ? currentPage * pageSize : 0;
    const visibleItems = useEmbeddedPages
      ? studyItems.slice(firstIndex, firstIndex + pageSize)
      : studyItems;
    const pageCount = Math.ceil(studyItems.length / pageSize);

    list.innerHTML = visibleItems
    .map(
      ({ entry, focus }, visibleIndex) => {
        const index = firstIndex + visibleIndex;
        return `
        <div class="pronunciation-item">
          <p class="entry-number">${String(entry.number).padStart(2, "0")}</p>
          <div class="pronunciation-copy">
            <div class="pronunciation-tags">
              ${[
                ...new Set(
                  focus.points.map(
                    (point) =>
                      PRONUNCIATION_CATEGORY_LABELS[point.category] ||
                      point.category,
                  ),
                ),
              ]
                .map(
                  (label) =>
                    `<span class="pronunciation-tag">${escapeHtml(label)}</span>`,
                )
                .join("")}
            </div>
            <strong>${escapeHtml(formatDisplayTerm(entry.term))}</strong><br />
            <span class="ipa">${escapeHtml(entry.ipa)}</span>
            <ul class="pronunciation-notes">
              ${focus.points
                .map(
                  (point) => `
                    <li>
                      <strong>${escapeHtml(
                        PRONUNCIATION_CATEGORY_LABELS[point.category] ||
                          point.category,
                      )}</strong>
                      <span>${escapeHtml(point.note)}</span>
                    </li>
                  `,
                )
                .join("")}
            </ul>
          </div>
          <button
            class="listen-button pronunciation-play"
            type="button"
            data-index="${index}"
          >▶ Nghe phát âm chuẩn</button>
        </div>
      `;
      },
    )
    .join("");

    if (useEmbeddedPages && pageCount > 1) {
      list.insertAdjacentHTML(
        "afterend",
        pagerMarkup({
          currentPage,
          pageCount,
          firstLabel: visibleItems[0].entry.number,
          lastLabel: visibleItems.at(-1).entry.number,
        }),
      );
    }
  };

  renderPage();
  list.addEventListener("click", (event) => {
    const button = event.target.closest(".pronunciation-play");
    if (!button) return;
    speak(studyItems[Number(button.dataset.index)].entry.spoken, 0.8);
  });

  if (useEmbeddedPages) {
    list.parentElement.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page-action]");
      if (!button) return;
      const pageCount = Math.ceil(studyItems.length / pageSize);
      currentPage += button.dataset.pageAction === "next" ? 1 : -1;
      currentPage = Math.max(0, Math.min(pageCount - 1, currentPage));
      list.parentElement.querySelector(".mobile-entry-pager")?.remove();
      renderPage();
      document.querySelector("#panel-pronunciation h2")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }
}

function setActiveTab(tabId) {
  document.querySelectorAll("[role=tab]").forEach((tab) => {
    const active = tab.dataset.tab === tabId;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll("[role=tabpanel]").forEach((panel) => {
    panel.hidden = panel.id !== `panel-${tabId}`;
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function bindTabs() {
  document.querySelectorAll("[role=tab]").forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });
}

function fitSingleLineTitle(element) {
  if (!element) return;
  const fit = () => {
    element.style.fontSize = "";
    element.style.whiteSpace = "nowrap";
    const available = element.parentElement?.clientWidth || element.clientWidth;
    let size = Number.parseFloat(getComputedStyle(element).fontSize);
    const minimum = window.innerWidth <= 620 ? 14 : 24;
    while (element.scrollWidth > available && size > minimum) {
      size -= 1;
      element.style.fontSize = `${size}px`;
    }
  };
  requestAnimationFrame(fit);
  window.addEventListener("resize", fit, { passive: true });
}

function hydrate(unit) {
  document.title = "Ms. Trang Trieu Education";
  document.querySelector("#unit-code").textContent =
    `VOCABULARY FOUNDATION 2 · ${unit.code}`;
  document.querySelector("#unit-title").textContent =
    `Unit ${unit.unit}: ${unit.title}`;
  fitSingleLineTitle(document.querySelector("#unit-title"));
  document.querySelector("#unit-summary").textContent =
    `${unit.entries.length} mục từ học thuật B2: học nghĩa, cách dùng và phát âm chuẩn.`;
  document.querySelector("#vocabulary-title").textContent =
    `${unit.entries.length} mục từ vựng cần ghi sổ`;
  document.querySelector("#range-chip").textContent =
    `Mục ${String(unit.startNumber).padStart(2, "0")}–${String(
      unit.endNumber,
    ).padStart(2, "0")}`;
  document.querySelector("#usage-range").textContent =
    `${String(unit.startNumber).padStart(2, "0")}–${String(
      unit.endNumber,
    ).padStart(2, "0")}`;
  document.querySelectorAll(".unit-label").forEach((node) => {
    node.textContent = `Unit ${unit.unit}`;
  });
  document.querySelectorAll(".unit-code-label").forEach((node) => {
    node.textContent = unit.code;
  });
  document.querySelectorAll(".form-link").forEach((link) => {
    link.href = makeSubmitUrl(unit);
  });

  renderEntries(unit);
  renderPronunciation(unit);
  bindTabs();
}

const unitNumber = getUnitNumber();
const unit = window.VF2_UNITS?.[unitNumber];
if (!unit) {
  document.body.innerHTML =
    '<main class="section"><h1>Không tìm thấy Unit.</h1></main>';
} else {
  hydrate(unit);
}
