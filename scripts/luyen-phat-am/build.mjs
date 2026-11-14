// Tạo <thư mục khoá>/data.js và danh sách câu cần thu giọng mẫu từ content.js.
// Dùng: node scripts/luyen-phat-am/build.mjs   (rồi python3 scripts/luyen-phat-am/tts.py để tạo mp3 còn thiếu)
// Tô màu âm khó: sounds.mjs + lexicon.json. Có từ mới trong content.js thì chạy python3 scripts/luyen-phat-am/lexicon.py trước.
// Xem các âm được tô của một tuần: node scripts/luyen-phat-am/build.mjs --show 1,2,25
import { SOUNDS, marksFor, missingWords } from "./sounds.mjs";
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
  const k = L.k.map(([t, ipa, vi]) => { if (!IPA_OK.test(ipa || "")) errs.push("W" + L.w + " IPA lỗi: " + t + " " + ipa); if (!vi) errs.push("W" + L.w + " thiếu nghĩa: " + t); return { t, ipa, vi, a: reg(t), m: marksFor(t, L.w) }; });
  if (new Set(k.map(x => x.t)).size !== k.length) errs.push("W" + L.w + " trùng từ khoá");
  const r = [];
  if (L.w >= 9) for (const back of [4, 8, 12, 16]) {   // 2 từ ôn lại từ các tuần trước
    if (r.length === 2) break;
    const P = W[L.w - 1 - back]; if (!P) continue;
    const c = P.k[L.w % P.k.length];
    if (!k.some(x => x.t === c[0]) && !r.some(x => x.t === c[0])) r.push({ t: c[0], ipa: c[1], vi: c[2], a: reg(c[0]), from: P.w, m: marksFor(c[0], P.w) });
  }
  if (L.w >= 9 && r.length !== 2) errs.push("W" + L.w + " không đủ 2 từ ôn");
  const q = L.q.map(([qq, ss]) => {
    if (ss.length < 2 || ss.length > 3) errs.push("W" + L.w + " câu trả lời phải 2–3 câu: " + qq);
    const words = clean(ss.join(" ")).split(" ").length; if (words > 45) errs.push("W" + L.w + " câu trả lời dài " + words + " từ: " + qq);
    return { q: qq, qa: reg(qq), s: ss.map(t => ({ t, a: reg(t), m: marksFor(t, L.w) })) };
  });
  return { w: L.w, code: "PRON-" + String(L.w).padStart(3, "0"), g: L.g, s: L.s, t: L.t, tv: L.tv, x: L.x, k, r, q };
});
// kiểm tra dấu tô: nằm gọn trong chữ cái, không chồng nhau, khoá âm có trong SOUNDS
const used = new Set();
const checkMarks = (t, m, where) => m.forEach(([a, b, k], i) => {
  used.add(k);
  if (!SOUNDS[k]) errs.push(where + " khoá âm lạ: " + k);
  if (!/^['’A-Za-zé]+$/.test(t.slice(a, b))) errs.push(where + " dấu tô lệch: " + t + " [" + t.slice(a, b) + "]");
  if (i && m[i - 1][1] > a) errs.push(where + " dấu tô chồng nhau: " + t);
});
data.forEach(L => { L.k.concat(L.r).forEach(x => checkMarks(x.t, x.m, "W" + L.w)); L.q.forEach(q => q.s.forEach(x => checkMarks(x.t, x.m, "W" + L.w))); });
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
const S = {}; Object.keys(SOUNDS).filter(k => used.has(k)).forEach(k => S[k] = SOUNDS[k]);
fs.writeFileSync(path.join(OUT, "data.js"), "/* Tạo tự động từ scripts/luyen-phat-am/content.js (+ sounds.mjs, lexicon.json) — đừng sửa tay. */\nwindow.PA_SOUNDS=" + JSON.stringify(S) + ";\nwindow.PA_DATA=" + JSON.stringify(data) + ";\n");
const miss = missingWords(); if (miss.length) console.log("Chưa có trong lexicon.json (không tô màu) — chạy lexicon.py:", miss.join(", "));
const show = process.argv.indexOf("--show");
if (show > 0) {
  const ws = (process.argv[show + 1] || "").split(",").map(Number);
  const br = (t, m) => { let o = "", p = 0; m.forEach(([a, b, k, f]) => { o += t.slice(p, a) + (f ? "[" : "{") + t.slice(a, b) + (f ? "]" : "}") + (f ? "" : "") + "₍" + k + "₎"; p = b; }); return o + t.slice(p); };
  data.filter(L => ws.includes(L.w)).forEach(L => { console.log("\n== Tuần " + L.w + " · " + L.s + "   [đậm] = trọng tâm, {nhẹ} = âm khó chung"); L.k.concat(L.r).forEach(x => console.log("  K  " + br(x.t, x.m))); L.q.forEach(q => q.s.forEach(x => console.log("  •  " + br(x.t, x.m)))); });
}
fs.writeFileSync(path.join(here, "tts-list.json"), JSON.stringify(tts, null, 0));
const have = new Set(fs.existsSync(path.join(OUT, "audio")) ? fs.readdirSync(path.join(OUT, "audio")).map(f => f.replace(".mp3", "")) : []);
console.log("tuần", data.length, "· từ khoá", data.reduce((a, L) => a + L.k.length, 0), "· từ ôn", data.reduce((a, L) => a + L.r.length, 0), "· câu", data.reduce((a, L) => a + L.q.reduce((b, x) => b + x.s.length, 0), 0), "· âm thanh", Object.keys(tts).length, "· còn thiếu", Object.keys(tts).filter(h => !have.has(h)).length);
