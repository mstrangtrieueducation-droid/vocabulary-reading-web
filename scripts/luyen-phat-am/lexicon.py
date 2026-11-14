"""Từ điển phát âm (Anh–Anh) cho phần TÔ MÀU ÂM KHÓ của khoá Luyện phát âm IELTS.

Tạo scripts/luyen-phat-am/lexicon.json: với mỗi từ trong content.js, lưu cách đọc RP và
"chữ nào đọc âm nào" (căn chữ ↔ âm). build.mjs đọc tệp này để tô màu âm khó trong từng câu;
build.mjs KHÔNG cần espeak nên ai cũng chạy được. Chỉ chạy lại tệp này khi content.js có từ mới.

Cần: pip install phonemizer-fork espeakng-loader   (đã có sẵn nếu cài kokoro-onnx cho tts.py)
Tuỳ chọn: pip install cmudict  → đối chiếu thêm phụ âm với từ điển CMU, in ra chỗ lệch để kiểm tra.
Dùng: python3 scripts/luyen-phat-am/lexicon.py

Nguyên tắc: thà bỏ sót còn hơn tô sai. Từ nào không căn được chữ ↔ âm thì không có trong lexicon
(build.mjs sẽ không tô từ đó). Cách đọc của espeak được sửa theo RP ở FIX bên dưới, và phiên âm
từ khoá do cô viết trong content.js được dùng để đối chiếu (in ra chỗ lệch)."""
import json, os, re, subprocess, sys
import espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library(espeakng_loader.get_library_path())
EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
from phonemizer.backend import EspeakBackend

here = os.path.dirname(os.path.abspath(__file__))
content = json.loads(subprocess.run(["node", "-e", "process.stdout.write(JSON.stringify(require(process.argv[1])))", os.path.join(here, "content.js")], capture_output=True, text=True, check=True).stdout)

WORD = re.compile(r"[A-Za-zé]+(?:'[A-Za-z]+)*")
# Tên riêng / chữ cái rời: không tô (espeak đọc không đáng tin).
SKIP = {"ielts", "tet", "hanoi", "hue", "kyoto", "zalo", "pho", "ao", "dai", "t", "v", "café", "instagram", "parasite"}

# Cách đọc RP (Anh–Anh) thay cho espeak khi espeak sai hoặc theo giọng miền Bắc nước Anh.
# Viết bằng các âm của bảng TOK dưới đây, dấu ˈ ˌ đặt ngay trước nguyên âm được nhấn.
FIX = {
    # nguyên âm /ɑː/ (BATH) — espeak en-gb đọc /æ/
    "after": "ˈɑːftə", "afternoon": "ˌɑːftənˈuːn", "ask": "ˈɑːsk", "asks": "ˈɑːsks", "asked": "ˈɑːskt", "answer": "ˈɑːnsə",
    "last": "lˈɑːst", "lastly": "lˈɑːstli", "class": "klˈɑːs", "classes": "klˈɑːsɪz", "classroom": "klˈɑːsruːm", "glass": "ɡlˈɑːs", "glasses": "ɡlˈɑːsɪz",
    "grass": "ɡrˈɑːs", "past": "pˈɑːst", "pass": "pˈɑːs", "passing": "pˈɑːsɪŋ", "passed": "pˈɑːst", "path": "pˈɑːθ", "bath": "bˈɑːθ", "fast": "fˈɑːst",
    "plant": "plˈɑːnt", "plants": "plˈɑːnts", "chance": "tʃˈɑːns", "dance": "dˈɑːns", "dancing": "dˈɑːnsɪŋ", "example": "ɪɡzˈɑːmpəl", "half": "hˈɑːf",
    "rather": "rˈɑːðə", "laugh": "lˈɑːf", "laughed": "lˈɑːft", "castle": "kˈɑːsəl", "task": "tˈɑːsk", "tasks": "tˈɑːsks", "staff": "stˈɑːf", "branch": "brˈɑːntʃ",
    "podcasts": "pˈɒdkɑːsts", "podcast": "pˈɒdkɑːst", "advantage": "ədvˈɑːntɪdʒ", "demand": "dɪmˈɑːnd", "can't": "kˈɑːnt", "aunt": "ˈɑːnt", "banana": "bənˈɑːnə",
    "grasp": "ɡrˈɑːsp", "nasty": "nˈɑːsti", "master": "mˈɑːstə", "afford": "əfˈɔːd",
    # từ espeak đọc sai / sai nghĩa trong bài
    "one": "wˈʌn", "once": "wˈʌns", "ones": "wˈʌnz", "anyone": "ˈeniwʌn", "everyone": "ˈevriwʌn", "someone": "sˈʌmwʌn", "someone's": "sˈʌmwʌnz", "who've": "hˈuːv", "lives": "lˈɪvz", "live": "lˈɪv", "ielts": "ˈaɪelts",
    "upload": "ʌplˈəʊd", "download": "dˌaʊnlˈəʊd", "replay": "riːplˈeɪ", "used": "jˈuːzd", "museum": "mjuːzˈiːəm", "museums": "mjuːzˈiːəmz",
}
# Từ đọc hai cách tuỳ nghĩa. AMBIG: phụ âm cũng khác (close /s/–/z/) → không tô gì.
# AMBIG_V: chỉ nguyên âm/trọng âm khác (live /ɪ/–/aɪ/) → vẫn tô phụ âm, không tô nguyên âm ("u": 1).
AMBIG = {"close", "use", "used", "uses"}
AMBIG_V = {"read", "live", "lives", "present", "presents", "record", "records", "increase", "increased", "wind", "lead", "tear", "minute", "object", "content", "row", "bass", "perfect", "project"}

# ---- bảng âm (RP) ----
VOW = ["iː", "uː", "ɑː", "ɔː", "ɜː", "eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə", "ɪ", "e", "æ", "ʌ", "ɒ", "ʊ", "ə", "i", "u"]
CON = ["tʃ", "dʒ", "p", "b", "t", "d", "k", "g", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h", "m", "n", "ŋ", "l", "r", "w", "j", "x"]
TOK = sorted(VOW + CON, key=len, reverse=True)
NORM = [("ɡ", "g"), ("ɹ", "r"), ("ɛə", "eə"), ("ɛː", "eə"), ("ɛ", "e"), ("ɐ", "ə"), ("ᵻ", "ɪ"), ("ɚ", "ə"), ("ɾ", "t"), ("ɑ̃", "ɒ"), ("n̩", "n"), ("l̩", "l"), ("ʔ", ""), ("ː", "ː")]

def tokens(ipa, espeak=False):
    """IPA → [(âm, nhấn)] ; nhấn: 1 chính, 2 phụ, 0 không.
    espeak en-gb viết nguyên âm đôi /ɪə/ (near) là "iə" có dấu nhấn; "iə", "ɪə" không nhấn là hai âm rời (Australia, period)."""
    s = ipa.strip().replace("/", "").replace(".", "").replace(" ", "").replace("(", "").replace(")", "")
    if espeak: s = s.replace("ˈiə", "ˈ@").replace("ˌiə", "ˌ@").replace("ɪə", "ɪ|ə").replace("@", "ɪə")
    for a, b in NORM: s = s.replace(a, b)
    out, st, i = [], 0, 0
    while i < len(s):
        c = s[i]
        if c in "ˈˌ": st = 1 if c == "ˈ" else 2; i += 1; continue
        if c == "|": i += 1; continue
        # chữ "a" đứng riêng của espeak = /æ/ (aɪ, aʊ được bắt trước)
        for t in TOK + ["a"]:
            if s.startswith(t, i):
                tt = "æ" if t == "a" else t
                if tt in VOW: out.append((tt, st)); st = 0
                else: out.append((tt, 0))
                i += len(t); break
        else:
            raise ValueError("âm lạ %r trong %r" % (c, ipa))
    return out

# ---- căn chữ ↔ âm ----
V1 = [[v] for v in VOW]
YU = [["j", "uː"], ["j", "ʊ"], ["j", "ʊə"], ["j", "u"], ["j", "ə"]]
G = {}  # chữ → [(các âm, chi phí)]
def add(gs, seqs, cost=1.0):
    for g in gs.split():
        for q in seqs: G.setdefault(g, []).append((tuple(q), cost))
for l in "aeiouy": add(l, V1)
add("e", [[]], 1.4)                                          # e câm (make, these)
for l in "aiou": add(l, [[]], 1.9)                          # chữ nguyên âm câm khác (business, chocolate)
add("u", YU); add("o", [["w", "ʌ"]]); add("y", [["j"]])
DIG = {"ai": "eɪ e ə ɪ eə", "ay": "eɪ e i ɪ", "au": "ɔː ɒ ɑː", "aw": "ɔː", "ea": "iː e ɪə eɪ ɜː ɑː eə ə i", "ee": "iː ɪə i",
       "ei": "eɪ iː aɪ e eə", "ey": "eɪ iː i ɪ", "eo": "iː e", "ew": "uː əʊ", "ie": "iː aɪ e ɪə i ɪ", "oa": "əʊ ɔː",
       "oe": "əʊ uː ʌ", "oi": "ɔɪ", "oo": "uː ʊ ʌ ɔː", "ou": "aʊ ʌ uː ʊ ɔː əʊ ə", "ow": "aʊ əʊ ə", "oy": "ɔɪ",
       "ue": "uː", "ui": "uː ɪ", "uy": "aɪ", "eau": "əʊ", "ye": "aɪ"}
for g, vs in DIG.items(): add(g, [[v] for v in vs.split()])
add("ew eu ue eau iew", YU)
add("are ere ire ore ure air ear eer our oor", V1)       # nguyên âm + r câm (there, more, care)
add("io", [["ə"]]); add("i", [["j"]])
add("b", [["b"], []], 1.0); add("bb", [["b"]])
add("c", [["k"], ["s"], ["ʃ"]]); add("cc", [["k"], ["k", "s"]]); add("ck", [["k"]]); add("ch", [["tʃ"], ["k"], ["ʃ"]]); add("tch", [["tʃ"]]); add("sc", [["s"]]); add("sch", [["s", "k"]])
add("d", [["d"], ["dʒ"]]); add("dd", [["d"]]); add("dg", [["dʒ"]]); add("ed", [["t"], ["d"], ["ɪ", "d"]], 1.2)
add("f", [["f"], ["v"]]); add("ff", [["f"]]); add("ph", [["f"]]); add("gh", [[], ["f"], ["g"]])
add("g", [["g"], ["dʒ"], ["ʒ"]]); add("gg", [["g"]]); add("gn", [["n"]]); add("gu", [["g"], ["g", "w"]])
add("h", [["h"]]); add("h", [[]], 1.6); add("wh", [["w"], ["h"]])
add("j", [["dʒ"]]); add("k", [["k"]]); add("kn", [["n"]])
add("l", [["l"]]); add("l", [[]], 1.6); add("ll", [["l"]]); add("l", [["ə", "l"]], 1.5); add("le", [["ə", "l"]])
add("m", [["m"]]); add("mm", [["m"]]); add("mb", [["m"]]); add("mn", [["m"]]); add("m", [["ə", "m"]], 1.5)
add("n", [["n"], ["ŋ"]]); add("nn", [["n"]]); add("ng", [["ŋ"], ["ŋ", "g"]]); add("n", [["ə", "n"]], 1.5)
add("p", [["p"]]); add("p", [[]], 1.6); add("pp", [["p"]])
add("qu", [["k", "w"], ["k"]]); add("q", [["k"]])
add("r", [["r"]]); add("r", [[]], 1.2); add("r", [["ə"]], 1.3); add("rr", [["r"]]); add("wr", [["r"]]); add("rh", [["r"]])
add("s", [["s"], ["z"], ["ʃ"], ["ʒ"]]); add("s", [[]], 1.6); add("ss", [["s"], ["ʃ"], ["z"]]); add("sh", [["ʃ"]]); add("si", [["ʒ"], ["ʃ"]]); add("ssi", [["ʃ"]])
add("t", [["t"], ["tʃ"]]); add("t", [[]], 1.6); add("tt", [["t"]]); add("th", [["θ"], ["ð"], ["t"]]); add("ti", [["ʃ"], ["tʃ"]]); add("ci", [["ʃ"]])
add("v", [["v"]]); add("w", [["w"]]); add("w", [[]], 1.6)
add("xc", [["k", "s"]]); add("x", [["k", "s"], ["g", "z"], ["z"], ["k", "ʃ"]]); add("z", [["z"]]); add("zz", [["z"], ["t", "s"]])
add("é", [["eɪ"]])
MAXG = max(len(g) for g in G)

def align(word, toks):
    """Trả về (các đoạn [(i0, i1, (âm…))], số cách căn tốt nhất) hoặc (None, 0)."""
    ph = tuple(t for t, _ in toks); n, m = len(word), len(ph)
    INF = float("inf"); best = {(0, 0): (0.0, 1, None)}
    order = sorted([(i, j) for i in range(n + 1) for j in range(m + 1)])
    for (i, j) in order:
        if (i, j) not in best: continue
        c0, cnt, _ = best[(i, j)]
        for L in range(1, MAXG + 1):
            g = word[i:i + L]
            if len(g) < L or g not in G: continue
            for seq, cost in G[g]:
                k = len(seq)
                if ph[j:j + k] != seq: continue
                key, c = (i + L, j + k), c0 + cost
                old = best.get(key)
                if old is None or c < old[0] - 1e-9: best[key] = (c, cnt, (i, j, seq))
                elif abs(c - old[0]) < 1e-9: best[key] = (old[0], old[1] + cnt, old[2])
    if (n, m) not in best: return None, 0
    segs, key = [], (n, m)
    while key != (0, 0):
        _, _, (i, j, seq) = best[key]; segs.append((i, key[0], seq)); key = (i, j)
    return segs[::-1], best[(n, m)][1]

# ---- gom từ ----
words = {}
def take(text):
    for w in WORD.findall(text.replace("’", "'")):
        lw = w.lower()
        if lw not in SKIP: words[lw] = words.get(lw, 0) + 1
key_ipa = {}
for L in content:
    for t, ipa, _ in L["k"]:
        take(t)
        if re.fullmatch(r"[A-Za-z]+", t): key_ipa[t.lower()] = ipa
    for q, ss in L["q"]:
        for s in ss: take(s)

# gốc từ để nhận ra đuôi -s / -ed
def stems(w):
    out = []
    if w.endswith("'s"): out.append(("s", w[:-2], 2))
    elif w.endswith("s") and not w.endswith("ss") and not w.endswith("us") and not w.endswith("is"):
        out.append(("s", w[:-1], 1))
        if w.endswith("es"): out.append(("s", w[:-2], 2))
        if w.endswith("ies"): out.append(("s", w[:-3] + "y", 1))
    if w.endswith("ed"):
        out += [("ed", w[:-2], 2), ("ed", w[:-1], 2)]
        if len(w) > 4 and w[-3] == w[-4]: out.append(("ed", w[:-3], 2))
        if w.endswith("ied"): out.append(("ed", w[:-3] + "y", 2))
    return [x for x in out if len(x[1]) >= 2]
NOT_ENDING = {"feed", "speed", "seed", "indeed", "upstairs", "downstairs", "its", "his", "hers", "ours", "yours", "theirs", "this", "is", "was", "has", "does", "as", "us", "yes", "plus", "always", "news", "lens", "series", "bus", "need", "used", "hundred", "bed", "red", "naked", "wicked", "sometimes", "perhaps", "towards", "afterwards", "nowadays", "ages",
              "it's", "that's", "there's", "what's", "he's", "she's", "who's", "here's", "where's", "let's", "how's"}

be = EspeakBackend("en-gb", with_stress=True, language_switch="remove-flags")
need = sorted(set(words) | {s for w in words for _, s, _ in stems(w)})
raw = dict(zip(need, be.phonemize([w.replace("'", "'") for w in need], strip=True)))
def pron(w): return FIX.get(w, raw.get(w, ""))
def ptoks(w): return tokens(pron(w), espeak=w not in FIX)

def flat(toks): return " ".join(t for t, _ in toks)

lex, fails, multi = {}, [], []
for w in sorted(words):
    if w in AMBIG: continue
    try: toks = ptoks(w)
    except ValueError as e: fails.append(str(e)); continue
    if not toks: continue
    letters = w.replace("'", "")
    segs, cnt = align(letters, toks)
    if not segs: fails.append("không căn được: %s /%s/" % (w, flat(toks))); continue
    if cnt > 1: multi.append(w)
    # nhấn: gắn với đoạn chứa nguyên âm
    st = [s for _, s in toks]; j = 0; out = []
    for i0, i1, seq in segs:
        k = len(seq); s = max(st[j:j + k]) if k else 0; j += k
        out.append([i0, i1, " ".join(seq), s])
    e = None
    if w not in NOT_ENDING:
        for kind, stem, nl in stems(w):
            if stem not in raw and stem not in FIX: continue
            try: sp = flat(ptoks(stem))
            except ValueError: continue
            full = flat(toks)
            for suf in (["s", "z", "ɪ z"] if kind == "s" else ["t", "d", "ɪ d"]):
                if full == (sp + " " + suf).strip():
                    nl = 2 if kind == "ed" or (suf == "ɪ z" and w.endswith("es")) else 1
                    e = [kind, suf.replace(" ", ""), nl]; break
            if e: break
    lex[w] = {"a": out}
    if w in AMBIG_V: lex[w]["u"] = 1
    if e: lex[w]["e"] = e

# ---- đối chiếu với phiên âm từ khoá cô viết ----
def loose(toks):
    s = flat(toks).replace("ə l", "l").replace("ə n", "n").replace("ə m", "m")
    return s.replace("i", "ɪ").replace("ɪː", "iː").replace("u", "ʊ").replace("ʊː", "uː")
mism = []
for w, ipa in key_ipa.items():
    if w not in lex: continue
    try: a, b = loose(tokens(ipa)), loose(ptoks(w))
    except ValueError as e: mism.append(str(e)); continue
    if a != b: mism.append("%-14s cô: %-22s lexicon: %s" % (w, a, b))

# ---- đối chiếu phụ âm với CMU (nếu có) ----
cmu_diff = []
try:
    import cmudict
    C = cmudict.dict()
    A2 = {"P": "p", "B": "b", "T": "t", "D": "d", "K": "k", "G": "g", "F": "f", "V": "v", "TH": "θ", "DH": "ð", "S": "s", "Z": "z", "SH": "ʃ", "ZH": "ʒ", "HH": "h", "CH": "tʃ", "JH": "dʒ", "M": "m", "N": "n", "NG": "ŋ", "L": "l", "R": "r", "W": "w", "Y": "j"}
    for w in lex:
        if w not in C: continue
        mine = [t for t, _ in ptoks(w) if t in CON and t != "r"]
        ok = False
        for p in C[w]:
            if [A2[x] for x in p if x in A2 and x != "R"] == mine: ok = True; break
        if not ok: cmu_diff.append("%-14s RP: %-22s CMU: %s" % (w, " ".join(mine), " ".join(C[w][0])))
except ImportError:
    cmu_diff = ["(chưa cài cmudict — bỏ qua bước đối chiếu CMU)"]

json.dump(lex, open(os.path.join(here, "lexicon.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
print("từ:", len(words), "· vào lexicon:", len(lex), "· không căn được:", len(fails), "· căn được nhiều cách:", len(multi))
if "-v" in sys.argv:
    print("\n# KHÔNG CĂN ĐƯỢC\n" + "\n".join(fails))
    print("\n# NHIỀU CÁCH CĂN\n" + " ".join(multi))
    print("\n# LỆCH VỚI PHIÊN ÂM TỪ KHOÁ\n" + "\n".join(mism))
    print("\n# PHỤ ÂM LỆCH VỚI CMU\n" + "\n".join(cmu_diff))
