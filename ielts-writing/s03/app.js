(() => {
  "use strict";

  const STORAGE_KEY = "ielts-reading-b03-homework-checklist";
  const navigationLinks = [...document.querySelectorAll("[data-nav-link]")];
  const sections = [...document.querySelectorAll("[data-section]")];
  const checklist = [...document.querySelectorAll("[data-homework-check]")];
  const progressBar = document.getElementById("homeworkProgress");
  const progressLabel = document.getElementById("progressLabel");
  const submitButton = document.getElementById("submitHomework");
  const resetButton = document.getElementById("resetChecklist");
  const submissionMessage = document.getElementById("submissionMessage");

  const readChecklist = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch {
      return {};
    }
  };

  const writeChecklist = () => {
    const state = Object.fromEntries(
      checklist.map((input) => [input.dataset.homeworkCheck, input.checked])
    );

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The checklist still works when browser storage is unavailable.
    }
  };

  const updateProgress = () => {
    const completed = checklist.filter((input) => input.checked).length;
    const total = checklist.length;
    const percentage = total ? (completed / total) * 100 : 0;
    const ready = total > 0 && completed === total;

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressLabel) {
      progressLabel.textContent = ready
        ? "4/4 yêu cầu đã sẵn sàng · Có thể nộp bài"
        : `${completed}/${total} yêu cầu đã sẵn sàng`;
    }
    if (submitButton) submitButton.classList.toggle("is-incomplete", !ready);
    if (submissionMessage && ready) submissionMessage.textContent = "Đã kiểm tra đủ. Em có thể mở cổng nộp bài.";

    writeChecklist();
  };

  const storedChecklist = readChecklist();
  checklist.forEach((input) => {
    input.checked = Boolean(storedChecklist[input.dataset.homeworkCheck]);
    input.addEventListener("change", () => {
      if (submissionMessage) submissionMessage.textContent = "";
      updateProgress();
    });
  });

  resetButton?.addEventListener("click", () => {
    checklist.forEach((input) => {
      input.checked = false;
    });
    if (submissionMessage) submissionMessage.textContent = "Đã bỏ toàn bộ dấu kiểm.";
    updateProgress();
  });

  submitButton?.addEventListener("click", (event) => {
    const allReady = checklist.length > 0 && checklist.every((input) => input.checked);
    const formUrl = submitButton.getAttribute("href") || "";

    if (!allReady) {
      event.preventDefault();
      if (submissionMessage) {
        submissionMessage.textContent = "Em cần tự kiểm tra và đánh dấu đủ cả 4 yêu cầu trước khi mở cổng nộp.";
      }
      return;
    }

    if (!formUrl || formUrl.includes("__B03_HOMEWORK_FORM_URL__")) {
      event.preventDefault();
      if (submissionMessage) {
        submissionMessage.textContent = "Cổng nộp bài Buổi 03 đang được giáo viên kết nối. Em quay lại sau nhé.";
      }
    }
  });

  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        navigationLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
        });
      },
      { rootMargin: "-28% 0px -55% 0px", threshold: [0.02, 0.25, 0.55] }
    );

    sections.forEach((section) => observer.observe(section));
  }

  updateProgress();
})();
