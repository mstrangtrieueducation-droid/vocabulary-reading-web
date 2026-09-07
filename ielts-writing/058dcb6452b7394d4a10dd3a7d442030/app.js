/* Keep each lesson independent, including previously cached lesson HTML. */
(()=>{const clean=()=>{document.querySelectorAll('nav.course-nav,nav.writing-app-nav,nav.lesson-footer,nav.lesson-pagination,nav.lesson-neighbors,nav.navigation').forEach(node=>node.remove());document.querySelectorAll('header.brand>a').forEach(link=>{if(link.querySelector('img'))link.replaceWith(...link.childNodes);});};clean();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});})();
(() => {
  "use strict";

  const HOMEWORK_STORAGE_KEY = "ielts-listening-b04-homework-checklist";
  const ATTEMPT_STORAGE_KEY = "ielts-listening-b04-practice-attempt";
  const SECTION_COUNT = 4;
  const QUESTIONS_PER_SECTION = 10;
  const TOTAL_QUESTIONS = SECTION_COUNT * QUESTIONS_PER_SECTION;

  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const elements = {
    identityForm: byId("studentIdentity"),
    studentName: byId("studentName"),
    studentClass: byId("studentClass"),
    identityMessage: byId("identityMessage"),
    candidateName: byId("candidateName"),
    workspace: byId("listeningWorkspace"),
    sectionTabs: byId("sectionTabs"),
    audioPanels: byId("audioPanels"),
    activeAudioSection: byId("activeAudioSection"),
    activeQuestionSection: byId("activeQuestionSection"),
    activeQuestionRange: byId("activeQuestionRange"),
    questionContainer: byId("listeningQuestions"),
    palette: byId("questionPalette"),
    submitTest: byId("submitListening"),
    resetTest: byId("resetListening"),
    testMessage: byId("testMessage"),
    result: byId("listeningResult"),
    scoreValue: byId("scoreValue"),
    scoreSummary: byId("scoreSummary"),
    sectionScores: byId("sectionScores"),
    analysis: byId("listeningAnalysis")
  };

  const readJson = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The lesson remains usable if browser storage is unavailable.
    }
  };

  const initialAttempt = readJson(ATTEMPT_STORAGE_KEY, {});
  const state = {
    activeSection: Number(initialAttempt.activeSection) || 1,
    identity: {
      name: String(initialAttempt.identity?.name || ""),
      className: String(initialAttempt.identity?.className || "")
    },
    answers: initialAttempt.answers && typeof initialAttempt.answers === "object"
      ? { ...initialAttempt.answers }
      : {},
    data: null,
    submitHandler: null
  };

  const saveAttempt = () => {
    writeJson(ATTEMPT_STORAGE_KEY, {
      activeSection: state.activeSection,
      identity: state.identity,
      answers: state.answers
    });
  };

  const normalizeSection = (section, index) => ({
    id: Number(section?.id) || index + 1,
    title: String(section?.title || `Section ${index + 1}`),
    audioSrc: String(section?.audioSrc || ""),
    audioLabel: String(section?.audioLabel || ""),
    questions: Array.isArray(section?.questions) ? section.questions : []
  });

  const normalizeData = (data) => ({
    sections: Array.from({ length: SECTION_COUNT }, (_, index) => {
      const match = Array.isArray(data?.sections)
        ? data.sections.find((section) => Number(section?.id) === index + 1) || data.sections[index]
        : null;
      return normalizeSection(match, index);
    })
  });

  const getSection = (sectionNumber = state.activeSection) =>
    state.data?.sections?.find((section) => Number(section.id) === Number(sectionNumber));

  const configuredQuestions = () =>
    (state.data?.sections || []).flatMap((section) => section.questions || []);

  const rangeForSection = (sectionNumber) => {
    const first = (sectionNumber - 1) * QUESTIONS_PER_SECTION + 1;
    return { first, last: first + QUESTIONS_PER_SECTION - 1 };
  };

  const sectionForQuestion = (questionNumber) =>
    Math.min(SECTION_COUNT, Math.max(1, Math.ceil(Number(questionNumber) / QUESTIONS_PER_SECTION)));

  const isAnswered = (questionNumber) => {
    const value = state.answers[String(questionNumber)];
    return Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && String(value).trim() !== "";
  };

  const updateCandidate = () => {
    if (elements.candidateName) {
      elements.candidateName.textContent = state.identity.name || "Chưa nhập tên";
    }
  };

  const renderPalette = () => {
    if (!elements.palette) return;
    elements.palette.replaceChildren();

    for (let questionNumber = 1; questionNumber <= TOTAL_QUESTIONS; questionNumber += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(questionNumber);
      button.dataset.questionNumber = String(questionNumber);
      button.classList.toggle("in-current-section", sectionForQuestion(questionNumber) === state.activeSection);
      button.classList.toggle("answered", isAnswered(questionNumber));
      button.setAttribute("aria-label", `Đi đến câu ${questionNumber}`);
      button.addEventListener("click", () => {
        setActiveSection(sectionForQuestion(questionNumber));
        requestAnimationFrame(() => {
          document.querySelector(`[data-rendered-question="${questionNumber}"]`)?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        });
      });
      elements.palette.append(button);
    }
  };

  const createPlaceholderQuestions = (sectionNumber) => {
    const fragment = document.createDocumentFragment();
    const intro = document.createElement("div");
    intro.className = "question-placeholder-intro";
    intro.innerHTML = `<h4>Vùng câu hỏi Section ${sectionNumber}</h4><p>Bộ câu hỏi đang chờ được kết nối. Khi dữ liệu được nạp, câu hỏi và ô trả lời sẽ xuất hiện tại đúng vị trí này.</p>`;
    fragment.append(intro);

    const grid = document.createElement("div");
    grid.className = "placeholder-grid";
    const { first, last } = rangeForSection(sectionNumber);
    for (let number = first; number <= last; number += 1) {
      const item = document.createElement("div");
      item.className = "placeholder-question";
      item.innerHTML = `<b>${number}</b><span aria-hidden="true"></span>`;
      grid.append(item);
    }
    fragment.append(grid);
    return fragment;
  };

  const updateAnswer = (questionNumber, value) => {
    state.answers[String(questionNumber)] = value;
    saveAttempt();
    renderPalette();
  };

  const renderQuestion = (question, fallbackNumber) => {
    const number = Number(question?.number) || fallbackNumber;
    const card = document.createElement("article");
    card.className = "question-card";
    card.dataset.renderedQuestion = String(number);

    const head = document.createElement("div");
    head.className = "question-head";
    const badge = document.createElement("span");
    badge.className = "question-number";
    badge.textContent = String(number);
    const content = document.createElement("div");
    content.className = "question-content";
    const prompt = document.createElement("p");
    prompt.className = "question-prompt";
    prompt.textContent = String(question?.prompt || `Question ${number}`);
    content.append(prompt);

    if (question?.note) {
      const note = document.createElement("p");
      note.className = "question-note";
      note.textContent = String(question.note);
      content.append(note);
    }

    const type = String(question?.type || "text").toLowerCase();
    const savedValue = state.answers[String(number)] ?? "";

    if ((type === "choice" || type === "radio") && Array.isArray(question?.options)) {
      const choices = document.createElement("div");
      choices.className = "choice-list";
      question.options.forEach((option, optionIndex) => {
        const value = typeof option === "object" ? String(option.value ?? option.label ?? "") : String(option);
        const labelText = typeof option === "object" ? String(option.label ?? option.value ?? "") : String(option);
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `question-${number}`;
        input.value = value;
        input.checked = String(savedValue) === value;
        input.addEventListener("change", () => updateAnswer(number, value));
        const text = document.createElement("span");
        text.textContent = labelText || `Option ${optionIndex + 1}`;
        label.append(input, text);
        choices.append(label);
      });
      content.append(choices);
    } else {
      const input = document.createElement("input");
      input.className = "answer-input";
      input.type = "text";
      input.name = `question-${number}`;
      input.value = String(savedValue);
      input.placeholder = String(question?.placeholder || "Type your answer");
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", `Đáp án câu ${number}`);
      input.addEventListener("input", () => updateAnswer(number, input.value));
      content.append(input);
    }

    head.append(badge, content);
    card.append(head);
    return card;
  };

  const renderQuestions = () => {
    if (!elements.questionContainer) return;
    elements.questionContainer.replaceChildren();
    const section = getSection();

    if (!section || !section.questions.length) {
      elements.questionContainer.append(createPlaceholderQuestions(state.activeSection));
      return;
    }

    const { first } = rangeForSection(state.activeSection);
    section.questions.forEach((question, index) => {
      if (question?.groupIntro) {
        const instruction = document.createElement("section");
        instruction.className = "task-instruction";
        const instructionText = (question.groupIntro.instructions || [])
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join("");
        instruction.innerHTML = `<span>ĐỀ BÀI</span><h4>${escapeHtml(question.groupIntro.title)}</h4>${instructionText}`;
        elements.questionContainer.append(instruction);
      }
      elements.questionContainer.append(renderQuestion(question, first + index));
    });
  };

  const renderAudio = () => {
    document.querySelectorAll("[data-audio-section]").forEach((panel) => {
      const isActive = Number(panel.dataset.audioSection) === state.activeSection;
      panel.hidden = !isActive;
      panel.classList.toggle("active", isActive);
    });

    (state.data?.sections || []).forEach((section) => {
      const audio = document.querySelector(`[data-section-audio="${section.id}"]`);
      const status = document.querySelector(`[data-audio-status="${section.id}"]`);
      const panel = document.querySelector(`[data-audio-section="${section.id}"]`);
      if (!(audio instanceof HTMLAudioElement)) return;

      const currentSource = audio.getAttribute("src") || "";
      if (section.audioSrc && currentSource !== section.audioSrc) {
        audio.src = section.audioSrc;
        audio.load();
      } else if (!section.audioSrc && currentSource) {
        audio.removeAttribute("src");
        audio.load();
      }

      panel?.classList.toggle("is-connected", Boolean(section.audioSrc));
      if (status) {
        status.textContent = section.audioSrc
          ? section.audioLabel || `${section.title} · Audio đã sẵn sàng.`
          : `Audio Section ${section.id} đang chờ được kết nối.`;
      }
    });
  };

  function setActiveSection(sectionNumber) {
    const nextSection = Math.min(SECTION_COUNT, Math.max(1, Number(sectionNumber) || 1));
    state.activeSection = nextSection;

    document.querySelectorAll("[data-listening-section]").forEach((button) => {
      const isActive = Number(button.dataset.listeningSection) === nextSection;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    document.querySelectorAll("[data-section-audio]").forEach((audio) => {
      if (Number(audio.dataset.sectionAudio) !== nextSection) audio.pause();
    });

    const { first, last } = rangeForSection(nextSection);
    if (elements.activeAudioSection) elements.activeAudioSection.textContent = String(nextSection);
    if (elements.activeQuestionSection) elements.activeQuestionSection.textContent = String(nextSection);
    if (elements.activeQuestionRange) elements.activeQuestionRange.textContent = `${first}–${last}`;

    renderAudio();
    renderQuestions();
    renderPalette();
    saveAttempt();
  }

  const setListeningData = (data) => {
    state.data = normalizeData(data);
    renderAudio();
    renderQuestions();
    renderPalette();
    return window.B04ListeningUI;
  };

  const collectAnswers = () => ({ ...state.answers });

  const getIdentity = () => ({ ...state.identity });

  const validateIdentity = () => {
    const name = String(elements.studentName?.value || "").trim();
    const className = String(elements.studentClass?.value || "").trim();
    if (!name || !className) {
      if (elements.identityMessage) elements.identityMessage.textContent = "Em cần nhập đủ họ tên và chọn lớp trước khi làm bài.";
      return false;
    }

    state.identity = { name, className };
    if (elements.identityMessage) elements.identityMessage.textContent = "Thông tin đã được lưu trên thiết bị này.";
    updateCandidate();
    saveAttempt();
    return true;
  };

  const replaySection = (sectionNumber) => {
    setActiveSection(sectionNumber);
    document.getElementById("practice")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const audio = document.querySelector(`[data-section-audio="${sectionNumber}"]`);
    if (audio instanceof HTMLAudioElement && audio.getAttribute("src")) {
      window.setTimeout(() => audio.play().catch(() => {}), 450);
    }
  };

  const renderAnalysis = (result = {}) => {
    const score = Number(result.score) || 0;
    const total = Number(result.total) || TOTAL_QUESTIONS;
    const sections = Array.isArray(result.sections) ? result.sections : [];

    if (elements.result) elements.result.hidden = false;
    if (elements.scoreValue) elements.scoreValue.textContent = String(score);
    if (elements.scoreSummary) {
      elements.scoreSummary.textContent = String(
        result.summary || `Em đúng ${score}/${total} câu. Hãy nghe lại từng section còn sai.`
      );
    }

    if (elements.sectionScores) {
      elements.sectionScores.replaceChildren();
      for (let sectionNumber = 1; sectionNumber <= SECTION_COUNT; sectionNumber += 1) {
        const sectionResult = sections.find((section) => Number(section.number ?? section.id) === sectionNumber) || {};
        const pill = document.createElement("div");
        pill.className = "score-pill";
        const label = document.createElement("span");
        label.textContent = `SECTION ${sectionNumber}`;
        const value = document.createElement("b");
        value.textContent = `${Number(sectionResult.score) || 0}/${Number(sectionResult.total) || QUESTIONS_PER_SECTION}`;
        pill.append(label, value);
        elements.sectionScores.append(pill);
      }
    }

    if (elements.analysis) {
      elements.analysis.replaceChildren();
      const grid = document.createElement("div");
      grid.className = "analysis-grid";

      sections.forEach((sectionResult, index) => {
        const sectionNumber = Number(sectionResult.number ?? sectionResult.id) || index + 1;
        const card = document.createElement("article");
        card.className = "analysis-card";
        const header = document.createElement("header");
        header.className = "analysis-card-header";
        const heading = document.createElement("h3");
        heading.textContent = `Section ${sectionNumber}`;
        const sectionSummary = document.createElement("span");
        sectionSummary.textContent = String(
          sectionResult.summary || `${Number(sectionResult.score) || 0}/${Number(sectionResult.total) || QUESTIONS_PER_SECTION} câu đúng`
        );
        const replay = document.createElement("button");
        replay.className = "replay-button";
        replay.type = "button";
        replay.textContent = `▶ Nghe lại Section ${sectionNumber}`;
        replay.addEventListener("click", () => replaySection(sectionNumber));
        header.append(heading, sectionSummary, replay);
        card.append(header);

        const items = Array.isArray(sectionResult.items) ? sectionResult.items : [];
        items.forEach((item) => {
          const row = document.createElement("div");
          row.className = "analysis-question";
          const rowTitle = document.createElement("h4");
          rowTitle.textContent = `Câu ${item.number}${item.correct === true ? " · Đúng" : item.correct === false ? " · Cần xem lại" : ""}`;
          const answers = document.createElement("div");
          answers.className = "analysis-answer";
          const userAnswer = document.createElement("span");
          userAnswer.textContent = `Em trả lời: ${item.userAnswer ?? "—"}`;
          const correctAnswer = document.createElement("span");
          correctAnswer.textContent = `Đáp án: ${item.correctAnswer ?? "—"}`;
          answers.append(userAnswer, correctAnswer);
          row.append(rowTitle, answers);
          if (item.explanation) {
            const explanation = document.createElement("p");
            explanation.textContent = String(item.explanation);
            row.append(explanation);
          }
          card.append(row);
        });

        grid.append(card);
      });

      if (!sections.length) {
        const empty = document.createElement("div");
        empty.className = "analysis-empty";
        empty.innerHTML = "<span class=\"analysis-symbol\">◎</span><div><h3>Đã nhận kết quả</h3><p>Chi tiết phân tích theo section chưa được cung cấp.</p></div>";
        elements.analysis.append(empty);
      } else {
        elements.analysis.append(grid);
      }
    }

    document.getElementById("review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setSubmitHandler = (handler) => {
    state.submitHandler = typeof handler === "function" ? handler : null;
    return window.B04ListeningUI;
  };

  const clearAttempt = () => {
    state.answers = {};
    state.activeSection = 1;
    try {
      localStorage.removeItem(ATTEMPT_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
    if (elements.result) elements.result.hidden = true;
    setActiveSection(1);
    if (elements.testMessage) elements.testMessage.textContent = "Đã xóa bài làm được lưu trên thiết bị.";
  };

  elements.identityForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateIdentity()) return;
    elements.workspace?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.sectionTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-listening-section]");
    if (button) setActiveSection(button.dataset.listeningSection);
  });

  elements.submitTest?.addEventListener("click", async () => {
    if (!validateIdentity()) {
      elements.identityForm?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const questions = configuredQuestions();
    if (questions.length < TOTAL_QUESTIONS) {
      if (elements.testMessage) elements.testMessage.textContent = "Bộ 40 câu hỏi và luồng chấm điểm đang chờ được kết nối.";
      return;
    }

    const unanswered = questions
      .map((question) => Number(question.number))
      .filter((number) => !isAnswered(number));
    if (unanswered.length) {
      if (elements.testMessage) elements.testMessage.textContent = `Em còn ${unanswered.length} câu chưa trả lời. Hãy hoàn thành đủ trước khi nộp.`;
      setActiveSection(sectionForQuestion(unanswered[0]));
      return;
    }

    const payload = {
      identity: getIdentity(),
      answers: collectAnswers(),
      total: TOTAL_QUESTIONS,
      submittedAt: new Date().toISOString()
    };

    elements.submitTest.disabled = true;
    if (elements.testMessage) elements.testMessage.textContent = "Đang chấm bài và chuẩn bị phần phân tích…";
    try {
      if (state.submitHandler) {
        const result = await state.submitHandler(payload);
        if (result) renderAnalysis(result);
      } else {
        window.dispatchEvent(new CustomEvent("b04:listening-submit", { detail: payload }));
        if (elements.testMessage) elements.testMessage.textContent = "Bài đã sẵn sàng; bộ chấm điểm đang chờ được kết nối.";
      }
    } catch {
      if (elements.testMessage) elements.testMessage.textContent = "Chưa thể chấm bài lúc này. Em giữ nguyên trang và thử lại.";
    } finally {
      elements.submitTest.disabled = false;
    }
  });

  elements.resetTest?.addEventListener("click", () => {
    if (window.confirm("Xóa toàn bộ đáp án Listening Buổi 04 đã lưu trên thiết bị này?")) clearAttempt();
  });

  if (elements.studentName) elements.studentName.value = state.identity.name;
  if (elements.studentClass) elements.studentClass.value = state.identity.className;
  elements.studentName?.addEventListener("input", () => {
    if (elements.identityMessage) elements.identityMessage.textContent = "";
  });
  elements.studentClass?.addEventListener("change", () => {
    if (elements.identityMessage) elements.identityMessage.textContent = "";
  });

  const checklist = [...document.querySelectorAll("[data-homework-check]")];
  const homeworkProgress = byId("homeworkProgress");
  const progressLabel = byId("progressLabel");
  const submitHomework = byId("submitHomework");
  const resetChecklist = byId("resetChecklist");
  const submissionMessage = byId("submissionMessage");
  const savedChecklist = readJson(HOMEWORK_STORAGE_KEY, {});

  const updateHomeworkProgress = () => {
    const completed = checklist.filter((input) => input.checked).length;
    const total = checklist.length;
    const ready = total > 0 && completed === total;
    const stateToSave = Object.fromEntries(
      checklist.map((input) => [input.dataset.homeworkCheck, input.checked])
    );
    writeJson(HOMEWORK_STORAGE_KEY, stateToSave);

    if (homeworkProgress) homeworkProgress.style.width = `${total ? (completed / total) * 100 : 0}%`;
    if (progressLabel) {
      progressLabel.textContent = ready
        ? `${completed}/${total} yêu cầu đã sẵn sàng · Có thể nộp bài`
        : `${completed}/${total} yêu cầu đã sẵn sàng`;
    }
    submitHomework?.classList.toggle("is-incomplete", !ready);
    if (ready && submissionMessage) submissionMessage.textContent = "Đã kiểm tra đủ. Em có thể mở cổng nộp ảnh vở.";
  };

  checklist.forEach((input) => {
    input.checked = Boolean(savedChecklist[input.dataset.homeworkCheck]);
    input.addEventListener("change", () => {
      if (submissionMessage) submissionMessage.textContent = "";
      updateHomeworkProgress();
    });
  });

  resetChecklist?.addEventListener("click", () => {
    checklist.forEach((input) => { input.checked = false; });
    if (submissionMessage) submissionMessage.textContent = "Đã bỏ toàn bộ dấu kiểm.";
    updateHomeworkProgress();
  });

  submitHomework?.addEventListener("click", (event) => {
    const ready = checklist.length > 0 && checklist.every((input) => input.checked);
    const formUrl = submitHomework.getAttribute("href") || "";
    if (!ready) {
      event.preventDefault();
      if (submissionMessage) submissionMessage.textContent = "Em cần đánh dấu đủ cả 4 yêu cầu trước khi mở cổng nộp bài.";
      return;
    }
    if (!formUrl || formUrl.includes("__B04_HOMEWORK_FORM_URL__")) {
      event.preventDefault();
      if (submissionMessage) submissionMessage.textContent = "Cổng nộp ảnh vở Buổi 04 đang được giáo viên kết nối.";
    }
  });

  const navigationLinks = [...document.querySelectorAll("[data-nav-link]")];
  const sections = [...document.querySelectorAll("[data-section]")];
  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navigationLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    }, { rootMargin: "-28% 0px -55% 0px", threshold: [0.02, 0.25, 0.55] });
    sections.forEach((section) => observer.observe(section));
  }

  window.B04ListeningUI = Object.freeze({
    setData: setListeningData,
    setSubmitHandler,
    setActiveSection,
    renderQuestions,
    renderAnalysis,
    replaySection,
    collectAnswers,
    getIdentity,
    clearAttempt,
    getState: () => ({
      activeSection: state.activeSection,
      identity: getIdentity(),
      answers: collectAnswers(),
      configuredQuestionCount: configuredQuestions().length
    })
  });

  updateCandidate();
  updateHomeworkProgress();
  setListeningData(window.B04_LISTENING_DATA || { sections: [] });
  setActiveSection(state.activeSection);
})();

