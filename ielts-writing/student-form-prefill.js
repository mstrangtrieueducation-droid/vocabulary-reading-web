(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const config = script.dataset;
  const link = document.querySelector(config.formLink || "#submitHomework");
  if (!link || !config.nameEntry || !config.classEntry) return;

  const baseUrl = link.getAttribute("href") || "";
  const nameInput = config.nameSelector ? document.querySelector(config.nameSelector) : null;
  const classInput = config.classSelector ? document.querySelector(config.classSelector) : null;

  const cleanName = (value) => String(value || "").trim().replace(/\s+/g, " ");
  const cleanClass = (value) => String(value || "").trim();
  const validProfile = (profile) => Boolean(profile && cleanName(profile.name) && cleanClass(profile.className));

  const normalizeProfile = (value) => {
    if (!value || typeof value !== "object") return null;
    const source = value.identity && typeof value.identity === "object" ? value.identity : value;
    const profile = {
      name: cleanName(source.name || source.studentName || source.fullName || source.hoTen),
      className: cleanClass(source.className || source.studentClass || source.class || source.lop)
    };
    return validProfile(profile) ? profile : null;
  };

  const readUrlProfile = () => {
    const params = new URLSearchParams(window.location.search);
    const first = (keys) => keys.map((key) => params.get(key)).find(Boolean) || "";
    return normalizeProfile({
      name: first([`entry.${config.nameEntry}`, "studentName", "fullName", "name", "student", "hoTen", "hoten"]),
      className: first([`entry.${config.classEntry}`, "studentClass", "className", "class", "lop"])
    });
  };

  const readPageProfile = () => normalizeProfile({
    name: nameInput && nameInput.value,
    className: classInput && classInput.value
  });

  const sync = () => {
    // A managed lesson receives its identity from the canonical parent receiver.
    // Never overwrite that identity from browser storage or an older attempt.
    if (typeof window.MTTProfileClassAllowed === "function") return;
    const profile = readPageProfile() || readUrlProfile();
    const destination = new URL(baseUrl, window.location.href);
    if (profile) {
      destination.searchParams.set("usp", "pp_url");
      destination.searchParams.set(`entry.${config.nameEntry}`, profile.name);
      destination.searchParams.set(`entry.${config.classEntry}`, profile.className);

    }
    link.href = destination.toString();
  };

  [nameInput, classInput].filter(Boolean).forEach((control) => {
    control.addEventListener("input", sync);
    control.addEventListener("change", sync);
  });
  link.addEventListener("click", sync);
  sync();
})();
