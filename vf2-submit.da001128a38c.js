(function () {
  "use strict";

  var API_BASE = String(document.documentElement.dataset.apiEndpoint || "").trim();
  var BRIDGE_SOURCE = "vf2-drive-submit";
  var MAX_PDF_BYTES = 100 * 1024 * 1024;
  var MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
  var MAX_IMAGES = 40;
  var MAX_IMAGE_BYTES = 30 * 1024 * 1024;
  var CHUNK_BYTES = 8 * 1024 * 1024;
  var FINGERPRINT_WINDOW_BYTES = 64 * 1024;
  var IMAGE_PATTERN = /\.(?:jpe?g|png|webp|heic|heif)$/i;
  var PDF_PATTERN = /\.pdf$/i;
  var VIDEO_PATTERN = /\.(?:mp4|mov|m4v|webm|avi|mkv|3gp)$/i;

  var PROGRAMS = Object.freeze({
    VF1: Object.freeze({ name: "Vocabulary Foundation 1", units: 14 }),
    VF2: Object.freeze({ name: "Vocabulary Foundation 2", units: 14 }),
    RI1: Object.freeze({ name: "Reading Intensive 1", units: 12 }),
    RI2: Object.freeze({ name: "Reading Intensive 2", units: 12 }),
  });

  var params = new URLSearchParams(window.location.search);
  var requestedCode = String(params.get("code") || "").trim().toUpperCase();
  var codeMatch = /^(VF1|VF2|RI1|RI2)-U(0[1-9]|1[0-4])$/.exec(requestedCode);
  var correctionMatch = /^(RI1|RI2)-C(0[1-9]|1[0-2])$/.exec(requestedCode);
  var academicMatch = /^AP-B(0[1-8])$/.exec(requestedCode);
  var grammarMatch = /^GF1-U(0[1-9]|1[0-9]|20|04\.[12]|05\.[12]|09\.[12])-LT$/.exec(requestedCode);
  var ieltsReadingMatch = /^IELTS-READING-B01$/.exec(requestedCode);
  var ieltsWritingMatch = /^IELTS-WRITING-W(05|07)$/.exec(requestedCode);
  var isWritingRoom = requestedCode === "IELTS-WRITING-W07";
  var activeWritingTask = 1;
  var notebookOnly = Boolean(correctionMatch || academicMatch || grammarMatch || ieltsWritingMatch);
  var submissionKind = correctionMatch ? "correction" : (academicMatch ? "academic" : (grammarMatch ? "grammar" : (ieltsReadingMatch ? "ieltsReading" : (ieltsWritingMatch ? "ieltsWriting" : "vocabulary"))));
  var program = correctionMatch
    ? Object.freeze({ name: correctionMatch[1] === "RI1" ? "Reading Intensive 1 · Vở chữa" : "Reading Intensive 2 · Vở chữa", units: 12 })
    : (academicMatch
      ? Object.freeze({ name: "Đoạn văn học thuật", units: 8 })
      : (grammarMatch
        ? Object.freeze({ name: "Grammar Foundation", units: 23 })
        : (ieltsWritingMatch
          ? Object.freeze({
              name: "IELTS Writing",
              units: 1,
              classes: Object.freeze([
                "IELTS 40", "IELTS 41", "IELTS 42", "IELTS 43", "IELTS 44", "IELTS 45", "IELTS 46",
                "IELTS 47", "IELTS 48", "IELTS 49", "IELTS 50", "IELTS 51", "IELTS 52", "IELTS 53",
              ]),
            })
          : (ieltsReadingMatch
          ? Object.freeze({
              name: "IELTS Reading",
              units: 1,
              classes: Object.freeze([
                "IELTS 40", "IELTS 41", "IELTS 42", "IELTS 43", "IELTS 44", "IELTS 45", "IELTS 46",
                "IELTS 47", "IELTS 48", "IELTS 49", "IELTS 50", "IELTS 51", "IELTS 52", "IELTS 53",
              ]),
            })
          : (codeMatch ? PROGRAMS[codeMatch[1]] : null)))));
  var matchedUnit = correctionMatch
    ? Number(correctionMatch[2])
    : (academicMatch ? Number(academicMatch[1]) : (grammarMatch ? grammarMatch[1] : (ieltsWritingMatch ? Number(ieltsWritingMatch[1]) : (ieltsReadingMatch ? 1 : (codeMatch ? Number(codeMatch[2]) : 0)))));
  var validVocabulary = Boolean(codeMatch && program && Number(matchedUnit) <= program.units);
  var assignmentCode = (notebookOnly || validVocabulary || ieltsReadingMatch) ? requestedCode : "";
  var unitNumber = assignmentCode ? matchedUnit : 0;
  var notebookCopy = submissionKind === "correction"
    ? Object.freeze({ short: "vở chữa bài", eyebrow: "NỘP VỞ CHỮA BÀI", title: "Bài chữa " + unitNumber + " · Nộp vở", file: "vo-chua" })
    : (submissionKind === "academic"
      ? Object.freeze({ short: "vở chép đoạn văn", eyebrow: "NỘP VỞ CHÉP", title: "Buổi " + String(unitNumber).padStart(2, "0") + " · Nộp vở", file: "vo-chep" })
      : (submissionKind === "grammar"
        ? Object.freeze({ short: "bài chép ngữ pháp", eyebrow: "NỘP BÀI CHÉP NGỮ PHÁP", title: "Unit " + unitNumber + " · Nộp bài chép", file: "bai-chep-ngu-phap" })
        : (submissionKind === "ieltsWriting"
          ? Object.freeze({ short: "vở chép", eyebrow: "NỘP VỞ CHÉP", title: "Buổi " + String(unitNumber).padStart(2, "0") + " · Nộp vở chép" + (isWritingRoom ? " & viết bài" : ""), file: "vo-chep" })
          : (submissionKind === "ieltsReading"
            ? Object.freeze({ short: "sổ từ vựng", eyebrow: "NỘP SỔ TỪ VỰNG", title: "Buổi 1 · Nộp bài", file: "so-tu-vung" })
            : Object.freeze({ short: "sổ từ vựng", eyebrow: "NỘP SỔ TỪ VỰNG", title: "Unit " + unitNumber + " · Nộp bài", file: "so-tu-vung" })))));
  var outputName = assignmentCode + "-" + notebookCopy.file + ".pdf";

  var state = {
    images: [],
    pdfFile: null,
    generatedBlob: null,
    generatedUrl: "",
    videoFile: null,
    videoUrl: "",
    draggedId: "",
    preparing: false,
    submitting: false,
    submitted: false,
  };

  function query(selector) {
    return document.querySelector(selector);
  }

  function uniqueId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "file-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function clientSubmissionId() {
    var key = "vocabulary-direct-submission-" + assignmentCode;
    try {
      var existing = window.localStorage.getItem(key);
      if (existing) return existing;
      var created = uniqueId().replace(/[^A-Za-z0-9_-]/g, "");
      window.localStorage.setItem(key, created);
      return created;
    } catch (_error) {
      return uniqueId().replace(/[^A-Za-z0-9_-]/g, "");
    }
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
    return (bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1) + " MB";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  function isPdf(file) {
    return file.type === "application/pdf" || PDF_PATTERN.test(file.name);
  }

  function isImage(file) {
    return /^(?:image\/(?:jpeg|png|webp|heic|heif))$/i.test(file.type || "") || IMAGE_PATTERN.test(file.name);
  }

  function isHeic(file) {
    return /heic|heif/i.test(file.type || "") || /\.(?:heic|heif)$/i.test(file.name);
  }

  function isVideo(file) {
    return String(file.type || "").indexOf("video/") === 0 || VIDEO_PATTERN.test(file.name);
  }

  function revokePreparedPdf() {
    if (state.generatedUrl) URL.revokeObjectURL(state.generatedUrl);
    state.generatedUrl = "";
    state.generatedBlob = null;
  }

  function revokeImages() {
    state.images.forEach(function (item) {
      URL.revokeObjectURL(item.preview);
    });
    state.images = [];
  }

  function revokeVideo() {
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    state.videoUrl = "";
  }

  function setStatus(message, type) {
    var node = query("[data-status-message]");
    if (!node) return;
    node.textContent = message || "";
    node.dataset.type = type || "";
    node.hidden = !message;
  }

  function setProgress(kind, percent) {
    var safe = Math.max(0, Math.min(100, Math.round(percent || 0)));
    var progress = query(kind === "pdf" ? "[data-pdf-progress]" : "[data-video-progress]");
    var label = query(kind === "pdf" ? "[data-pdf-percent]" : "[data-video-percent]");
    if (progress) progress.value = safe;
    if (label) label.textContent = safe + "%";
  }

  function identity() {
    var studentName = String(query("[data-student-name]").value || "").trim();
    var className = String(query("[data-class-name]").value || "").trim();
    return {
      studentName: studentName,
      email: internalStudentKey(studentName, className),
      className: className,
    };
  }


  function internalStudentKey(studentName, className) {
    var normalized = [studentName, className]
      .map(function (value) {
        return String(value || "").normalize("NFKC").trim().toLowerCase();
      })
      .join("|");
    var hash = 2166136261;
    for (var index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return "student-" + (hash >>> 0).toString(16).padStart(8, "0") + "@no-email.invalid";
  }

  function notebookReady() {
    return Boolean(state.pdfFile || state.generatedBlob || state.images.length);
  }

  function countWords(value) {
    var normalized = String(value || "").trim();
    return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
  }

  function writingData() {
    if (!isWritingRoom) return null;
    return {
      essayOne: String(query("[data-essay-one]").value || "").trim(),
      essayTwo: String(query("[data-essay-two]").value || "").trim(),
      confirmed: Boolean(query("[data-confirmation]").checked),
    };
  }

  function writingReady() {
    if (!isWritingRoom) return true;
    var data = writingData();
    return countWords(data.essayOne) >= 150 && countWords(data.essayTwo) >= 150;
  }

  function writingStorageKey(suffix) {
    return "ielts-writing-w07-" + suffix;
  }

  function saveWritingDrafts() {
    if (!isWritingRoom) return;
    try {
      localStorage.setItem(writingStorageKey("essay-one"), query("[data-essay-one]").value);
      localStorage.setItem(writingStorageKey("essay-two"), query("[data-essay-two]").value);
    } catch (_error) {}
  }

  function renderWordCount(number) {
    var textarea = query(number === 1 ? "[data-essay-one]" : "[data-essay-two]");
    var countNode = query(number === 1 ? "[data-word-count-one]" : "[data-word-count-two]");
    var statusNode = query(number === 1 ? "[data-word-status-one]" : "[data-word-status-two]");
    var words = countWords(textarea && textarea.value);
    countNode.textContent = String(words);
    statusNode.textContent = words >= 150 ? "Đã đủ tối thiểu 150 từ" : "Chưa đủ 150 từ";
    statusNode.classList.toggle("is-ready", words >= 150);
  }

  function selectWritingTask(number) {
    activeWritingTask = number;
    document.querySelectorAll("[data-task-tab]").forEach(function (button) {
      var active = Number(button.dataset.taskTab) === number;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-writing-task]").forEach(function (panel) {
      var active = Number(panel.dataset.writingTask) === number;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  function updateSubmitState() {
    var info = identity();
    var ready =
      assignmentCode &&
      info.studentName.length >= 2 &&
      Boolean(info.className) &&
      notebookReady() &&
      writingReady() &&
      (notebookOnly || Boolean(state.videoFile)) &&
      Boolean(query("[data-confirmation]").checked) &&
      !state.preparing &&
      !state.submitting &&
      !state.submitted;
    query("[data-submit-button]").disabled = !ready;
  }

  function setControlsDisabled(disabled) {
    document
      .querySelectorAll("input, select, textarea, button")
      .forEach(function (node) {
        if (node.matches("[data-submit-button]") && !disabled) return;
        node.disabled = disabled;
      });
    if (!disabled) {
      renderNotebook();
      if (!notebookOnly) renderVideo();
      updateSubmitState();
    }
  }

  function resetPreparedPdf() {
    revokePreparedPdf();
    query("[data-download-pdf]").hidden = true;
    query("[data-pdf-ready]").hidden = true;
    updateSubmitState();
  }

  function createImageCard(item, index) {
    var card = document.createElement("article");
    card.className = "pdf-page";
    card.draggable = true;
    card.dataset.imageId = item.id;
    card.innerHTML =
      '<span class="page-number">' + (index + 1) + "</span>" +
      '<div class="page-preview"><img alt="Trang ' + (index + 1) + '" src="' + item.preview + '" /></div>' +
      '<p class="page-name">' + escapeHtml(item.file.name) + "</p>" +
      '<div class="page-actions">' +
      '<button type="button" data-move-up title="Đưa lên trước" aria-label="Đưa trang lên trước">↑</button>' +
      '<button type="button" data-move-down title="Đưa xuống sau" aria-label="Đưa trang xuống sau">↓</button>' +
      '<button type="button" data-rotate title="Xoay ảnh" aria-label="Xoay trang 90 độ">↻</button>' +
      '<button type="button" data-remove title="Xóa ảnh" aria-label="Xóa trang">×</button>' +
      "</div>";
    card.querySelector("img").style.transform = "rotate(" + item.rotation + "deg)";
    card.querySelector("[data-move-up]").disabled = index === 0 || state.submitting;
    card.querySelector("[data-move-down]").disabled = index === state.images.length - 1 || state.submitting;
    card.querySelector("[data-move-up]").addEventListener("click", function () {
      moveImage(item.id, -1);
    });
    card.querySelector("[data-move-down]").addEventListener("click", function () {
      moveImage(item.id, 1);
    });
    card.querySelector("[data-rotate]").addEventListener("click", function () {
      item.rotation = (item.rotation + 90) % 360;
      resetPreparedPdf();
      renderNotebook();
    });
    card.querySelector("[data-remove]").addEventListener("click", function () {
      removeImage(item.id);
    });
    card.addEventListener("dragstart", function () {
      state.draggedId = item.id;
      card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", function () {
      state.draggedId = "";
      card.classList.remove("is-dragging");
    });
    card.addEventListener("dragover", function (event) {
      event.preventDefault();
    });
    card.addEventListener("drop", function (event) {
      event.preventDefault();
      moveDraggedImage(item.id);
    });
    return card;
  }

  function renderNotebook() {
    var empty = query("[data-notebook-empty]");
    var chip = query("[data-pdf-chip]");
    var count = query("[data-image-count]");
    var list = query("[data-image-list]");
    var createButton = query("[data-create-pdf]");
    list.replaceChildren();

    if (state.pdfFile) {
      chip.hidden = false;
      chip.querySelector("strong").textContent = state.pdfFile.name;
      chip.querySelector("small").textContent = formatSize(state.pdfFile.size) + " · dùng trực tiếp";
    } else {
      chip.hidden = true;
    }

    state.images.forEach(function (item, index) {
      list.appendChild(createImageCard(item, index));
    });
    count.hidden = !state.images.length;
    if (state.images.length) {
      count.textContent =
        "Đã chọn " + state.images.length + " trang. Thứ tự hiện tại chính là thứ tự trang trong PDF.";
    }
    createButton.hidden = !state.images.length;
    createButton.disabled = state.preparing || state.submitting;
    empty.hidden = Boolean(state.pdfFile || state.images.length);
    updateSubmitState();
  }

  function renderVideo() {
    var empty = query("[data-video-empty]");
    var chip = query("[data-video-chip]");
    var preview = query("[data-video-preview]");
    if (!state.videoFile) {
      empty.hidden = false;
      chip.hidden = true;
      preview.hidden = true;
      preview.removeAttribute("src");
    } else {
      empty.hidden = true;
      chip.hidden = false;
      chip.querySelector("strong").textContent = state.videoFile.name;
      chip.querySelector("small").textContent = formatSize(state.videoFile.size);
      preview.src = state.videoUrl;
      preview.hidden = false;
    }
    updateSubmitState();
  }

  function chooseNotebookFiles(fileList) {
    if (state.submitting) return;
    var files = Array.from(fileList || []);
    if (!files.length) return;
    var pdfs = files.filter(isPdf);
    var images = files.filter(isImage);
    if (pdfs.length && (files.length !== 1 || images.length)) {
      setStatus("Chỉ chọn đúng 01 PDF, hoặc chọn nhiều ảnh; không trộn PDF với ảnh.", "error");
      return;
    }
    if (!pdfs.length && images.length !== files.length) {
      setStatus("Có tệp không phải PDF hoặc ảnh JPG, PNG, WEBP, HEIC/HEIF.", "error");
      return;
    }
    if (pdfs.length) {
      if (pdfs[0].size > MAX_PDF_BYTES) {
        setStatus("PDF vượt quá 100 MB. Em hãy giảm dung lượng rồi chọn lại.", "error");
        return;
      }
      revokeImages();
      resetPreparedPdf();
      state.pdfFile = pdfs[0];
      setStatus("Đã nhận PDF sổ từ vựng.", "success");
      renderNotebook();
      return;
    }
    if (state.pdfFile) {
      setStatus("Em đang có một PDF. Hãy xóa PDF trước khi chuyển sang chọn ảnh.", "error");
      return;
    }
    if (state.images.length + images.length > MAX_IMAGES) {
      setStatus("Mỗi bài nhận tối đa " + MAX_IMAGES + " ảnh.", "error");
      return;
    }
    var oversized = images.find(function (file) {
      return file.size > MAX_IMAGE_BYTES;
    });
    if (oversized) {
      setStatus("Ảnh " + oversized.name + " vượt quá 30 MB.", "error");
      return;
    }
    var known = new Set(
      state.images.map(function (item) {
        return item.file.name + "|" + item.file.size + "|" + item.file.lastModified;
      }),
    );
    images.forEach(function (file) {
      var signature = file.name + "|" + file.size + "|" + file.lastModified;
      if (known.has(signature)) return;
      known.add(signature);
      state.images.push({
        id: uniqueId(),
        file: file,
        preview: URL.createObjectURL(file),
        rotation: 0,
      });
    });
    resetPreparedPdf();
    setStatus("Đã thêm ảnh. Em hãy kiểm tra số trang, thứ tự và chiều ảnh.", "success");
    renderNotebook();
  }

  function chooseVideo(file) {
    if (!file || state.submitting) return;
    if (!isVideo(file)) {
      setStatus("Tệp đã chọn không phải video.", "error");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setStatus("Video vượt quá 1 GB. Em hãy giảm dung lượng rồi chọn lại.", "error");
      return;
    }
    revokeVideo();
    state.videoFile = file;
    state.videoUrl = URL.createObjectURL(file);
    setStatus("Đã nhận video trả từ.", "success");
    renderVideo();
  }

  function moveImage(id, direction) {
    var index = state.images.findIndex(function (item) {
      return item.id === id;
    });
    var destination = index + direction;
    if (index < 0 || destination < 0 || destination >= state.images.length) return;
    var moved = state.images.splice(index, 1)[0];
    state.images.splice(destination, 0, moved);
    resetPreparedPdf();
    renderNotebook();
  }

  function moveDraggedImage(targetId) {
    if (!state.draggedId || state.draggedId === targetId) return;
    var from = state.images.findIndex(function (item) {
      return item.id === state.draggedId;
    });
    var to = state.images.findIndex(function (item) {
      return item.id === targetId;
    });
    if (from < 0 || to < 0) return;
    var moved = state.images.splice(from, 1)[0];
    state.images.splice(to, 0, moved);
    resetPreparedPdf();
    renderNotebook();
  }

  function removeImage(id) {
    var index = state.images.findIndex(function (item) {
      return item.id === id;
    });
    if (index < 0) return;
    URL.revokeObjectURL(state.images[index].preview);
    state.images.splice(index, 1);
    resetPreparedPdf();
    renderNotebook();
  }

  function loadImage(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Không đọc được một ảnh. Em hãy chụp/lưu lại ảnh rồi thử lại."));
      };
      image.src = url;
    });
  }

  async function normalizeImage(item) {
    var source = item.file;
    if (isHeic(item.file)) {
      if (typeof window.heic2any !== "function") {
        throw new Error("Thiết bị chưa xử lý được ảnh HEIC. Em hãy đổi ảnh sang JPG rồi thử lại.");
      }
      var converted = await window.heic2any({ blob: item.file, toType: "image/jpeg", quality: 0.88 });
      source = Array.isArray(converted) ? converted[0] : converted;
    }
    var image = await loadImage(source);
    var sourceWidth = image.naturalWidth || image.width;
    var sourceHeight = image.naturalHeight || image.height;
    var scaleDown = Math.min(1, 2200 / Math.max(sourceWidth, sourceHeight));
    var width = Math.max(1, Math.round(sourceWidth * scaleDown));
    var height = Math.max(1, Math.round(sourceHeight * scaleDown));
    var quarterTurn = Math.abs(item.rotation % 180) === 90;
    var canvas = document.createElement("canvas");
    canvas.width = quarterTurn ? height : width;
    canvas.height = quarterTurn ? width : height;
    var context = canvas.getContext("2d");
    if (!context) throw new Error("Thiết bị chưa thể xử lý ảnh. Em hãy dùng Chrome hoặc Safari mới nhất.");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((item.rotation * Math.PI) / 180);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    return await new Promise(function (resolve, reject) {
      canvas.toBlob(
        function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Không thể tạo ảnh PDF trên thiết bị này."));
        },
        "image/jpeg",
        0.86,
      );
    });
  }

  async function preparePdf(options) {
    options = options || {};
    if (state.pdfFile) return state.pdfFile;
    if (state.generatedBlob) return state.generatedBlob;
    if (!state.images.length) throw new Error("Em chưa chọn PDF hoặc ảnh sổ từ vựng.");
    if (!window.PDFLib || !window.PDFLib.PDFDocument) {
      throw new Error("Bộ ghép PDF chưa tải xong. Em hãy đợi vài giây rồi thử lại.");
    }
    state.preparing = true;
    updateSubmitState();
    setStatus("Đang ghép ảnh theo đúng thứ tự đã sắp xếp…", "progress");
    try {
      var pdf = await window.PDFLib.PDFDocument.create();
      var pageWidth = 595.28;
      var pageHeight = 841.89;
      var margin = 22;
      for (var index = 0; index < state.images.length; index += 1) {
        setStatus("Đang xử lý trang " + (index + 1) + "/" + state.images.length + "…", "progress");
        var blob = await normalizeImage(state.images[index]);
        var embedded = await pdf.embedJpg(await blob.arrayBuffer());
        var scale = Math.min(
          (pageWidth - margin * 2) / embedded.width,
          (pageHeight - margin * 2) / embedded.height,
        );
        var drawWidth = embedded.width * scale;
        var drawHeight = embedded.height * scale;
        var page = pdf.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, {
          x: (pageWidth - drawWidth) / 2,
          y: (pageHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }
      var bytes = await pdf.save();
      if (bytes.byteLength > MAX_PDF_BYTES) {
        throw new Error("PDF sau khi ghép vượt quá 100 MB. Em hãy giảm số ảnh hoặc dung lượng ảnh.");
      }
      revokePreparedPdf();
      state.generatedBlob = new Blob([bytes], { type: "application/pdf" });
      state.generatedUrl = URL.createObjectURL(state.generatedBlob);
      query("[data-download-pdf]").hidden = false;
      query("[data-pdf-ready]").hidden = false;
      query("[data-pdf-ready]").textContent =
        "Đã ghép xong " + state.images.length + " trang · " + formatSize(state.generatedBlob.size) + ".";
      setStatus("Đã tạo PDF theo đúng thứ tự ảnh.", "success");
      if (options.download) downloadPdf();
      return state.generatedBlob;
    } finally {
      state.preparing = false;
      renderNotebook();
    }
  }

  function downloadPdf() {
    if (!state.generatedUrl) return;
    var link = document.createElement("a");
    link.href = state.generatedUrl;
    link.download = outputName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || "").split(",")[1] || "");
      };
      reader.onerror = function () {
        reject(new Error("Không đọc được tệp này. Em hãy chọn lại tệp rồi thử lại."));
      };
      reader.readAsDataURL(blob);
    });
  }

  function blobToBytes(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(new Uint8Array(reader.result));
      };
      reader.onerror = function () {
        reject(new Error("Không đọc được tệp này. Em hãy chọn lại tệp rồi thử lại."));
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  async function fingerprintFile(file, submittedName, submittedType) {
    if (!window.crypto || !window.crypto.subtle || typeof window.crypto.subtle.digest !== "function"
        || typeof window.TextEncoder !== "function") {
      throw new Error("Trình duyệt này chưa phù hợp để nộp tệp. Em hãy mở bằng Chrome mới nhất.");
    }
    var name = String(submittedName || file.name || "");
    var type = String(submittedType || file.type || "application/octet-stream")
      .trim().toLowerCase().split(";")[0];
    var size = Number(file.size) || 0;
    var firstEnd = Math.min(size, FINGERPRINT_WINDOW_BYTES);
    var lastStart = Math.max(0, size - FINGERPRINT_WINDOW_BYTES);
    var parts = await Promise.all([
      blobToBytes(file.slice(0, firstEnd)),
      blobToBytes(file.slice(lastStart, size)),
    ]);
    var descriptor = new window.TextEncoder().encode(
      "VOCAB-FP1\n" + JSON.stringify([name, type, size]) + "\n",
    );
    var joined = new Uint8Array(descriptor.length + parts[0].length + parts[1].length);
    joined.set(descriptor, 0);
    joined.set(parts[0], descriptor.length);
    joined.set(parts[1], descriptor.length + parts[0].length);
    var digest = new Uint8Array(await window.crypto.subtle.digest("SHA-256", joined));
    return Array.from(digest, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function postToBackend(payload) {
    if (!API_BASE || /^__/.test(API_BASE)) {
      return Promise.reject(new Error("Trang nộp bài đang tạm thời chưa sẵn sàng. Em hãy báo cô Trang."));
    }
    var requestId = uniqueId();
    return new Promise(function (resolve, reject) {
      var frameName = "vf2-drive-bridge-" + requestId;
      var frame = document.createElement("iframe");
      frame.name = frameName;
      frame.title = "Đang gửi bài";
      frame.hidden = true;
      var form = document.createElement("form");
      form.method = "POST";
      form.action = API_BASE;
      form.target = frameName;
      form.acceptCharset = "UTF-8";
      form.hidden = true;
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify(
        Object.assign({}, payload, {
          requestId: requestId,
          clientOrigin: window.location.origin,
        }),
      );
      form.appendChild(input);

      function cleanup() {
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timeout);
        frame.remove();
        form.remove();
      }
      function onMessage(event) {
        var data = event.data || {};
        var originHost = "";
        try {
          originHost = new URL(event.origin).hostname;
        } catch (_originError) {
          return;
        }
        if (originHost !== "script.google.com" && !originHost.endsWith(".googleusercontent.com")) return;
        if (data.source !== BRIDGE_SOURCE || data.requestId !== requestId || !data.result) return;
        cleanup();
        if (!data.result.ok) reject(new Error(studentFacingError(data.result)));
        else resolve(data.result);
      }
      var timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error("Việc gửi bài đang mất nhiều thời gian. Em hãy giữ nguyên trang và thử lại."));
      }, 180000);
      window.addEventListener("message", onMessage);
      document.body.append(frame, form);
      form.submit();
    });
  }

  function studentFacingError(result) {
    var code = String(result && result.code || "");
    if (code === "DUPLICATE") {
      return "Bài này đã được nộp. Nếu cần nộp lại, em hãy báo cô Trang.";
    }
    if (code === "ACTIVE_ON_OTHER_DEVICE") {
      return "Bài nộp đang được thực hiện trên thiết bị khác. Em hãy quay lại thiết bị đó hoặc báo cô Trang.";
    }
    if (code === "BAD_ASSIGNMENT") {
      return "Link bài nộp chưa đúng. Em hãy mở lại từ trang bài học.";
    }
    if (code === "DAILY_START_LIMIT" || code === "DAILY_BYTES_LIMIT") {
      return "Hiện chưa thể nhận thêm bài. Em hãy báo cô Trang.";
    }
    return "Chưa nộp được bài. Em hãy giữ nguyên trang và thử lại.";
  }

  async function probeUploadOffset(token, upload, total) {
    return await postToBackend({
      action: "uploadChunk",
      assignmentCode: assignmentCode,
      token: token,
      uploadId: upload.uploadId,
      total: total,
      probe: true,
    });
  }

  async function uploadFileByChunks(token, upload, file, onProgress) {
    var total = file.size;
    var chunkBytes = Number(upload.chunkSize) || CHUNK_BYTES;
    var offset = Math.max(0, Number(upload.nextOffset) || 0);
    var fileId = String(upload.fileId || "");
    if (Number(upload.size) !== total || offset > total) {
      throw new Error("Tệp đã thay đổi trong lúc nộp. Em hãy chọn lại đúng tệp rồi thử lại.");
    }
    if (upload.completed) {
      if (!fileId) throw new Error("Tệp chưa được ghi nhận hoàn tất. Em hãy thử lại.");
      onProgress(100);
      return fileId;
    }
    onProgress((offset / total) * 100);
    while (offset < total) {
      var end = Math.min(offset + chunkBytes, total);
      var chunk = file.slice(offset, end);
      var base64 = await blobToBase64(chunk);
      var result;
      var lastError;
      for (var attempt = 1; attempt <= 3; attempt += 1) {
        try {
          result = await postToBackend({
            action: "uploadChunk",
            assignmentCode: assignmentCode,
            token: token,
            uploadId: upload.uploadId,
            offset: offset,
            total: total,
            dataBase64: base64,
          });
          break;
        } catch (error) {
          lastError = error;
          try {
            var probe = await probeUploadOffset(token, upload, total);
            if (Number(probe.nextOffset) > offset || probe.completed) {
              result = probe;
              break;
            }
          } catch (_probeError) {
            // Keep the original error; a later retry may recover the Drive session.
          }
          if (attempt < 3) {
            await new Promise(function (resolve) {
              window.setTimeout(resolve, 800 * attempt);
            });
          }
        }
      }
      if (!result) throw lastError || new Error("Chưa gửi được tệp. Em hãy giữ nguyên trang và thử lại.");
      var received = Number(result.nextOffset);
      if (!Number.isFinite(received) || received < offset || received > total) {
        throw new Error("Có lỗi khi chuẩn bị nơi nhận tệp. Em hãy thử lại.");
      }
      if (result.fileId) fileId = result.fileId;
      if (result.completed) {
        offset = total;
      } else {
        if (received === offset) {
          throw new Error("Một phần tệp chưa được gửi xong. Em hãy giữ nguyên trang và thử lại.");
        }
        offset = received;
      }
      onProgress((offset / total) * 100);
    }
    if (!fileId) {
      var finalProbe = await probeUploadOffset(token, upload, total);
      fileId = finalProbe.fileId || "";
    }
    if (!fileId) throw new Error("Tệp chưa được gửi xong. Em hãy thử lại.");
    return fileId;
  }

  async function submitAll() {
    if (state.submitting || state.submitted || query("[data-submit-button]").disabled) return;
    var info = identity();
    state.submitting = true;
    setControlsDisabled(true);
    query("[data-upload-progress]").hidden = false;
    setProgress("pdf", 0);
    if (!notebookOnly) setProgress("video", 0);
    try {
      var notebook = await preparePdf();
      var pdfName = state.pdfFile ? state.pdfFile.name : outputName;
      var videoType = notebookOnly ? "" : (state.videoFile.type || "application/octet-stream");
      setStatus(notebookOnly ? "Đang kiểm tra PDF…" : "Đang kiểm tra PDF và video…", "progress");
      var fingerprints = notebookOnly
        ? [await fingerprintFile(notebook, pdfName, "application/pdf")]
        : await Promise.all([
          fingerprintFile(notebook, pdfName, "application/pdf"),
          fingerprintFile(state.videoFile, state.videoFile.name, videoType),
        ]);
      setStatus("Đang chuẩn bị nộp bài…", "progress");
      var start = await postToBackend({
        action: "start",
        assignmentCode: assignmentCode,
        clientSubmissionId: clientSubmissionId(),
        studentName: info.studentName,
        email: info.email,
        className: info.className,
        writing: writingData(),
        files: {
          notebook: {
            name: pdfName,
            type: "application/pdf",
            size: notebook.size,
            fingerprint: fingerprints[0],
          },
          video: notebookOnly ? null : {
            name: state.videoFile.name,
            type: videoType,
            size: state.videoFile.size,
            fingerprint: fingerprints[1],
          },
        },
      });
      if (!start.token || !start.uploads || !start.uploads.notebook || (!notebookOnly && !start.uploads.video)) {
        throw new Error("Chưa thể bắt đầu nộp bài. Em hãy thử lại.");
      }

      setStatus("Đang gửi PDF sổ từ vựng…", "progress");
      var notebookId = await uploadFileByChunks(start.token, start.uploads.notebook, notebook, function (percent) {
        setProgress("pdf", percent);
      });
      var videoId = "";
      if (!notebookOnly) {
        setStatus("PDF đã gửi xong. Đang gửi video trả từ…", "progress");
        videoId = await uploadFileByChunks(start.token, start.uploads.video, state.videoFile, function (percent) {
          setProgress("video", percent);
        });
      }
      setStatus("Đang hoàn tất bài nộp…", "progress");
      var finished = await postToBackend({
        action: "finalize",
        assignmentCode: assignmentCode,
        token: start.token,
        files: {
          notebookId: notebookId,
          videoId: videoId,
        },
      });
      state.submitted = true;
      if (isWritingRoom) {
        try {
          localStorage.removeItem(writingStorageKey("essay-one"));
          localStorage.removeItem(writingStorageKey("essay-two"));
        } catch (_error) {}
      }
      setStatus(notebookOnly ? "Đã nộp PDF thành công." : "Đã nộp PDF và video thành công.", "success");
      var success = query("[data-success-card]");
      success.hidden = false;
      var pdfLink = query("[data-pdf-result]");
      var videoLink = query("[data-video-result]");
      if (finished.pdfUrl) pdfLink.href = finished.pdfUrl;
      else pdfLink.hidden = true;
      if (!notebookOnly && finished.videoUrl) videoLink.href = finished.videoUrl;
      else videoLink.hidden = true;
      query("[data-submit-button]").hidden = true;
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setStatus(
        error && error.message ? error.message : "Chưa nộp được bài. Em hãy giữ nguyên trang và thử lại.",
        "error",
      );
    } finally {
      state.submitting = false;
      if (!state.submitted) setControlsDisabled(false);
    }
  }

  function showInvalidCode() {
    document.title = "Mã bài không hợp lệ";
    query("[data-page-title]").textContent = "Mã bài không hợp lệ";
    query("[data-assignment-code]").textContent = requestedCode || "—";
    query("[data-code-chip]").textContent = "CHƯA CÓ MÃ";
    document.querySelectorAll(".submit-card").forEach(function (card) {
      card.hidden = true;
    });
    setStatus("Đường dẫn chưa có mã Unit hợp lệ. Em hãy mở lại từ trang bài học.", "error");
  }

  function init() {
    if (!assignmentCode) {
      showInvalidCode();
      return;
    }
    document.title = assignmentCode + " · Nộp bài " + program.name;
    query("[data-page-title]").textContent = notebookCopy.title;
    query("[data-assignment-code]").textContent = assignmentCode;
    query("[data-code-chip]").textContent = assignmentCode;
    document.querySelectorAll("[data-program-name]").forEach(function (node) {
      node.textContent = program.name.toUpperCase();
    });
    if (program.classes && query("[data-class-name]")) {
      var classSelect = query("[data-class-name]");
      classSelect.innerHTML = "";
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Chọn lớp";
      classSelect.appendChild(placeholder);
      program.classes.forEach(function (className) {
        var option = document.createElement("option");
        option.value = className;
        option.textContent = className;
        classSelect.appendChild(option);
      });
    }

    if (notebookOnly) {
      query(".submit-hero .eyebrow").textContent = notebookCopy.eyebrow;
      query(".hero-code small").textContent = "Mã bài đã được chọn sẵn; em không cần nhập lại.";
      query(".submit-hero > div > p:not(.eyebrow)").innerHTML =
        "Chọn <strong>01 PDF có sẵn</strong> hoặc <strong>nhiều ảnh theo đúng thứ tự</strong>; trang sẽ tự ghép ảnh thành một PDF để gửi cho cô Trang.";
      query(".notebook-card .section-title p").textContent = notebookCopy.short.toUpperCase();
      query("[data-notebook-empty]").textContent = "Chưa chọn PDF hoặc ảnh " + notebookCopy.short + ".";
      query(".video-card").hidden = true;
      var progressRows = document.querySelectorAll("[data-upload-progress] > div");
      if (progressRows[0]) progressRows[0].querySelector("span").textContent = "PDF " + notebookCopy.short;
      if (progressRows[1]) progressRows[1].hidden = true;
      query(".final-card .section-title > span").textContent = "03";
      query(".final-card .section-title p").textContent = "KIỂM TRA & NỘP BÀI";
      query(".final-card .section-title h2").textContent = "Gửi PDF " + notebookCopy.short;
      query("[data-confirmation] + span").textContent =
        "Em đã kiểm tra đúng mã bài, đúng thứ tự và chiều ảnh, PDF có đủ trang.";
      query("[data-submit-button]").textContent = "NỘP PDF";
      query("[data-success-card] p").textContent = "Cô Trang đã nhận được PDF " + notebookCopy.short + " của em.";
      query("[data-video-result]").hidden = true;
    }

    if (isWritingRoom) {
      query("[data-writing-room]").hidden = false;
      query(".submit-hero .eyebrow").textContent = "NỘP VỞ CHÉP & VIẾT BÀI";
      query(".submit-hero > div > p:not(.eyebrow)").innerHTML =
        "Nộp <strong>vở chép</strong>, sau đó viết đủ <strong>hai bài Academic Task 1</strong> theo đúng đề Buổi 07 trong phòng viết bên dưới.";
      query(".final-card .section-title > span").textContent = "04";
      query(".final-card .section-title h2").textContent = "Nộp PDF vở chép và hai bài viết";
      query("[data-confirmation] + span").textContent =
        "Em xác nhận mỗi bài có ít nhất 150 từ, không dùng từ viết tắt hoặc ngôn ngữ văn nói, đã dùng cấu trúc học trên lớp và cả hai bài do em tự viết.";
      query("[data-submit-button]").textContent = "NỘP VỞ CHÉP + 2 BÀI VIẾT";
      query("[data-success-card] p").textContent = "Cô Trang đã nhận được PDF vở chép và hai bài viết của em.";
      try {
        query("[data-essay-one]").value = localStorage.getItem(writingStorageKey("essay-one")) || "";
        query("[data-essay-two]").value = localStorage.getItem(writingStorageKey("essay-two")) || "";
      } catch (_error) {}
      renderWordCount(1);
      renderWordCount(2);
      document.querySelectorAll("[data-task-tab]").forEach(function (button) {
        button.addEventListener("click", function () { selectWritingTask(Number(button.dataset.taskTab)); });
      });
      [["[data-essay-one]", 1], ["[data-essay-two]", 2]].forEach(function (entry) {
        query(entry[0]).addEventListener("input", function () {
          saveWritingDrafts();
          renderWordCount(entry[1]);
          updateSubmitState();
        });
      });
    }


    query("[data-notebook-input]").addEventListener("change", function (event) {
      chooseNotebookFiles(event.currentTarget.files);
      event.currentTarget.value = "";
    });
    query("[data-remove-pdf]").addEventListener("click", function () {
      state.pdfFile = null;
      resetPreparedPdf();
      renderNotebook();
    });
    query("[data-create-pdf]").addEventListener("click", function () {
      preparePdf({ download: false }).catch(function (error) {
        setStatus(error.message, "error");
      });
    });
    query("[data-download-pdf]").addEventListener("click", downloadPdf);
    if (!notebookOnly) {
      query("[data-video-input]").addEventListener("change", function (event) {
        chooseVideo(event.currentTarget.files && event.currentTarget.files[0]);
        event.currentTarget.value = "";
      });
      query("[data-remove-video]").addEventListener("click", function () {
        state.videoFile = null;
        revokeVideo();
        renderVideo();
      });
    }
    query("[data-submit-button]").addEventListener("click", submitAll);
    document
      .querySelectorAll("[data-student-name], [data-class-name], [data-confirmation], [data-essay-one], [data-essay-two]")
      .forEach(function (node) {
        node.addEventListener("input", updateSubmitState);
        node.addEventListener("change", updateSubmitState);
      });
    renderNotebook();
    if (!notebookOnly) renderVideo();
    updateSubmitState();
  }

  window.addEventListener("beforeunload", function (event) {
    if (isWritingRoom && !state.submitted) saveWritingDrafts();
    if (state.submitting) {
      event.preventDefault();
      event.returnValue = "";
      return "";
    }
    revokePreparedPdf();
    revokeImages();
    if (!notebookOnly) revokeVideo();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
