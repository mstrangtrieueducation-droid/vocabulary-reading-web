import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const routes=JSON.parse(await read('scripts/practice-05-08.routes.json'));
const reference=JSON.parse((await read('d5d87362691f486e9b798966cf29e64f/index.html')).match(/const APP = (.*);/)[1]);
for(const n of [5,6,7,8]){
 const html=await read(routes[n].student+'/index.html');
 const app=JSON.parse(html.match(/const APP = (.*);/)[1]);
 const data=app.test,answers=data.answers;
 const src=JSON.parse(await read(`scripts/practice-test-0${n}.source.json`));
 assert.equal(answers.length,100);assert.equal(new Set(answers.map(a=>a.globalNumber)).size,100);
 assert.deepEqual(data.sections.flatMap(s=>Array.from({length:s.count},(_,i)=>s.startGlobal+i)),Array.from({length:100},(_,i)=>i+1));
 assert.equal(data.sections[0].count,n===7?30:35);assert.equal(data.sections[1].count,n===7?15:10);
 assert(answers.every(a=>a.explanation.length>=100 && a.acceptedAnswers.length));
 assert.equal(new Set(answers.map(a=>a.explanation)).size,100);
 assert.deepEqual(app.course.scoreSink,reference.course.scoreSink);
 assert.equal(data.questionDocumentId,src.docId);
 assert(!html.includes(src.sourceTabs.answers.documentId));
 assert(!html.includes('Nhập nguyên câu hoàn chỉnh'));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
 const ctx={SOLUTIONS:answers,questions:answers.map(a=>a.globalNumber),solutionByGlobal:new Map(answers.map(a=>[a.globalNumber,a])),TOTAL:100};vm.createContext(ctx);
 vm.runInContext(script.slice(script.indexOf('    const norm ='),script.indexOf('    const solutionByGlobal ='))+'\n'+script.slice(script.indexOf('    function buildReview('),script.indexOf('    function renderWrongList(')),ctx);
 const sample=Object.fromEntries(answers.map(a=>[a.globalNumber,a.acceptedAnswers[0]]));
 assert.equal(ctx.buildReview(sample).score,100);assert.equal(ctx.buildReview({}).score,0);
 const permutation={...sample};[46,47,48,49,50].forEach((q,i)=>permutation[q]=sample[50-i]);
 assert.equal(ctx.buildReview(permutation).score,100);
 assert.equal(ctx.buildReview({...permutation,47:permutation[46]}).score,99);
 for(const a of answers)for(const key of a.acceptedAnswers)assert.equal(ctx.buildReview({...sample,[a.globalNumber]:key}).score,100,`${n}/${a.globalNumber}/${key}`);
 const pending=ctx.buildReview({...sample,81:'A different answer for teacher review'});
 assert.equal(pending.pending.length,1);assert.equal(pending.score,99);assert(pending.submissionNote.includes('81: A different answer'));
 assert.equal(ctx.buildReview({...sample,1:'X'}).pending.length,0);
 assert.equal(ctx.buildReview({...sample,81:'  '+sample[81].toUpperCase()+' .  '}).score,100);
 assert.equal(ctx.buildReview({...sample,46:sample[46].replace(' → ','->')}).score,100);
 if(n===5){assert.deepEqual(answers[4].acceptedAnswers,['D']);assert.deepEqual(answers[25].acceptedAnswers,['D']);assert(answers[63].acceptedAnswers.includes('still'));assert(!answers[63].acceptedAnswers.includes('even'));assert(!answers[90].acceptedAnswers.some(s=>s.includes('out of')));}
 if(n===6){assert.deepEqual(answers[26].acceptedAnswers,['B']);assert(!answers[85].acceptedAnswers.some(s=>s.includes('until')));assert(answers[91].acceptedAnswers.some(s=>s.endsWith('Yuri')));}
 if(n===7){assert.deepEqual(answers[64].acceptedAnswers,['in','within']);assert(answers[32].acceptedAnswers.includes('purposely'));assert(!answers[87].acceptedAnswers.some(s=>s.includes('everyone')));}
 if(n===8){assert(answers[49].acceptedAnswers.includes('captures → capture'));assert(!answers[89].acceptedAnswers.some(s=>s.includes('shock')));assert.equal(answers[94].acceptedAnswers[0],'lost my appetite the moment');}
 const page=await read(routes[n].correction+'/index.html');
 const vocab=JSON.parse(page.match(/<script[^>]*id="correction-vocabulary-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 assert.equal(vocab.words.length,30);assert(vocab.words.every(w=>['term','meaning','note','usage','family','example','translation'].every(k=>w[k]?.length>3)));
 assert(page.includes(src.sourceTabs.answers.documentId));assert(page.includes(`PRACTICE+TEST+${n}`));assert(!page.includes('PRACTICE TEST 4'));assert(!page.includes('1EKFb7d91SKlQEUF0XztylZll2wYvrpTHbbjTyhBs3QA'));
 assert.equal((page.match(/class="word-card"/g)||[]).length,30);
 // Serialize to an in-memory form; never contact the real score receiver.
 const fields=[],sent=[],target={name:'scoreTarget',addEventListener(){}};let form;
 const formCtx={$:()=>target,FORM_URL:app.course.scoreSink.formResponseUrl,ENTRIES:app.course.scoreSink.entries,TOTAL:100,COURSE:app.course,renderTemplate:t=>t.replace('{testLabel}',data.testLabel).replace('{topic}',data.topic),document:{createElement:t=>t==='form'?(form={append:el=>fields.push(el),submit:()=>sent.push(1),remove(){}}):{},body:{append(){}}},localStorage:{setItem(){}},setTimeout:()=>0,clearTimeout(){},Date,Promise};
 vm.createContext(formCtx);vm.runInContext(script.slice(script.indexOf('    function submitScoreForm('),script.indexOf('    async function submitWithStorageLock(')),formCtx);
 formCtx.submitScoreForm({identity:{name:'LOCAL TEST',className:'FIGHTER 5'},score:99,percent:99,wrong:pending.submissionNote,attemptId:'local-only'},'local');
 assert.equal(sent.length,1);assert.equal(form.action,reference.course.scoreSink.formResponseUrl);
 const values=Object.fromEntries(fields.map(f=>[f.name,f.value]));assert.equal(values[app.course.scoreSink.entries.testCode],`LUYỆN ĐỀ - PRACTICE TEST ${n}`);assert(values[app.course.scoreSink.entries.wrong].includes('CẦN CÔ XEM'));
 console.log(`PASS Test ${n}: 100 keys/explanations, variants, unique errors, pending writing, 30 vocabulary notes, form payload (no submission)`);
}
