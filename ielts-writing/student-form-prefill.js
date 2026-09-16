(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const config = script.dataset;
  const link = document.querySelector(config.formLink || "#submitHomework");
  if (!link || !config.nameEntry || !config.classEntry) return;

  const STORAGE_KEY = "ms-trang-trieu-student-profile-v1";
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

  const readJson = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  const readUrlProfile = () => {
    const params = new URLSearchParams(window.location.search);
    const first = (keys) => keys.map((key) => params.get(key)).find(Boolean) || "";
    return normalizeProfile({
      name: first([`entry.${config.nameEntry}`, "studentName", "fullName", "name", "student", "hoTen", "hoten"]),
      className: first([`entry.${config.classEntry}`, "studentClass", "className", "class", "lop"])
    });
  };

  const readStoredProfile = () => {
    const shared = normalizeProfile(readJson(STORAGE_KEY));
    if (shared) return shared;

    const knownKeys = [
      "mstt-reading-b02-v1",
      "ielts-listening-b04-practice-attempt",
      "ielts:profile:v1",
      "ri2:profile:v1",
      "ri3:profile:v1"
    ];
    for (const key of knownKeys) {
      const profile = normalizeProfile(readJson(key));
      if (profile) return profile;
    }

    try {
      const ri3Profile = normalizeProfile({
        name: localStorage.getItem("ri3-student-name"),
        className: localStorage.getItem("ri3-student-class")
      });
      if (ri3Profile) return ri3Profile;

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || "";
        if (!/(profile|identity|student|attempt|reading-b02|listening-b04)/i.test(key)) continue;
        const profile = normalizeProfile(readJson(key));
        if (profile) return profile;
      }
    } catch {
      // The form link still opens normally when browser storage is unavailable.
    }
    return null;
  };

  const readPageProfile = () => normalizeProfile({
    name: nameInput && nameInput.value,
    className: classInput && classInput.value
  });

  const saveProfile = (profile) => {
    if (!validProfile(profile)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Prefilling the current link does not depend on storage being writable.
    }
  };

  const sync = () => {
    const profile = readPageProfile() || readUrlProfile() || readStoredProfile();
    const destination = new URL(baseUrl, window.location.href);
    if (profile) {
      destination.searchParams.set("usp", "pp_url");
      destination.searchParams.set(`entry.${config.nameEntry}`, profile.name);
      destination.searchParams.set(`entry.${config.classEntry}`, profile.className);
      saveProfile(profile);
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
