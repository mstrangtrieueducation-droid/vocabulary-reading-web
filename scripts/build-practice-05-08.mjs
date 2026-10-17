import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p),'utf8');
const write=(p,s)=>writeFile(path.join(root,p),s);
const template=await read('d5d87362691f486e9b798966cf29e64f/index.html');
const correction=await read('b0c35aeebf7f4144a77a4f7741a0f109/index.html');
let manifest;
try{manifest=JSON.parse(await read('scripts/practice-05-08.routes.json'));}
catch{manifest=Object.fromEntries([5,6,7,8].map(n=>[n,{student:randomBytes(16).toString('hex'),correction:randomBytes(16).toString('hex')}]));}
const escape=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const matching=String.raw`    const norm = value => String(value || "").normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/\s*(?:->|→)\s*/g," → ").replace(/[.!?]+$/g,"").replace(/\bmr\./g,'mr').replace(/,/g,'').replace(/\s+/g," ").trim();
    const canonical = value => norm(value)
      .replace(/\b(would|should|could|had|did|does|do|was|were|is|are|has|have|must)n['’]t\b/g,'$1 not')
      .replace(/\bcan['’]t\b/g,'cannot').replace(/\bwon['’]t\b/g,'will not')
      .replace(/\b(i|you|we|they)'ve\b/g,'$1 have').replace(/\b(you|we|they)'re\b/g,'$1 are')
      .replace(/\bi'm\b/g,'i am').replace(/\b(he|she|it)'s\b/g,'$1 is')
      .replace(/\bi'd left\b/g,'i had left')
      .replace(/\brealized\b/g,'realised').replace(/\brealize\b/g,'realise')
      .replace(/\bbehavior\b/g,'behaviour').replace(/\bneighborhood\b/g,'neighbourhood')
      .replace(/\bonstage\b/g,'on stage');
    const equivalent = (left,right) => canonical(left) === canonical(right);`;
for(const n of [5,6,7,8]){
 const source=JSON.parse(await read(`scripts/practice-test-0${n}.source.json`));
 const vocab=JSON.parse(await read(`scripts/practice-test-0${n}.vocabulary.json`));
 if(n===7)source.answers[97].explanation='Be not likely to + V = có lẽ sẽ không. Go on nghĩa là kéo dài; on đã cho sau ô trống. Điền is not likely to go để giữ nguyên từ khóa likely và nghĩa thời lượng của cuộc họp.';
 await write(`scripts/practice-test-0${n}.source.json`,JSON.stringify(source,null,2)+'\n');
 const app=JSON.parse(template.match(/const APP = (.*);\r?\n/)[1]);
 app.course.expected={testCount:8,questionTotal:800};
 app.test={...app.test,sequence:n,testId:`luyen-de-practice-test-0${n}`,testLabel:source.title,testNumber:n,testCode:source.testCode,title:source.title,questionDocumentId:source.docId,questionTab:source.sourceTabs.test.tabId,sections:source.sections,answers:source.answers,contentRevision:source.contentRevision || '2026-10-16',readingSources:source.readingSources || [],publishReady:true};
 let html=template.replace(/const APP = .*;\r?\n/,()=>`const APP = ${JSON.stringify(app)};\n`).replaceAll('PRACTICE TEST 4 · LUYỆN ĐỀ',`PRACTICE TEST ${n} · LUYỆN ĐỀ`);
 html=html.replace(/    const norm = .*\r?\n    const equivalent = .*;/,()=>matching);
 html=html.replaceAll('Nhập nguyên câu hoàn chỉnh','Chỉ nhập phần còn thiếu trong câu');
 html=html.replace('          row.append(textarea);',`          const sentence = document.createElement("div");
          sentence.style.cssText = "display:grid;gap:7px;min-width:0";
          const clue = document.createElement("p");
          const solution = solutionByGlobal.get(globalNumber);
          clue.textContent = [solution.prefix,"_____",solution.suffix].filter(Boolean).join(" ");
          clue.style.cssText = "margin:0;font-size:13px;line-height:1.5;color:var(--muted)";
          sentence.append(clue,textarea);
          row.append(sentence);`);
 html=html.replace('return {...solution,globalNumber,submitted,correct};','return {...solution,globalNumber,submitted,correct,needsReview:globalNumber >= 81 && Boolean(submitted) && !correct};');
 html=html.replace('const wrongNumbers = review.filter(item => !item.correct).map(item => item.globalNumber);','const wrongNumbers = review.filter(item => !item.correct).map(item => item.globalNumber);\n      const pending = review.filter(item => item.needsReview);');
 html=html.replace('return {score,review,percent:Math.round(score / TOTAL * 100),wrong:wrongNumbers.length,wrongNumbers};','return {score,review,percent:Math.round(score / TOTAL * 100),wrong:wrongNumbers.length,wrongNumbers,pending,submissionNote:wrongNumbers.join(", ") + (pending.length ? " | CẦN CÔ XEM: " + pending.map(item => item.globalNumber + ": " + item.submitted).join("; ") : "")};');
 html=html.replaceAll('result.wrongNumbers.join(", ")','result.submissionNote');
 html=html.replace('status.textContent = item.correct ? "ĐÚNG" : "SAI";','status.textContent = item.correct ? "ĐÚNG" : item.needsReview ? "CẦN CÔ XEM" : "SAI";');
 html=html.replace('key.textContent = "Đáp án đúng: ";','key.textContent = item.needsReview ? "Đáp án tham khảo: " : "Đáp án: ";');
 html=html.replace('explanationText.textContent = item.explanation;','explanationText.textContent = item.explanation + (item.needsReview ? " Bài viết của em chưa trùng các đáp án đã duyệt. Cô cần kiểm tra thêm trước khi kết luận đúng/sai." : "");');
 html=html.replace('$("resultMeta").textContent = `Điểm ${result.score}/${TOTAL} · ${result.percent}%`;','$("resultMeta").textContent = result.pending.length ? `Điểm tự chấm tạm thời ${result.score}/${TOTAL} · ${result.pending.length} câu viết cần cô xem thêm` : `Điểm ${result.score}/${TOTAL} · ${result.percent}%`;');
 html=html.replaceAll('CÂU SAI','CÂU CẦN XEM LẠI').replaceAll('Xem câu sai','Xem lại câu').replaceAll('câu cần sửa','câu cần xem lại');
 const route=manifest[n];
 await mkdir(path.join(root,route.student),{recursive:true});await write(`${route.student}/index.html`,html);
 let page=correction.replaceAll('PRACTICE TEST 4',`PRACTICE TEST ${n}`).replaceAll('TEST 4 ·',`TEST ${n} ·`).replaceAll('PRACTICE+TEST+4',`PRACTICE+TEST+${n}`).replaceAll('1EKFb7d91SKlQEUF0XztylZll2wYvrpTHbbjTyhBs3QA',source.sourceTabs.answers.documentId).replaceAll('t.lr7m9i62gf93',source.sourceTabs.answers.tabId);
 page=page.replace('✓ Tra cứu từ điển, làm sổ từ vựng đúng quy cách với TẤT CẢ những từ vựng cô in đỏ trong Link đính kèm bên dưới.','✓ Làm sổ từ vựng đúng quy cách với toàn bộ từ/cụm được tô nổi bật ở dòng “Từ vựng trọng tâm” trong tài liệu chữa. Xem nghĩa, cách dùng, phân biệt từ và ví dụ ở Vocabulary Notes bên dưới.');
 page=page.replace(/<div class="lesson-badge">\d+/,`<div class="lesson-badge">${vocab.words.length}`).replace(/<h2>\d+ từ\/cụm từ trọng tâm<\/h2>/,`<h2>${vocab.words.length} từ/cụm từ trọng tâm</h2>`);
 const cards=vocab.words.map((w,i)=>`<article class="word-card"><div class="word-index">${String(i+1).padStart(2,'0')}</div><div class="word-identity"><p class="word-meta">${escape(w.meta)} · Câu ${w.question}</p><h3>${escape(w.term)}</h3></div><div class="word-meaning"><p class="card-label">NGHĨA TIẾNG VIỆT</p><p>${escape(w.meaning)}</p></div><div class="word-detail"><p class="card-label">GIẢI THÍCH &amp; LƯU Ý</p><p>${escape(w.note)}</p></div></article>`).join('');
 const a=page.indexOf('<div class="word-list">'),b=page.indexOf('</section>',a);
 if(a<0||b<0)throw Error('vocabulary template');
 page=page.slice(0,a)+`<div class="word-list">${cards}</div>`+page.slice(b);
 page=page.replace(/(<script[^>]*id="correction-vocabulary-data"[^>]*>)[\s\S]*?(<\/script>)/,(_,start,end)=>start+JSON.stringify(vocab).replace(/</g,'\\u003c')+end);
 await mkdir(path.join(root,route.correction),{recursive:true});await write(`${route.correction}/index.html`,page);
 console.log(JSON.stringify({test:n,...route,answers:source.answers.length,vocabulary:vocab.words.length}));
}
await write('scripts/practice-05-08.routes.json',JSON.stringify(manifest,null,2)+'\n');
