/* Cây từ vựng IELTS — cấu hình. Không có khoá bí mật nào ở đây.
   API: Apps Script dự án Nền tảng IELTS (tệp CayTuVungReading.gs = scripts/cay-tu-vung-reading/server.apps-script.gs) — lưu cây của từng học sinh, bảng theo dõi cho cô.
   Nhịp: ít nhất RHYTHM_DAYS ngày tưới 1 lần; mỗi lần ≤ REVIEW_MAX từ ôn + NEW_PER_SESSION từ mới (gieo thêm EXTRA từ/lần, tối đa NEW_MAX_DAY từ mới/ngày). */
window.RT_CONFIG = {
  CLASSES: ["IELTS 35", "IELTS 40", "IELTS 41", "IELTS 42", "IELTS 43", "IELTS 44", "IELTS 45", "IELTS 46", "IELTS 47", "IELTS 48", "IELTS 49", "IELTS 50", "IELTS 51", "IELTS 52"],
  NEW_PER_SESSION: 10,
  EXTRA: 5,
  NEW_MAX_DAY: 20,
  REVIEW_MAX: 20,
  RHYTHM_DAYS: 2,
  API: "https://script.google.com/macros/s/AKfycbzbIthv3oCEXfF93pXF6k4xzhU-9r7uQvrJyRBRIum6vV2iUXQsh7PYILyzt7Y0PaztIg/exec"
};
