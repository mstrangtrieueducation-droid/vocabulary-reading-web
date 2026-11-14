/* Luyện phát âm IELTS — cấu hình. Không có khoá bí mật nào ở đây.
   FORM_URL: Google Form riêng "IELTS | NỘP VIDEO LUYỆN PHÁT ÂM" (điền sẵn họ tên, lớp, mã bài PRON-001…PRON-050).
   API: Apps Script (dự án Nền tảng IELTS, tệp PhatAmIELTS.gs = scripts/luyen-phat-am/grader.apps-script.gs):
        máy chấm video bằng Gemini, trả điểm + nhận xét về trang này (action=pa).
   Để trống FORM_URL thì nút "Nộp bài" tắt và trang báo "Cô chưa mở Form nộp bài". */
window.PA_CONFIG = {
  CLASSES: ["IELTS 45", "IELTS 46", "IELTS 47", "IELTS 48", "IELTS 49", "IELTS 50", "IELTS 51", "IELTS 52"],
  FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSfx86UYBe9XPf-EHbo9rfDTAESULUBPrdRmNC6rCdjvIqvXpg/viewform",
  FORM_ENTRIES: { name: "entry.706617579", classCode: "entry.2139308740", lessonCode: "entry.682803348" },
  API: "https://script.google.com/macros/s/AKfycbzbIthv3oCEXfF93pXF6k4xzhU-9r7uQvrJyRBRIum6vV2iUXQsh7PYILyzt7Y0PaztIg/exec"
};
