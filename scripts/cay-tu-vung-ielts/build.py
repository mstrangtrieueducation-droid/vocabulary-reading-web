import json,re,sys,glob,os
sys.path.insert(0,'../vocab2')
H='/tmp/claude-0/-home-claude/8b58f47d-80a0-559a-a6bb-5d1f43873c47/scratchpad/'
src={(x['t'],x['p']):x for x in json.load(open(H+'vocab2/source.json'))}
ALIAS={'grind':'ground','criterion':'criteria','utilise':'utilize','stimulus':'stimuli'}
def stem(t):
    t=t.lower()
    if len(t)>3 and t[-1] in 'ey': t=t[:-1]
    return t
def pattern(w):
    w=ALIAS.get(w,w)
    base=re.split(r'\s*[/(]',w)[0].strip().lower()
    base=re.sub(r'^(be|sb|sth)\s+','',base)
    toks=[t for t in re.split(r'\s+',base) if t and t not in ('sb','sth',"sb's")]
    parts=[]
    for t in toks:
        if t in ('its','the','of','to','on','with','from','for','down','up','out','in','at','a','and','by'): parts.append(re.escape(t))
        elif '-' in t: parts.append(r'\-?\s?'.join(re.escape(stem(x))+r"[a-z]{0,5}" for x in t.split('-')))
        else: parts.append(re.escape(stem(t))+r"[a-z]{0,5}")
    return re.compile(r'\b'+r"(?:\W+\w+){0,2}?\W+".join(parts)+r'\b',re.I)
def sentences(text):
    text=re.sub(r'\s+',' ',text)
    return re.split(r"(?<=[.!?’”'])\s+(?=[A-Z‘“('])",text)
def example(w,t,p):
    if (t,p) not in src: return ''
    sents=sentences(src[(t,p)]['passage'])+[x for x in sentences(src[(t,p)]['questions']) if len(x)>=30]
    for alt in [w]+re.split(r'\s*[·/]\s*',w):
        alt=alt.strip()
        if not alt: continue
        rx=pattern(alt); ex=next((x for x in sents if rx.search(x)),None)
        if ex:
            if len(ex)>260:
                parts=re.split(r'(?<=[;:])\s+|\s+[–—]\s+',ex); m=[x for x in parts if rx.search(x)]
                if m and len(m[0])>=40: ex=m[0].strip().rstrip(';:')+('' if m[0].strip()[-1:] in ".?!'’”" else ' …')
            return ex if len(ex)<=320 else ''
    return ''
def slug(w): return re.sub(r'[^a-z0-9]+','-',w.lower()).strip('-')
units=[];seen={};dups=[];miss=[]
def add_unit(key,t,p,label,title,lines):
    u={'key':key,'t':t,'p':p,'label':label,'title':title,'words':[]}
    for line in lines:
        c=[x.strip() for x in line.split('|')]; assert len(c)==6,(key,line)
        w,pos,ipa,vi,fam,col=c; k=w.lower()
        if k in seen: dups.append(f'{key}: {w} (đã có ở {seen[k]})'); continue
        seen[k]=key; ex=example(w,t,p)
        if t>=2 and not ex: miss.append(f'{key}: {w}')
        u['words'].append({'id':slug(w),'w':w,'pos':pos,'ipa':ipa,'vi':vi,'fam':'' if fam=='—' else fam,'col':col,'ex':ex})
    units.append(u)
for f in ['list1.txt','list2.txt']:
    cur=None;buf=[]
    for line in open(f).read().strip().split('\n'):
        if line.startswith('@'):
            if cur: add_unit(*cur,buf)
            c=[x.strip() for x in line[1:].split('|')]; cur=(c[0],int(c[1]),int(c[2]),c[3],c[4]); buf=[]
        elif line.strip(): buf.append(line)
    add_unit(*cur,buf)
for t in range(7,11):
    for p in (1,2,3):
        raw=open(H+f'vocab2/lists/T{t:02d}P{p}.txt').read().split('##')[0].strip().split('\n')
        add_unit(f'R{t}P{p}',t,p,f'IELTS Reading {t} · Passage {p}',src[(t,p)]['title'],raw)
# ---- Viết: từ vựng & collocations trong bài mẫu Task 2 (buổi 27–39), xuất hiện ≥2 lần ----
wr=[]
for line in open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'writing.txt')).read().strip().split('\n'):
    c=[x.strip() for x in line.split('|')]; assert len(c)==6,line
    w,pos,ipa,vi,fam,col=c; k=w.lower()
    if k in seen: dups.append(f'W: {w} (đã có ở {seen[k]})'); continue
    seen[k]='W'; wr.append({'id':slug(w),'w':w,'pos':pos,'ipa':ipa,'vi':vi,'fam':'' if fam=='—' else fam,'col':col,'ex':''})
rd=[w for u in units for w in u['words']]
# trộn đều: cứ khoảng 2–3 từ Đọc thì 1 từ Viết, giữ thứ tự từng danh sách
allw=[];j=0
for i,w in enumerate(rd):
    allw.append(w)
    while j<len(wr) and (j+1)*len(rd)<=(i+1)*len(wr): allw.append(wr[j]); j+=1
allw+=wr[j:]
K=max(1,round(len(allw)/50)); cut=[round(i*len(allw)/K) for i in range(K+1)]
units=[{'key':f'C{n+1}','label':f'Chặng {n+1}','words':allw[cut[n]:cut[n+1]]} for n in range(K)]
ids=[w['id'] for u in units for w in u['words']]; assert len(ids)==len(set(ids)),[x for x in ids if ids.count(x)>1][:5]
json.dump(units,open('tree.json','w'),ensure_ascii=False,indent=0)
print('units',len(units),'words',len(ids)); print('DUPS',len(dups),*dups,sep='\n'); print('NO EX',len(miss),*miss,sep='\n')
print([len(u['words']) for u in units])
