import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const write=(p,s)=>writeFile(new URL(p,root),s);
const reference=JSON.parse(await read('scripts/practice-05-08.routes.json'))[5];
const student=await read(reference.student+'/index.html');
const correction=await read(reference.correction+'/index.html');
let routes;try{routes=JSON.parse(await read('scripts/practice-09-39.routes.json'));}catch{routes={};}
const numbers=process.argv.slice(2).map(Number);if(!numbers.length)throw Error('Supply reviewed test numbers explicitly');
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
for(const n of numbers){
 if(n<9||n>39)throw Error('Outside approved scope');
 const pad=String(n).padStart(2,'0');
 const src=JSON.parse(await read('scripts/practice-test-'+pad+'.source.json'));
 const vocab=JSON.parse(await read('scripts/practice-test-'+pad+'.vocabulary.json'));
 const route=routes[n]??={student:randomBytes(16).toString('hex'),correction:randomBytes(16).toString('hex')};
 const app=JSON.parse(student.match(/const APP = (.*);\r?\n/)[1]);
 app.course.expected={testCount:39,questionTotal:null};
 const errorSection=src.errorCorrectionSection??'I.3';
 app.test={...app.test,sequence:n,testId:'luyen-de-practice-test-'+pad,testLabel:src.title,testNumber:n,testCode:src.testCode,title:src.title,total:src.total,questionDocumentId:src.docId,questionTab:src.sourceTabs.test.tabId,sections:src.sections,answers:src.answers,errorCorrectionSection:errorSection,contentRevision:'2026-10-16',publishReady:true};
 let html=student.replace(/const APP = .*;\r?\n/,()=> 'const APP = '+JSON.stringify(app)+';\n').replaceAll('PRACTICE TEST 5 · LUYỆN ĐỀ','PRACTICE TEST '+n+' · LUYỆN ĐỀ');
 html=html.replaceAll('=== "I.3"','=== '+JSON.stringify(errorSection));
 html=html.replaceAll('Điền 5 lỗi khác nhau','Điền '+src.sections.find(s=>s.sectionCode===errorSection).count+' lỗi khác nhau');
 let page=correction.replaceAll('PRACTICE TEST 5','PRACTICE TEST '+n).replaceAll('TEST 5 ·','TEST '+n+' ·').replaceAll('PRACTICE+TEST+5','PRACTICE+TEST+'+n).replaceAll('15OQMFYSwy38N2PeqnDjk82WQZauPAHiTiajyGP-Je1o',src.sourceTabs.answers.documentId).replaceAll('t.nqldg9snrw3x',src.sourceTabs.answers.tabId);
 const cards=vocab.words.map((w,i)=>'<article class="word-card"><div class="word-index">'+String(i+1).padStart(2,'0')+'</div><div class="word-identity"><p class="word-meta">'+escape(w.meta)+' · Câu '+w.question+'</p><h3>'+escape(w.term)+'</h3></div><div class="word-meaning"><p class="card-label">NGHĨA TIẾNG VIỆT</p><p>'+escape(w.meaning)+'</p></div><div class="word-detail"><p class="card-label">GIẢI THÍCH &amp; LƯU Ý</p><p>'+escape(w.note)+'</p></div></article>').join('');
 const a=page.indexOf('<div class="word-list">'),b=page.indexOf('</section>',a);if(a<0||b<0)throw Error('Vocabulary template boundary');
 page=page.slice(0,a)+'<div class="word-list">'+cards+'</div>'+page.slice(b);
 page=page.replace(/(<script[^>]*id="correction-vocabulary-data"[^>]*>)[\s\S]*?(<\/script>)/,(_,start,end)=>start+JSON.stringify(vocab).replace(/</g,'\\u003c')+end);
 for(const [key,content] of [['student',html],['correction',page]]){await mkdir(new URL(route[key]+'/',root),{recursive:true});await write(route[key]+'/index.html',content);}
 console.log(JSON.stringify({test:n,...route}));
}
await write('scripts/practice-09-39.routes.json',JSON.stringify(routes,null,2)+'\n');
