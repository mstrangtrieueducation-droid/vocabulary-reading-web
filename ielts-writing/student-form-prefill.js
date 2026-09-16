(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const config = script.dataset;
  const link = document.querySelector(config.formLink || "#submitHomework");
  if (!link || !config.nameEntry || !config.classEntry) return;

  const STORAGE_KEY = "ms-trang-trieu-student-profile-v1";
  const classes = Array.from({ length: 14 }, (_, index) => `IELTS ${index + 40}`);
  const baseUrl = link.getAttribute("href") || "";

  const readProfile = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  };

  const saveProfile = (name, className) => {
    if (!name || !className) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, className }));
    } catch {
      // Prefill still works for the current page if storage is unavailable.
    }
  };

  const addStyles = () => {
    if (document.getElementById("student-prefill-styles")) return;
    const style = document.createElement("style");
    style.id = "student-prefill-styles";
    style.textContent = `
      .student-prefill-card{margin:18px 0;padding:20px;border:1px solid #c7dadd;border-radius:14px;background:#f1f8f7;color:#17384a;text-align:left}
      .student-prefill-card strong{display:block;margin-bottom:5px;color:#126f70;font-size:16px}
      .student-prefill-card p{margin:0 0 14px;font-size:14px;line-height:1.55}
      .student-prefill-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(160px,1fr);gap:12px}
      .student-prefill-card label{display:grid;gap:6px;font-size:13px;font-weight:700}
      .student-prefill-card input,.student-prefill-card select{width:100%;min-height:44px;padding:10px 12px;border:1px solid #9fb9bf;border-radius:9px;background:#fff;color:#17384a;font:inherit}
      .student-prefill-card input:focus,.student-prefill-card select:focus{outline:3px solid rgba(204,158,60,.3);border-color:#a67517}
      .student-prefill-status{margin:12px 0 0!important;font-weight:700;color:#6d4b0c}
      @media(max-width:600px){.student-prefill-grid{grid-template-columns:1fr}.student-prefill-card{padding:16px}}
    `;
    document.head.appendChild(style);
  };

  let nameInput = config.nameSelector ? document.querySelector(config.nameSelector) : null;
  let classInput = config.classSelector ? document.querySelector(config.classSelector) : null;
  let status;

  if (!nameInput || !classInput) {
    addStyles();
    const card = document.createElement("div");
    card.className = "student-prefill-card";
    card.innerHTML = `
      <strong>THÔNG TIN HỌC SINH</strong>
      <p>Nhập một lần tại đây. Khi mở form, họ tên và lớp sẽ được điền sẵn.</p>
      <div class="student-prefill-grid">
        <label>Họ và tên đầy đủ<input type="text" autocomplete="name" data-student-name placeholder="Nguyễn Văn A"></label>
        <label>Lớp IELTS<select data-student-class><option value="">Chọn lớp</option>${classes.map((item) => `<option value="${item}">${item}</option>`).join("")}</select></label>
      </div>
      <p class="student-prefill-status" aria-live="polite"></p>
    `;
    link.parentNode.insertBefore(card, link);
    nameInput = card.querySelector("[data-student-name]");
    classInput = card.querySelector("[data-student-class]");
    status = card.querySelector(".student-prefill-status");
  }

  const profile = readProfile();
  if (profile.name && !String(nameInput.value || "").trim()) nameInput.value = profile.name;
  if (profile.className && !String(classInput.value || "").trim()) classInput.value = profile.className;

  const sync = () => {
    const name = String(nameInput.value || "").trim().replace(/\s+/g, " ");
    const className = String(classInput.value || "").trim();
    const destination = new URL(baseUrl, window.location.href);
    destination.searchParams.set("usp", "pp_url");
    if (name) destination.searchParams.set(`entry.${config.nameEntry}`, name);
    else destination.searchParams.delete(`entry.${config.nameEntry}`);
    if (className) destination.searchParams.set(`entry.${config.classEntry}`, className);
    else destination.searchParams.delete(`entry.${config.classEntry}`);
    link.href = destination.toString();
    if (name && className) saveProfile(name, className);
    if (status) {
      status.textContent = name && className
        ? `✓ Form sẽ điền sẵn: ${name} · ${className}`
        : "Điền đủ họ tên và lớp trước khi mở form.";
    }
    return Boolean(name && className);
  };

  [nameInput, classInput].forEach((control) => {
    control.addEventListener("input", sync);
    control.addEventListener("change", sync);
  });

  link.addEventListener("click", (event) => {
    if (sync()) return;
    event.preventDefault();
    if (status) status.textContent = "Em cần nhập đủ họ tên và lớp để form điền sẵn chính xác.";
    if (!String(nameInput.value || "").trim()) nameInput.focus();
    else classInput.focus();
  });

  sync();
})();
