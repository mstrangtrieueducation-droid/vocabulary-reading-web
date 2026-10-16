import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const routes=JSON.parse(await read('scripts/practice-09-39.routes.json'));
for(const [n,r] of Object.entries(routes)){
 const html=await read(r.student+'/index.html'),app=JSON.parse(html.match(/const APP = (.*);/)[1]),data=app.test,answers=data.answers;
 assert.equal(answers.length,data.total);
 assert.deepEqual(data.sections.flatMap(s=>Array.from({length:s.count},(_,i)=>s.startGlobal+i)),Array.from({length:data.total},(_,i)=>i+1));
 assert.equal(new Set(answers.map(a=>a.explanation)).size,data.total);
 assert(answers.every(a=>a.explanation.length>100&&a.acceptedAnswers.length));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
 const ctx={SOLUTIONS:answers,questions:answers.map(a=>a.globalNumber),solutionByGlobal:new Map(answers.map(a=>[a.globalNumber,a])),TOTAL:data.total};vm.createContext(ctx);
 vm.runInContext(script.slice(script.indexOf('    const norm ='),script.indexOf('    const solutionByGlobal ='))+'\n'+script.slice(script.indexOf('    function buildReview('),script.indexOf('    function renderWrongList(')),ctx);
 const sample=Object.fromEntries(answers.map(a=>[a.globalNumber,a.acceptedAnswers[0]]));
 assert.equal(ctx.buildReview(sample).score,data.total);assert.equal(ctx.buildReview({}).score,0);
 for(const a of answers)for(const k of a.acceptedAnswers)assert.equal(ctx.buildReview({...sample,[a.globalNumber]:k}).score,data.total);
 const errors=answers.filter(a=>a.sectionCode===(data.errorCorrectionSection??'I.3')),swapped={...sample};
 assert.equal(errors.length,data.sections.find(s=>s.sectionCode===(data.errorCorrectionSection??'I.3')).count);
 assert(html.includes('Điền '+errors.length+' lỗi khác nhau'));
 errors.forEach((a,i)=>swapped[a.globalNumber]=sample[errors.at(-1-i).globalNumber]);
 assert.equal(ctx.buildReview(swapped).score,data.total);
 swapped[errors[1].globalNumber]=swapped[errors[0].globalNumber];assert.equal(ctx.buildReview(swapped).score,data.total-1);
 if(data.errorCorrectionSection==='I.4'){
  const wordForms=answers.filter(a=>a.sectionCode==='I.3'),wrongOrder={...sample};
  assert.equal(wordForms.length,8);
  wrongOrder[wordForms[0].globalNumber]=sample[wordForms[1].globalNumber];
  wrongOrder[wordForms[1].globalNumber]=sample[wordForms[0].globalNumber];
  assert.equal(ctx.buildReview(wrongOrder).score,data.total-2);
 }
 const writing=answers.find(a=>a.prefix);const pending=ctx.buildReview({...sample,[writing.globalNumber]:'another valid answer for teacher review'});
 assert.equal(pending.pending.length,1);assert(pending.submissionNote.includes('another valid answer'));
 const page=await read(r.correction+'/index.html'),v=JSON.parse(page.match(/<script[^>]*id="correction-vocabulary-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 assert.equal(v.words.length,30);assert(v.words.every(w=>['term','meaning','note','usage','family','example','translation'].every(k=>w[k]?.length>3)));
 assert(page.includes('PRACTICE+TEST+'+n));assert(page.includes(data.questionDocumentId));
 if(+n===9){assert.equal(answers[9].displayAnswer,'B');assert.equal(answers[28].displayAnswer,'practitioners');assert.equal(answers[78].displayAnswer,'B');assert.equal(answers[79].displayAnswer,'A');}
 console.log('PASS Practice '+n+': keys, variants, writing review, unique errors, vocabulary fields');
}
