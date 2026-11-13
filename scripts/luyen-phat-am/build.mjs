// Tạo <thư mục khoá>/data.js và danh sách câu cần thu giọng mẫu từ content.js.
// Dùng: node scripts/luyen-phat-am/build.mjs   (rồi python3 scripts/luyen-phat-am/tts.py để tạo mp3 còn thiếu)
import { createRequire } from "module"; import { createHash } from "crypto"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const OUT = path.join(here, "..", "..", "bd0dce6f2a3925450d119b2133aea9db");
const W = require("./content.js");
export const clean = s => s.replace(/\*/g, "").replace(/‿/g, " ").replace(/\s*[↗↘]/g, "").replace(/([,.;:!?])?\s+\/\s+/g, (m, p) => (p || ",") + " ").replace(/\s+/g, " ").trim();
const id = s => createHash("sha1").update(s).digest("hex").slice(0, 12);
const IPA_OK = /^\/[a-zæɑɒɔəɛɜɪʊʌθðʃʒŋɡːˈˌ ()]+\/$/;
const errs = [], tts = {};
const reg = s => { const c = clean(s); if (!/^[A-Za-z0-9é ,.'’:;!?-]+$/.test(c)) errs.push("ký tự lạ: " + c); tts[id(c)] = c; return id(c); };
if (W.length !== 50) errs.push("không đủ 50 tuần: " + W.length);
const data = W.map((L, i) => {
  if (L.w !== i + 1) errs.push("sai số tuần " + L.w);
  if (!L.x || L.x.length < 3 || L.x.length > 4) errs.push("W" + L.w + " giải thích phải 3–4 dòng");
  if (L.k.length < 6 || L.k.length > 8) errs.push("W" + L.w + " cần 6–8 từ khoá, đang có " + L.k.length);
  if (L.q.length !== 3) errs.push("W" + L.w + " cần 3 câu hỏi");
  const k = L.k.map(([t, ipa, vi]) => { if (!IPA_OK.test(ipa || "")) errs.push("W" + L.w + " IPA lỗi: " + t + " " + ipa); if (!vi) errs.push("W" + L.w + " thiếu nghĩa: " + t); return { t, ipa, vi, a: reg(t) }; });
  if (new Set(k.map(x => x.t)).size !== k.length) errs.push("W" + L.w + " trùng từ khoá");
  const r = [];
  if (L.w >= 9) for (const back of [4, 8, 12, 16]) {   // 2 từ ôn lại từ các tuần trước
    if (r.length === 2) break;
    const P = W[L.w - 1 - back]; if (!P) continue;
    const c = P.k[L.w % P.k.length];
    if (!k.some(x => x.t === c[0]) && !r.some(x => x.t === c[0])) r.push({ t: c[0], ipa: c[1], vi: c[2], a: reg(c[0]), from: P.w });
  }
  if (L.w >= 9 && r.length !== 2) errs.push("W" + L.w + " không đủ 2 từ ôn");
  const q = L.q.map(([qq, ss]) => {
    if (ss.length < 2 || ss.length > 3) errs.push("W" + L.w + " câu trả lời phải 2–3 câu: " + qq);
    const words = clean(ss.join(" ")).split(" ").length; if (words > 45) errs.push("W" + L.w + " câu trả lời dài " + words + " từ: " + qq);
    return { q: qq, qa: reg(qq), s: ss.map(t => ({ t, a: reg(t) })) };
  });
  return { w: L.w, code: "PRON-" + String(L.w).padStart(3, "0"), g: L.g, s: L.s, t: L.t, tv: L.tv, x: L.x, k, r, q };
});
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
fs.writeFileSync(path.join(OUT, "data.js"), "/* Tạo tự động từ scripts/luyen-phat-am/content.js — đừng sửa tay. */\nwindow.PA_DATA=" + JSON.stringify(data) + ";\n");
fs.writeFileSync(path.join(here, "tts-list.json"), JSON.stringify(tts, null, 0));
const have = new Set(fs.existsSync(path.join(OUT, "audio")) ? fs.readdirSync(path.join(OUT, "audio")).map(f => f.replace(".mp3", "")) : []);
console.log("tuần", data.length, "· từ khoá", data.reduce((a, L) => a + L.k.length, 0), "· từ ôn", data.reduce((a, L) => a + L.r.length, 0), "· câu", data.reduce((a, L) => a + L.q.reduce((b, x) => b + x.s.length, 0), 0), "· âm thanh", Object.keys(tts).length, "· còn thiếu", Object.keys(tts).filter(h => !have.has(h)).length);
