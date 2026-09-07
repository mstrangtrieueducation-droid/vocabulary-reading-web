(() => {
  "use strict";

  const TOTAL_QUESTIONS = 40;
  const ui = window.B04ListeningUI;
  const scoreConfig = window.LISTENING_SCORE_CONFIG || {};

  if (!ui) {
    console.error("B04ListeningUI is unavailable.");
    return;
  }

  let sourceQuestions = [];
  let analysisByNumber = new Map();

  const byId = (id) => document.getElementById(id);

  const normalizeText = (value) => String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");

  const escapeForDisplay = (value) => String(value ?? "").trim() || "—";

  const optionList = (options) => Object.entries(options || {}).map(([value, label]) => ({
    value,
    label: `${value}. ${label}`
  }));

  const convertQuestion = (question, group, index) => {
    const sourceOptions = question.options || group.sharedOptions;
    const isChoice = question.type === "multiple_choice" || question.type === "matching";
    return {
      number: Number(question.number),
      type: isChoice ? "choice" : "text",
      prompt: String(question.prompt || `Question ${question.number}`),
      note: "",
      groupIntro: index === 0 ? {
        title: String(group.presentation?.heading || `Questions ${(group.questionRange || []).join("–")}`),
        instructions: Array.isArray(group.instructions) ? group.instructions : []
      } : null,
      options: isChoice ? optionList(sourceOptions) : undefined,
      correctOption: question.correctOption,
      canonicalAnswer: question.canonicalAnswer,
      acceptedAnswers: Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : []
    };
  };

  const convertData = (questionData) => ({
    sections: (questionData.sections || []).map((section) => ({
      id: Number(section.number),
      title: String(section.title || `Section ${section.number}`),
      audioSrc: `assets/audio/section-${section.number}.mp3`,
      audioLabel: `Section ${section.number} · Audio đã sẵn sàng · Có thể nghe lại không giới hạn.`,
      questions: (section.groups || []).flatMap((group) =>
        (group.questions || []).map((question, index) => convertQuestion(question, group, index))
      )
    }))
  });

  const isCorrect = (question, userAnswer) => {
    const accepted = question.correctOption
      ? [question.correctOption]
      : question.acceptedAnswers;
    const normalizedUserAnswer = normalizeText(userAnswer);
    return accepted.some((answer) => normalizeText(answer) === normalizedUserAnswer);
  };

  const explanationFor = (analysis) => {
    if (!analysis) return "Đối chiếu lại audio và xác định đúng tín hiệu dẫn đến đáp án.";
    const parts = [];
    if (analysis.reasonVi) parts.push(`Vì sao: ${analysis.reasonVi}`);
    if (analysis.supportQuote) parts.push(`Bằng chứng nghe: “${analysis.supportQuote}”.`);
    if (analysis.trapVi) parts.push(`Bẫy cần tránh: ${analysis.trapVi}`);
    return parts.join(" ");
  };

  const gradeAttempt = (payload) => {
    let score = 0;
    const sectionResults = [1, 2, 3, 4].map((number) => ({
      number,
      score: 0,
      total: 10,
      items: []
    }));

    sourceQuestions.forEach((question) => {
      const number = Number(question.number);
      const sectionNumber = Math.ceil(number / 10);
      const userAnswer = payload.answers?.[String(number)] ?? "";
      const correct = isCorrect(question, userAnswer);
      const analysis = analysisByNumber.get(number);
      const correctAnswer = analysis?.answer || question.canonicalAnswer || question.correctOption || "—";

      if (correct) {
        score += 1;
        sectionResults[sectionNumber - 1].score += 1;
      }

      sectionResults[sectionNumber - 1].items.push({
        number,
        correct,
        userAnswer: escapeForDisplay(userAnswer),
        correctAnswer: escapeForDisplay(correctAnswer),
        explanation: explanationFor(analysis)
      });
    });

    sectionResults.forEach((section) => {
      section.summary = `${section.score}/${section.total} câu đúng · sai ${section.total - section.score} câu`;
    });

    return {
      score,
      total: TOTAL_QUESTIONS,
      wrong: TOTAL_QUESTIONS - score,
      percent: Math.round((score / TOTAL_QUESTIONS) * 100),
      summary: `Em đúng ${score}/${TOTAL_QUESTIONS} câu và sai ${TOTAL_QUESTIONS - score} câu. Mở từng Section để nghe lại, đọc bằng chứng và xác định đúng nguyên nhân.`,
      sections: sectionResults
    };
  };

  const submitScore = async (identity, result) => {
    const entries = scoreConfig.entries || {};
    if (!scoreConfig.formResponseUrl || !entries.name) {
      throw new Error("Score form is not configured.");
    }

    const body = new URLSearchParams();
    body.set(entries.name, identity.name);
    body.set(entries.className, identity.className);
    body.set(entries.assignmentCode, scoreConfig.assignmentCode || "IELTS-LISTENING-B04");
    body.set(entries.score, String(result.score));
    body.set(entries.total, String(result.total));
    body.set(entries.wrong, String(result.wrong));
    body.set(entries.percent, String(result.percent));

    await fetch(scoreConfig.formResponseUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body
    });
  };

  const loadJson = async (path) => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
    return response.json();
  };

  const initialize = async () => {
    const message = byId("testMessage");
    try {
      const [questionData, analysisData] = await Promise.all([
        loadJson("data/questions.json"),
        loadJson("data/analysis.json")
      ]);

      const listeningData = convertData(questionData);
      sourceQuestions = listeningData.sections.flatMap((section) => section.questions);
      analysisByNumber = new Map(
        (analysisData.answers || []).map((item) => [Number(item.number), item])
      );

      if (sourceQuestions.length !== TOTAL_QUESTIONS || analysisByNumber.size !== TOTAL_QUESTIONS) {
        throw new Error("Listening data must contain exactly 40 questions and 40 analyses.");
      }

      ui.setData(listeningData).setSubmitHandler(async (payload) => {
        const result = gradeAttempt(payload);
        try {
          await submitScore(payload.identity, result);
          if (message) message.textContent = "Đã chấm bài và ghi kết quả vào hệ thống của giáo viên.";
        } catch (error) {
          console.warn("Score submission failed", error);
          if (message) message.textContent = "Bài đã được chấm, nhưng điểm chưa gửi được. Giữ nguyên trang và báo giáo viên.";
        }
        return result;
      });

      if (message) message.textContent = "Đã tải đủ 40 câu và 4 Section audio. Em có thể bắt đầu.";
    } catch (error) {
      console.error(error);
      if (message) message.textContent = "Chưa tải được bộ đề Listening. Hãy tải lại trang hoặc báo giáo viên.";
    }
  };

  initialize();
})();

