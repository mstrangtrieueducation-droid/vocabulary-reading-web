// TÔ MÀU ÂM KHÓ trong từ khoá và câu luyện. build.mjs gọi marksFor() cho từng câu.
// Dữ liệu cách đọc lấy từ lexicon.json (RP, đã căn chữ ↔ âm — xem lexicon.py). Nguyên tắc: thà bỏ sót còn hơn tô sai:
//  - chỉ tô khi từ có trong lexicon và chữ được căn đúng với âm (vd. "th" trong "Thomas" là /t/ nên không tô);
//  - không tô từ chức năng (a, the, is, can…) trừ âm th; không tô nguyên âm ở âm tiết không nhấn (trừ tuần /ə/);
//  - không tô nguyên âm của từ đọc hai cách (live, read…); không tô tên riêng.
// Mỗi dấu tô: [đầu, cuối, khoá âm, 1 = âm trọng tâm của tuần | 0 = âm khó chung].
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const LEX = require("./lexicon.json");

// c: màu (end = đỏ cam, th = tím, dh = chàm, a = xanh ngọc, b = hổ phách, g = xanh lá)
export const SOUNDS = {
  "end-t": { ipa: "/t/", n: "âm cuối", c: "end", tip: "Chạm đầu lưỡi vào lợi sau răng trên, chặn hơi rồi bật nhẹ. Đừng nuốt mất âm." },
  "end-d": { ipa: "/d/", n: "âm cuối", c: "end", tip: "Lưỡi chạm lợi trên, rung cổ, bật thật nhẹ. Không đọc thành /t/, không thêm “ờ”." },
  "end-k": { ipa: "/k/", n: "âm cuối", c: "end", tip: "Cuống lưỡi chặn hơi ở vòm mềm rồi bật nhẹ. Phải nghe thấy tiếng bật." },
  "end-p": { ipa: "/p/", n: "âm cuối", c: "end", tip: "Mím hai môi chặn hơi rồi mở ra bật nhẹ. Không rung cổ." },
  "end-l": { ipa: "/l/", n: "âm cuối", c: "end", tip: "Đầu lưỡi chạm lợi trên và giữ ở đó. Không đọc thành “u” hay “n”." },
  "end-n": { ipa: "/n/", n: "âm cuối", c: "end", tip: "Đầu lưỡi chạm lợi trên, ngân qua mũi: “nnn”." },
  "end-ŋ": { ipa: "/ŋ/", n: "âm cuối", c: "end", tip: "Cuống lưỡi chạm vòm mềm, ngân qua mũi. Không bật thêm “g”, không đọc thành /n/." },
  "s-s": { ipa: "/s/", n: "đuôi -s", c: "end", tip: "Sau âm vô thanh /p t k f θ/: xì nhẹ /s/ ở cuối, đừng bỏ." },
  "s-z": { ipa: "/z/", n: "đuôi -s", c: "end", tip: "Sau âm hữu thanh và nguyên âm: rung cổ /z/ ở cuối, đừng bỏ." },
  "s-ɪz": { ipa: "/ɪz/", n: "đuôi -es", c: "end", tip: "Sau /s z ʃ tʃ dʒ/: thêm một âm tiết /ɪz/." },
  "ed-t": { ipa: "/t/", n: "đuôi -ed", c: "end", tip: "Sau âm vô thanh: chỉ bật /t/ thật nhẹ, KHÔNG thêm âm tiết." },
  "ed-d": { ipa: "/d/", n: "đuôi -ed", c: "end", tip: "Sau âm hữu thanh và nguyên âm: /d/ nhẹ, KHÔNG thêm âm tiết." },
  "ed-ɪd": { ipa: "/ɪd/", n: "đuôi -ed", c: "end", tip: "Chỉ sau /t/ và /d/: thêm một âm tiết /ɪd/." },
  th: { ipa: "/θ/", n: "th vô thanh", c: "th", tip: "Đặt đầu lưỡi giữa hai răng, thổi hơi ra, không rung cổ. Không đọc thành /t/ hay /s/." },
  dh: { ipa: "/ð/", n: "th hữu thanh", c: "dh", tip: "Đặt đầu lưỡi giữa hai răng và rung cổ. Không đọc thành /d/ hay /z/." },
  sh: { ipa: "/ʃ/", n: "âm “sh”", c: "a", tip: "Chu tròn môi, lưỡi lùi về sau, xì hơi “sh”. Khác /s/." },
  s: { ipa: "/s/", n: "âm “s”", c: "b", tip: "Môi không chu, đầu lưỡi gần lợi trên, xì hơi thẳng. Không đọc thành /ʃ/." },
  ch: { ipa: "/tʃ/", n: "âm “ch”", c: "a", tip: "Chặn hơi rồi bật mạnh “ch”, môi hơi chu. Không rung cổ." },
  dj: { ipa: "/dʒ/", n: "âm “j”", c: "b", tip: "Như /tʃ/ nhưng rung cổ. Không đọc thành “z” hay “gi”." },
  z: { ipa: "/z/", n: "âm “z”", c: "a", tip: "Đặt lưỡi như /s/ nhưng rung cổ: “zzz”. Đặt tay lên cổ thấy rung." },
  v: { ipa: "/v/", n: "âm “v”", c: "a", tip: "Răng trên chạm nhẹ môi dưới, rung cổ. Không tròn môi như /w/." },
  w: { ipa: "/w/", n: "âm “w”", c: "b", tip: "Chu tròn môi rồi mở nhanh. Răng không chạm môi." },
  r: { ipa: "/r/", n: "âm “r”", c: "a", tip: "Cong lưỡi về sau, không chạm vòm, môi hơi tròn. Không rung lưỡi, không đọc thành /z/." },
  l: { ipa: "/l/", n: "âm “l”", c: "b", tip: "Đầu lưỡi chạm lợi trên. Không đọc thành /n/ hay /r/." },
  p: { ipa: "/p/", n: "âm đầu “p”", c: "a", tip: "Mím môi rồi bật mạnh, có luồng hơi phụt ra. Không đọc thành /b/." },
  b: { ipa: "/b/", n: "âm đầu “b”", c: "b", tip: "Mím môi, rung cổ, bật nhẹ, không phụt hơi." },
  "cl-i": { ipa: "cụm", n: "cụm phụ âm đầu", c: "a", tip: "Đọc dính liền các phụ âm, không chêm “ờ” vào giữa, không bỏ bớt âm." },
  "cl-f": { ipa: "cụm", n: "cụm phụ âm cuối", c: "a", tip: "Đọc đủ từng phụ âm cuối, nối liền nhau, không bỏ bớt." },
  ih: { ipa: "/ɪ/", n: "i ngắn", c: "a", tip: "Ngắn, gọn, miệng thả lỏng, hơi ngả về “ê”." },
  iy: { ipa: "/iː/", n: "i dài", c: "b", tip: "Kéo dài, môi căng sang hai bên như cười." },
  ae: { ipa: "/æ/", n: "a bẹt", c: "a", tip: "Há miệng rộng, hạ hàm: âm giữa “a” và “e”." },
  e: { ipa: "/e/", n: "e ngắn", c: "b", tip: "Miệng mở vừa, ngắn, giống “e” tiếng Việt." },
  uh: { ipa: "/ʌ/", n: "ă ngắn", c: "a", tip: "Ngắn, miệng mở vừa, gần “ă”." },
  aa: { ipa: "/ɑː/", n: "a dài", c: "b", tip: "Há miệng rộng, lưỡi hạ thấp, kéo dài “aaa”." },
  uu: { ipa: "/ʊ/", n: "u ngắn", c: "a", tip: "Ngắn, môi tròn nhẹ, không kéo dài." },
  uw: { ipa: "/uː/", n: "u dài", c: "b", tip: "Kéo dài, môi chu tròn ra trước." },
  o: { ipa: "/ɒ/", n: "o ngắn", c: "a", tip: "Ngắn, há miệng, môi hơi tròn." },
  oo: { ipa: "/ɔː/", n: "o dài", c: "b", tip: "Kéo dài, môi tròn: “o…”." },
  schwa: { ipa: "/ə/", n: "ơ nhẹ (schwa)", c: "a", tip: "“ơ” rất nhẹ và ngắn, không nhấn. Đừng đọc rõ thành “a”, “o”." },
  ei: { ipa: "/eɪ/", n: "nguyên âm đôi", c: "a", tip: "Trượt từ “ê” sang “i”, âm đầu dài hơn." },
  ai: { ipa: "/aɪ/", n: "nguyên âm đôi", c: "b", tip: "Trượt từ “a” lên “i”, âm đầu dài hơn." },
  oi: { ipa: "/ɔɪ/", n: "nguyên âm đôi", c: "g", tip: "Trượt từ “o” sang “i”." },
  ou: { ipa: "/əʊ/", n: "nguyên âm đôi", c: "a", tip: "Trượt từ “ơ” sang “u”. Không đọc thành “ô” đứng yên." },
  au: { ipa: "/aʊ/", n: "nguyên âm đôi", c: "b", tip: "Trượt từ “a” sang “u”." }
};
const VOWEL = { "ɪ": "ih", "iː": "iy", "æ": "ae", e: "e", "ʌ": "uh", "ɑː": "aa", "ʊ": "uu", "uː": "uw", "ɒ": "o", "ɔː": "oo", "ə": "schwa", "eɪ": "ei", "aɪ": "ai", "ɔɪ": "oi", "əʊ": "ou", "aʊ": "au" };
const VOWELS = new Set(["ɪ", "iː", "e", "æ", "ʌ", "ɑː", "ɒ", "ɔː", "ʊ", "uː", "ɜː", "ə", "i", "u", "eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə"]);
const SHORT = new Set(["ɪ", "e", "æ", "ʌ", "ʊ", "ɒ"]);
const CONS1 = { "ʃ": "sh", s: "s", "tʃ": "ch", "dʒ": "dj", z: "z", v: "v", w: "w", r: "r", l: "l" };
const FINAL = new Set(["t", "d", "k", "p", "l", "n", "ŋ"]);

// Âm khó chung (tô nhẹ ở mọi tuần): th và đuôi -s, -ed.
const COMMON = ["th", "dh", "s-s", "s-z", "s-ɪz", "ed-t", "ed-d", "ed-ɪd"];
// Âm trọng tâm của từng tuần (tô đậm). Tuần 27–48 và 50 luyện trọng âm, nối âm, ngữ điệu → chỉ tô âm khó chung.
export const FOCUS = {
  1: ["ed-t", "end-t"], 2: ["ed-d", "end-d"], 3: ["end-k"], 4: ["end-p"], 5: ["s-s", "s-z", "s-ɪz"], 6: ["ed-t", "ed-d", "ed-ɪd"], 7: ["end-l"], 8: ["end-n", "end-ŋ"],
  9: ["th"], 10: ["dh"], 11: ["sh", "s"], 12: ["ch", "dj"], 13: ["z", "s-z"], 14: ["v", "w"], 15: ["r", "l"], 16: ["p", "b"], 17: ["cl-i"], 18: ["cl-f"],
  19: ["ih", "iy"], 20: ["ae", "e"], 21: ["uh", "aa"], 22: ["uu", "uw"], 23: ["o", "oo"], 24: ["schwa"], 25: ["ei", "ai", "oi"], 26: ["ou", "au"],
  49: ["s-s", "s-z", "s-ɪz", "ed-t", "ed-d", "ed-ɪd", "th", "dh", "sh", "ch", "dj", "z", "v"]
};
// Từ chức năng: không tô (trừ âm th) — đọc nhẹ trong câu, tô vào chỉ rối mắt.
const FUNC = new Set(("a an the and but or nor if of to in on at for from with by as than then that this these those there their theirs they them " +
  "he him his she her hers it its we us our ours you your yours i me my mine is am are was were be been being have has had do does did " +
  "can could will would shall should may might must so no what when who whom whose which where why how all some any each " +
  "i'm i've i'd i'll it's they've they're they'd they'll we're we've we'd we'll you're you've you'd you'll he's she's that's there's what's who's who've let's here's").split(" "));
// Tên riêng, chữ cái rời: không tô (lexicon.py cũng bỏ qua).
// close, use, used: hai cách đọc khác cả phụ âm (/s/–/z/) nên cũng không tô.
export const SKIP = new Set("ielts tet hanoi hue kyoto zalo pho ao dai t v café instagram parasite close use used uses".split(" "));
export const WORD = /[A-Za-zé]+(?:['’][A-Za-z]+)*/g;

const missing = new Set();
export const missingWords = () => [...missing].sort();

function wordMarks(token, week) {
  const lw = token.toLowerCase().replace(/’/g, "'");
  if (SKIP.has(lw)) return [];
  const E = LEX[lw];
  if (!E) { missing.add(lw); return []; }
  const focus = FOCUS[week] || [], want = new Set(focus.concat(COMMON)), fn = FUNC.has(lw);
  const segs = E.a.map(([a, b, p, s]) => ({ a, b, t: p ? p.split(" ") : [], s }));
  const sounding = segs.filter(x => x.t.length);
  const nsyl = segs.reduce((n, x) => n + x.t.filter(t => VOWELS.has(t)).length, 0);
  const letters = lw.replace(/'/g, "");
  const C = [];  // [a, b, key] theo vị trí chữ (không tính dấu ')
  const add = (a, b, k) => { if (want.has(k)) C.push([a, b, k]); };
  // đuôi -s / -ed
  if (E.e && !fn) add(letters.length - E.e[2], letters.length, E.e[0] + "-" + E.e[1]);
  segs.forEach((x, i) => {
    const one = x.t.length === 1 ? x.t[0] : null, g = letters.slice(x.a, x.b);
    if ((one === "θ" || one === "ð") && g === "th") add(x.a, x.b, one === "θ" ? "th" : "dh");
    if (fn) return;
    if (one && CONS1[one]) {
      // /l/ và /r/ và /w/ phải đúng chữ l, r, w (không tô "o" của "one" là /w/)
      if (one === "l" && !/^l+$/.test(g)) return;
      if (one === "r" && !/^(r|rr|wr)$/.test(g)) return;
      if (one === "w" && !/^(w|wh)$/.test(g)) return;
      add(x.a, x.b, CONS1[one]);
    }
    if (x.t.length === 2 && x.t[0] === "ə" && x.t[1] === "l" && g === "le") add(x.a, x.a + 1, "l");
    if (i === 0 && (one === "p" || one === "b")) add(x.a, x.b, one);
    if (E.u) return;   // từ đọc hai cách: không tô nguyên âm
    const v = one ? one : (x.t.length === 2 && x.t[0] === "j" && x.t[1] === "uː" ? "uː" : null);
    if (v && VOWEL[v]) {
      // nguyên âm ngắn chỉ tô ở âm tiết được nhấn (không nhấn thì hay bị đọc nhẹ thành /ə/, /ɪ/);
      // nguyên âm dài và nguyên âm đôi không bị đọc nhẹ nên tô cả khi không nhấn (Saturday, downtown)
      if (v === "ə") { if (nsyl >= 2 && !x.s) add(x.a, x.b, "schwa"); }
      else if (x.s || nsyl === 1 || !SHORT.has(v)) add(x.a, x.b, VOWEL[v]);
    }
  });
  if (!fn && sounding.length) {
    // âm cuối: âm cuối cùng của từ
    const last = sounding[sounding.length - 1], lt = last.t[last.t.length - 1];
    if (FINAL.has(lt)) {
      if (last.t.length === 1) add(last.a, last.b, "end-" + lt);
      else if (last.t.length === 2 && last.t[0] === "ə" && lt === "l") add(last.a, last.a + 1, "end-l");
    }
    // cụm phụ âm đầu / cuối (≥ 2 phụ âm liền nhau, không có nguyên âm xen giữa)
    const isC = x => x.t.length && x.t.every(t => !VOWELS.has(t));
    let n = 0, j = 0;
    while (j < sounding.length && isC(sounding[j])) { n += sounding[j].t.length; j++; }
    if (n >= 2 && j > 0) add(sounding[0].a, sounding[j - 1].b, "cl-i");
    n = 0; j = sounding.length - 1;
    while (j >= 0 && isC(sounding[j])) { n += sounding[j].t.length; j--; }
    if (n >= 2 && j < sounding.length - 1) add(sounding[j + 1].a, sounding[sounding.length - 1].b, "cl-f");
  }
  // ưu tiên: âm trọng tâm (cụm dài trước, đuôi -s/-ed trước âm cuối) → âm khó chung; không chồng lên nhau
  const rank = k => (focus.includes(k) ? 0 : 10) + (k.startsWith("cl-") ? 0 : /^(s|ed)-/.test(k) ? 1 : 2);
  C.sort((p, q) => rank(p[2]) - rank(q[2]) || (q[1] - q[0]) - (p[1] - p[0]) || p[0] - q[0]);
  const out = [];
  for (const c of C) if (!out.some(o => c[0] < o[1] && o[0] < c[1])) out.push(c);
  // tuần 5, 6 luyện riêng đuôi -s, -ed: tô ba cách đọc bằng ba màu (/s/ /t/ đỏ cam, /z/ /d/ xanh ngọc, /ɪz/ /ɪd/ hổ phách)
  const VAR = { "s-s": "end", "s-z": "a", "s-ɪz": "b", "ed-t": "end", "ed-d": "a", "ed-ɪd": "b" };
  return out.map(([a, b, k]) => (week === 5 || week === 6) && VAR[k] && focus.includes(k) ? [a, b, k, 1, VAR[k]] : [a, b, k, focus.includes(k) ? 1 : 0]);
}

// Trả về các dấu tô cho một chuỗi gốc (còn dấu * ‿ / ↗ ↘), vị trí tính theo chuỗi gốc.
export function marksFor(text, week) {
  const res = [];
  for (const m of text.matchAll(WORD)) {
    const tok = m[0], idx = [];   // vị trí từng chữ cái (bỏ qua dấu ')
    for (let i = 0; i < tok.length; i++) if (!/['’]/.test(tok[i])) idx.push(i);
    for (const [a, b, k, f, c] of wordMarks(tok, week)) {
      let s = m.index + idx[a], e = m.index + idx[b - 1] + 1;
      if (/^s-/.test(k) && /['’]/.test(text[s - 1])) s--;   // tô cả dấu ' của 's
      res.push(c ? [s, e, k, f, c] : [s, e, k, f]);
    }
  }
  return res.sort((p, q) => p[0] - q[0]);
}
