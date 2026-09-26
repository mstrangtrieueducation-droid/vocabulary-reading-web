import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const html = await readFile(new URL('d5d87362691f486e9b798966cf29e64f/index.html',root),'utf8');
const reference = await readFile(new URL('526b4c6c7f3932132a71e85bc2f651bd/index.html',root),'utf8');
const app = JSON.parse(html.match(/const APP = (.*);\r?\n/)[1]);
const old = JSON.parse(reference.match(/const APP = (.*);\r?\n/)[1]);
const data = app.test;
assert.equal(data.answers.length,100);
assert.deepEqual(data.answers.map(a=>a.globalNumber),Array.from({length:100},(_,i)=>i+1));
assert.deepEqual(data.sections.flatMap(s=>Array.from({length:s.count},(_,i)=>s.startGlobal+i)),data.answers.map(a=>a.globalNumber));
assert(data.answers.every(a=>a.explanation.length>150));
assert.equal(new Set(data.answers.map(a=>a.explanation)).size,100);
assert.deepEqual(data.answers[3].acceptedAnswers,['B']);
assert.deepEqual(data.answers[73].acceptedAnswers,['C']);
assert.equal(data.questionDocumentId,'1kyFNJkOi3ts6-DfAtOi2bAsmg8qUEYtv2540U8Dhtoc');
assert.deepEqual(app.course.scoreSink,old.course.scoreSink);
assert.equal(html.match(/<style>([\s\S]*?)<\/style>/)[1],reference.match(/<style>([\s\S]*?)<\/style>/)[1]);
assert(!html.includes('1EKFb7d91SKlQEUF0XztylZll2wYvrpTHbbjTyhBs3QA'));
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const norm=value=>String(value||'').normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s*->\s*/g,' → ').replace(/[.!?]+$/g,'').trim().replace(/\s+/g,' ');
const context={SOLUTIONS:data.answers,questions:data.answers.map(a=>a.globalNumber),solutionByGlobal:new Map(data.answers.map(a=>[a.globalNumber,a])),equivalent:(a,b)=>norm(a)===norm(b),TOTAL:100};
vm.createContext(context);
vm.runInContext(script.slice(script.indexOf('    function buildReview('),script.indexOf('    function renderWrongList(')),context);
const sample=Object.fromEntries(data.answers.map(a=>[a.globalNumber,a.acceptedAnswers[0]]));
assert.equal(context.buildReview(sample).score,100);
const permuted={...sample};[46,47,48,49,50].forEach((n,i)=>permuted[n]=sample[50-i]);
assert.equal(context.buildReview(permuted).score,100);
const duplicate=context.buildReview({...permuted,47:permuted[46]});
assert.equal(duplicate.score,99);
assert.equal(new Set(duplicate.review.slice(45,50).map(a=>a.displayAnswer)).size,5);
assert.equal(context.buildReview({...sample,4:'A',74:'A'}).score,98);
assert.equal(context.buildReview({}).score,0);
assert.equal(context.buildReview({...sample,82:"  I’d rather you hadn’t taken me for a ride yesterday  ",46:'thorough -> thoroughly'}).score,100);
for(const answer of data.answers){
  for(const variant of answer.acceptedAnswers) assert.equal(context.buildReview({...sample,[answer.globalNumber]:variant}).score,100);
}
// Exercise the production form serializer against an in-memory form only.
const fields=[];
let form;
const target={name:'scoreTarget',addEventListener:()=>{}};
const sent=[];
const formContext={
  $:()=>target, FORM_URL:app.course.scoreSink.formResponseUrl, ENTRIES:app.course.scoreSink.entries, TOTAL:100,
  COURSE:app.course, renderTemplate:t=>t.replace('{testLabel}',data.testLabel).replace('{topic}',data.topic),
  document:{createElement:tag=>tag==='form'?(form={append:el=>fields.push(el),submit:()=>sent.push('intercepted'),remove:()=>{}}):{},body:{append:()=>{}}},
  localStorage:{setItem:()=>{}},setTimeout:()=>0,clearTimeout:()=>{},Date,Promise
};
vm.createContext(formContext);
vm.runInContext(script.slice(script.indexOf('    function submitScoreForm('),script.indexOf('    async function submitWithStorageLock(')),formContext);
formContext.submitScoreForm({identity:{name:'LOCAL TEST',className:'FIGHTER 5'},score:100,percent:100,wrong:'',attemptId:'local-only'},'local');
assert.equal(sent.length,1);
assert.equal(form.action,old.course.scoreSink.formResponseUrl);
const values=Object.fromEntries(fields.map(f=>[f.name,f.value]));
assert.equal(values[app.course.scoreSink.entries.testCode],'LUYỆN ĐỀ - PRACTICE TEST 4');
assert.equal(values[app.course.scoreSink.entries.score],'100/100');
assert.equal(fields.length,10);
console.log('PASS: 100 answers and explanations; Practice 3 layout and score destination; error permutations and duplicates; normalized writing; form payload (no network submission).');
