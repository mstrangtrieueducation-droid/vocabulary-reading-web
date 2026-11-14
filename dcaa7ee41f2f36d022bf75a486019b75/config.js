/* Địa chỉ Web App Apps Script của Sheet "NỀN TẢNG IELTS — THEO DÕI".
   Để trống = chế độ thử: tiến độ chỉ lưu trên máy đang mở. */
window.NT_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzbIthv3oCEXfF93pXF6k4xzhU-9r7uQvrJyRBRIum6vV2iUXQsh7PYILyzt7Y0PaztIg/exec",
  // Phát âm kiểu KIDS: luyện trên web → quay màn hình đọc → nộp Form → Gemini tự chấm (Apps Script ntGradeQueue)
  SPEAK_MODE: "video",
  FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSf9NIR50fMVr5eQ85oDHIE5ZfgUPc2SkqE9Q0_3dUXr9yLmZQ/viewform",
  FORM_ENTRIES: { hs: "entry.1210434514", name: "entry.1301330173", cls: "entry.1976287075", lesson: "entry.579375796" },
  GRADER: "",               // chấm trực tiếp đã tắt (trước: "azure" / "gemini")
  GRADER_MODEL: "gemini-3.5-flash-lite",
  DAYS: 30,
  PASS: 80,
  FINAL_PASS: 70
};
