"""Cây từ vựng FIGHTER: data.js từ Vocabulary Foundation 1 + 2 (VF1 U01–U14, VF2 U01–U14), giữ nguyên nội dung khoá Fighter.
Mỗi chặng = 1 unit. Mục gộp nhiều từ ("respect · respectable · respectful", "department # apartment") được tách thành từng cây
khi số phần của từ và của nghĩa khớp nhau; nếu không khớp thì giữ nguyên cả mục làm 1 cây.
Chạy: python3 scripts/cay-tu-vung-fighter/build.py  (từ thư mục gốc repo)"""
import glob, json, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else '3ef8b052b433d8de39f85ec421f43a1a', 'data.js')
SEP = re.compile(r'\s+(·|#|~|><)\s+')
POSMAP = [('phrasal verb', 'phr v'), ('phrase', 'phr'), ('pattern', 'phr'), ('noun', 'n'), ('verb', 'v'), ('adjective', 'adj'), ('adverb', 'adv'), ('preposition', 'prep'), ('conjunction', 'conj')]
MARK = re.compile(r'\s*\((n|v|a|adj|adv|v,\s*n|n,\s*v|n\.phr|v\.phr|prep|conj|pron|a,\s*n|n,\s*a)\)', re.I)
MAPM = {'n': 'n', 'v': 'v', 'a': 'adj', 'adj': 'adj', 'adv': 'adv', 'n.phr': 'phr', 'v.phr': 'phr', 'prep': 'prep', 'conj': 'conj', 'pron': 'pron'}

def units():
    out = []
    for f in glob.glob(os.path.join(ROOT, '*', 'unit-data.js')):
        t = open(f, encoding='utf8').read(); m = re.match(r'\s*window\.(\w+)\s*=\s*', t)
        if not m or m.group(1) not in ('VF1_UNITS', 'VF2_UNITS'): continue
        for k, u in json.loads(t[m.end():].rstrip().rstrip(';')).items():
            out.append((m.group(1)[:3], int(k), u))
    return sorted(out, key=lambda x: (x[0], x[1]))

def pos_of(part, typ, split):
    ms = []
    for x in MARK.findall(part):
        for y in re.split(r',\s*', x.lower()): ms.append(MAPM.get(y, ''))
    ms = [x for x in ms if x]
    if ms: return ', '.join(dict.fromkeys(ms))
    if split: return ''
    t = (typ or '').lower().replace('word family', '')
    got = []
    for a, b in POSMAP:
        if a in t: got.append(b); t = t.replace(a, '')
    return got[0] if len(got) == 1 else ''

def clean(part): return re.sub(r'\s{2,}', ' ', MARK.sub('', part)).strip(' ,;')

def ipa_parts(e, parts):
    ipa = (e.get('ipa') or '').strip()
    if not ipa: return [''] * len(parts)
    if re.search(r'\w\s*/', ipa) and not ipa.startswith('/'):   # VF2: "word /ipa/ · word /ipa/"
        mp = {a.lower(): b for a, b in re.findall(r"([A-Za-z'’-]+)\s*(/[^/]+/)", ipa)}
        res = []
        for p in parts:
            ws = re.findall(r"[A-Za-z'’-]+", clean(p))
            res.append(' '.join(mp[w.lower()] for w in ws if w.lower() in mp) if ws and all(w.lower() in mp for w in ws) and len(ws) <= 2 else (mp.get(ws[0].lower(), '') if len(ws) == 1 else ''))
        return res
    body = ipa.strip('/').split()
    if ipa.strip('/').lower().replace(' ', '') == re.sub(r'[^a-z]', '', e['term'].lower()): return [''] * len(parts)   # "/heatwave/" = chưa có IPA
    counts = [len(re.findall(r"[A-Za-z'’]+", re.sub(r'\(([a-z]+)\)', r'\1', clean(p)).replace('…', ' '))) for p in parts]
    if sum(counts) != len(body): return [ipa if len(parts) == 1 else ''] + [''] * (len(parts) - 1)
    res, i = [], 0
    for c in counts: res.append('/' + ' '.join(body[i:i + c]) + '/'); i += c
    return res

def main():
    U, seen, total = [], set(), 0
    for book, k, u in units():
        words = []
        for e in u['entries']:
            term = e['term']; src = e.get('sourceTerm') or term
            tp = SEP.split(term); mp = SEP.split(e.get('meaning') or '')
            tparts = tp[0::2]; mparts = mp[0::2]
            fam = src if len(tparts) > 1 else ''
            sparts = SEP.split(src)[0::2]
            if len(sparts) != len(tparts): sparts = tparts
            if len(tparts) > 1 and len(mparts) == len(tparts):
                ips = ipa_parts(e, tparts)
                items = [(tparts[i], mparts[i], ips[i], sparts[i]) for i in range(len(tparts))]
            else:
                ips = ipa_parts(e, [term])
                items = [(term if len(tparts) > 1 else tparts[0], e.get('meaning') or '', ips[0], src if len(tparts) > 1 else sparts[0])]
            for j, (t, m, ip, sp) in enumerate(items):
                w = clean(t)
                if not w: continue
                wid = '%s-%d%s' % (book.lower(), e['number'], '' if len(items) == 1 else chr(97 + j))
                key = (w.lower(), m.strip())
                if key in seen: continue
                seen.add(key)
                x = {'id': wid, 'w': w, 'pos': pos_of(sp, e.get('type'), len(items) > 1), 'ipa': ip, 'vi': re.sub(r'^\s*-\s*', '', m.strip()).replace(' · - ', ' · ')}
                if fam: x['fam'] = fam
                if e.get('example'): x['ex'] = e['example']
                words.append({a: b for a, b in x.items() if b})
        total += len(words)
        U.append({'key': '%s-U%02d' % (book, k), 'label': '%s · Unit %d · %s' % (book, k, u['title'].title().replace('&', '&')), 'words': words})
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf8') as f:
        f.write('/* Cây từ vựng FIGHTER — Vocabulary Foundation 1 + 2 (%d cây, %d chặng = %d unit). Sinh bởi scripts/cay-tu-vung-fighter/build.py — không sửa tay. */\n' % (total, len(U), len(U)))
        f.write('window.RT_UNITS = ' + json.dumps(U, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(total, len(U), OUT)

main()
