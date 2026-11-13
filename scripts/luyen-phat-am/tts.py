"""Tạo giọng mẫu (Anh–Anh) cho khoá Luyện phát âm IELTS bằng Kokoro (chạy máy, không cần khoá API).
Cần: pip install kokoro-onnx soundfile; ffmpeg; 2 tệp kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx, mục Releases).
Dùng: python3 tts.py <thư mục chứa 2 tệp mô hình>   — chỉ tạo các tệp còn thiếu."""
import json, os, re, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "..", "bd0dce6f2a3925450d119b2133aea9db", "audio")
mdir = sys.argv[1] if len(sys.argv) > 1 else "."
k = Kokoro(os.path.join(mdir, "kokoro-v1.0.onnx"), os.path.join(mdir, "voices-v1.0.bin"))
items = json.load(open(os.path.join(here, "tts-list.json"), encoding="utf-8"))
os.makedirs(out, exist_ok=True)
# Chỉnh phiên âm của espeak cho đúng giọng Anh chuẩn (RP) và đúng nội dung bài dạy:
B = r"(?<!\S)"   # đầu từ
FIX = [
    # dạng yếu của từ chức năng khi đứng giữa câu
    (B + r"ɒv", "əv"), (B + r"and(?=\s)", "ənd"), (B + r"at(?=\s)", "ət"), (B + r"kan(?=\s)", "kən"), (B + r"w[ɒʌ]z(?=\s|ɐ|ð)", "wəz"),
    (B + r"fɔː(ɹ?)(?=\s)", r"fə\1"), (B + r"az(?=\s)", "əz"), (r"ðˌɛm", "ðəm"), (B + r"wɜː(ɹ?)(?=\s)", r"wə\1"), (B + r"fɹɒm(?=\s)", "fɹəm"), (B + r"sˌʌm(?=\s)", "səm"),
    (r"(wˌ\S+) dˈuː juː", r"\1 də juː"),
    # nguyên âm /ɑː/ trong last, ask, after, class, grass… (espeak đọc kiểu miền Bắc nước Anh)
    (r"aft", "ɑːft"), (r"ask", "ɑːsk"), (r"ˈansə", "ˈɑːnsə"), (r"tʃˈans", "tʃˈɑːns"), (r"klˈas(?!ɪk)", "klˈɑːs"), (r"ɡlˈas", "ɡlˈɑːs"), (r"ɡɹˈas", "ɡɹˈɑːs"),
    (r"(?<!p)lˈast", "lˈɑːst"), (B + r"pˈas(?=[\s,.?!]|$|t(?=[\s,.?!]|$)|ɪŋ)", "pˈɑːs"), (r"plˈant", "plˈɑːnt"), (r"kasts", "kɑːsts"),
    # từ đọc sai / sai trọng âm
    (r"lˈaɪvz", "lˈɪvz"), (r"ˈiːlts", "ˈaɪɛlts"), (r"hjˈuː(?=[\s,.?!]|$)", "hwˈeɪ"), (r"ˈʌpləʊd", "ʌplˈəʊd"), (r"dˈaʊnləʊd", "dˌaʊnlˈəʊd"), (r"ɹˈiːpleɪ", "ɹiːplˈeɪ"), (r"kaɪˈəʊtəʊ", "kiˈəʊtəʊ"),
    # nuốt /t/, /d/ giữa hai phụ âm (tuần 40)
    (r"nˈɛkst d", "nˈɛks d"), (r"lˈɑːst n", "lˈɑːs n"), (r"mˈʌst b", "mˈʌs b"), (r"dʒˈʌst n", "dʒˈʌs n"), (r"ˈəʊld m", "ˈəʊl m"), (r"dˈəʊnt n", "dˈəʊn n"),
]
def phon(text):
    p = k.tokenizer.phonemize(text, "en-gb")
    for a, b in FIX: p = re.sub(a, b, p)
    return p
if "--show" in sys.argv:
    for h, text in items.items(): print(text, "|", phon(text))
    sys.exit()
n = 0
for h, text in items.items():
    dst = os.path.join(out, h + ".mp3")
    if os.path.exists(dst): continue
    question = text.endswith("?")
    short = len(text.split()) <= 4
    s, sr = k.create(phon(text), is_phonemes=True, voice="bm_george" if question else "bf_emma", speed=0.9 if short else 1.0, lang="en-gb")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as t: tmp = t.name
    sf.write(tmp, s, sr)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", "adelay=120,apad=pad_dur=0.2", "-ac", "1", "-ar", "24000", "-b:a", "48k", dst], check=True)
    os.unlink(tmp); n += 1
    if n % 50 == 0: print(n, flush=True)
print("xong", n)
