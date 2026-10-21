// One checked pipeline for all 39 tests; run without --write to check for drift.
// Import only a freshly verified native answer snapshot with --native-snapshot PATH.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const write=process.argv.includes('--write');
const snapshotIndex=process.argv.indexOf('--native-snapshot');
const snapshot=snapshotIndex>=0?JSON.parse(fs.readFileSync(process.argv[snapshotIndex+1],'utf8')):null;
if(snapshot&&(snapshot.length!==39||new Set(snapshot.map(t=>t.n)).size!==39))throw Error('Require all 39 verified native answer documents.');
const routes={1:{student:'fa97457ce278f90f476964841b89eb44',correction:'d7410acf3a3890aca6471be77ba75c22'},2:{student:'e89033ab50733a7997403905b7a4f467',correction:'7698699ab01270deacf705fc4c325693'},3:{student:'526b4c6c7f3932132a71e85bc2f651bd',correction:'6244b09b8d02f9a208b61f1a29a26c6a'},4:{student:'d5d87362691f486e9b798966cf29e64f',correction:'b0c35aeebf7f4144a77a4f7741a0f109'},...json('scripts/practice-05-08.routes.json'),...json('scripts/practice-09-39.routes.json')};
const escape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const planned=new Map(),vocabularies=new Map();
for(let n=1;n<=39;n++){
 const key=String(n).padStart(2,'0'),sf=`scripts/practice-test-${key}.source.json`,src=json(sf);
 if(src.answers.length!==100||src.answers.some((a,i)=>a.globalNumber!==i+1))throw Error(`Test ${n}: question sequence`);
 const native=snapshot?.find(t=>t.n===n);
 if(native){
  if(native.rows.length!==100||native.rows.some((r,i)=>r.q!==i+1))throw Error(`Test ${n}: native row sequence`);
  const expected=src.sourceTabs?.answers?.documentId||src.answerDocumentId;
  if(expected&&expected!==native.id)throw Error(`Test ${n}: native document mismatch`);
  src.answerDocumentId=native.id;
  for(const row of native.rows){
   const answer=src.answers[row.q-1];
   answer.displayAnswer=row.answer;
   answer.explanation=row.explanation;
   answer.teacherHighlights=row.red.filter(Boolean);
  }
 }
 for(const a of src.answers){
  if(!a.explanation.trim()||!a.acceptedAnswers.length)throw Error(`Test ${n}/${a.globalNumber}: empty answer`);
  if(/đáp án chính thức|khóa nguồn|đáp án cũ|hệ thống (?:nhận|chấp nhận|chưa)|cô duyệt|lựa chọn [A-D] đã sửa|đáp án mẫu/i.test(a.explanation))throw Error(`Test ${n}/${a.globalNumber}: internal editorial text`);
  if(src.explanationStyle==='student-copy-concise-v1'){
   const lines=a.explanation.split('\n').filter(Boolean);
   const vocabularyList=lines.length>=4&&lines.every(line=>line.length<120);
   if(a.explanation.length>320&&!vocabularyList)throw Error(`Test ${n}/${a.globalNumber}: explanation needs a concise editorial review`);
   if(/Câu hoàn chỉnh:|Từ vựng trọng tâm:/.test(a.explanation))throw Error(`Test ${n}/${a.globalNumber}: duplicated answer or vocabulary label`);
  }
  if(a.globalNumber>=91)for(const value of a.acceptedAnswers){
   const tokens=value.trim().split(/\s+/);
   if(tokens.length<2||tokens.length>6||!tokens.some(t=>t.toLowerCase().replace(/[.,;!?]/g,'')===a.keyword.toLowerCase()))throw Error(`Test ${n}/${a.globalNumber}: keyword/word limit`);
  }
 }
 planned.set(sf,JSON.stringify(src,null,2)+'\n');
 const studentFile=routes[n].student+'/index.html',student=read(studentFile),match=student.match(/const APP = (.*);\r?\n/);
 if(!match)throw Error(`Test ${n}: no student app`);
 const app=JSON.parse(match[1]);app.test.answers=src.answers;app.test.contentRevision=src.contentRevision;
 planned.set(studentFile,student.replace(/const APP = .*;\r?\n/,()=> 'const APP = '+JSON.stringify(app)+';\n'));
 const vf=`scripts/practice-test-${key}.vocabulary.json`,v=json(vf);
 for(const w of v.words)for(const field of ['term','meaning','note','usage','family','example','translation'])if(!w[field]?.trim())throw Error(`Test ${n}: incomplete detailed notes for ${w.term}`);
 const termKey=s=>s.toLowerCase().replace(/[‘’]/g,"'").replace(/\b(sb|someone|somebody)\b/g,'person').replace(/\b(st|sth|something)\b/g,'thing').replace(/[^a-z'-]+/g,' ').trim();
 for(const a of src.answers)for(const highlight of a.teacherHighlights||[]){
  const term=highlight.replace(/^Từ vựng trọng tâm:\s*/,'').replace(/\s*\((v|a|n|adj|adv)\)\s*$/,'').trim();
  if(!term||/[^\x00-\x7F‘’–—…]/.test(term)||termKey(term).length<3||term.length>100)continue;
  if(!v.words.some(w=>[w.term,...(w.aliases||[])].some(x=>termKey(x).includes(termKey(term))||termKey(term).includes(termKey(x)))))throw Error(`Test ${n}/${a.globalNumber}: red vocabulary absent from notes: ${term}`);
 }
 vocabularies.set(n,v);
 const correctionFile=routes[n].correction+'/index.html';let correction=read(correctionFile);
 const re=/<script id="correction-vocabulary-data" type="application\/json">([\s\S]*?)<\/script>/,old=correction.match(re);
 if(!old)throw Error(`Test ${n}: no vocabulary data`);
 const data=JSON.parse(old[1]);data.words=v.words;
 correction=correction.replace(re,()=>'<script id="correction-vocabulary-data" type="application/json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>');
 const cards=v.words.map((w,i)=>`<article class="word-card"><div class="word-index">${String(i+1).padStart(2,'0')}</div><div class="word-identity"><p class="word-meta">${escape(w.meta)}</p><h3${w.teacherSelected?' style="color:#bf1f14"':''}>${escape(w.term)}</h3></div><div class="word-meaning"><p class="card-label">NGHĨA TIẾNG VIỆT</p><p>${escape(w.meaning)}</p></div><div class="word-detail"><p class="card-label">GIẢI THÍCH &amp; LƯU Ý</p><p>${escape(w.note)}</p></div></article>`).join('');
 const start=correction.indexOf('<div class="word-list">'),end=correction.indexOf('</div></section>',start);
 if(start<0||end<0)throw Error(`Test ${n}: invalid card boundary`);
 correction=correction.slice(0,start)+'<div class="word-list">'+cards+correction.slice(end);
 planned.set(correctionFile,correction);
}
const aggregate=json('scripts/practice-vocabulary-notes.json');
for(const t of aggregate.tests)t.words=vocabularies.get(t.test).words;
planned.set('scripts/practice-vocabulary-notes.json',JSON.stringify(aggregate,null,2)+'\n');
const changes=[...planned].filter(([file,data])=>read(file).replace(/\r\n/g,'\n')!==data.replace(/\r\n/g,'\n'));
if(write)for(const [file,data]of changes)fs.writeFileSync(path.join(root,file),data);
console.log(JSON.stringify({tests:39,answers:3900,detailedVocabulary:[...vocabularies.values()].reduce((s,v)=>s+v.words.length,0),filesChanged:changes.length,mode:write?'write':'check'}));
if(!write&&changes.length){console.error(changes.map(([f])=>f).join('\n'));process.exitCode=1;}
