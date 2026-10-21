import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const routes={1:['fa97457ce278f90f476964841b89eb44','d7410acf3a3890aca6471be77ba75c22'],2:['e89033ab50733a7997403905b7a4f467','7698699ab01270deacf705fc4c325693'],3:['526b4c6c7f3932132a71e85bc2f651bd','6244b09b8d02f9a208b61f1a29a26c6a'],4:['d5d87362691f486e9b798966cf29e64f','b0c35aeebf7f4144a77a4f7741a0f109'],5:['6146c1523cfb20b4391f119344dbbd4b','80f6ebf0c535a3a0b4969dbed1d52b8b'],6:['5fc615d6329eba10b771f2067f62eb71','ca4f33896c15ee040912d15ae26265e0'],7:['a263aefd99d4a002594bb310e77acdb0','fb0e6ebc690ae5081edffc238ae0ddd8'],8:['da3b71bd10337269627680d8a80dfc2d','8b61d53ec9bcb66793c43073e32973bf']};
const sources=JSON.parse(await read('scripts/practice-01-08.authentic-sources.json'));
for(const [number,[student,correction]] of Object.entries(routes)){
 const n=Number(number),html=await read(`${student}/index.html`),page=await read(`${correction}/index.html`);
 const app=JSON.parse(html.match(/const APP = (.*);/)[1]);
 const answers=app.test.answers;
 assert.equal(answers.length,100);
 assert.deepEqual(answers.map(a=>a.globalNumber),Array.from({length:100},(_,i)=>i+1));
 assert.equal(app.test.contentRevision,'2026-10-21-word-limits');
 assert(html.includes('${TEST.contentRevision || "original"}:active:v1'));
 assert(html.includes('${TEST.contentRevision || "original"}:last:v1'));
 assert(html.includes('${TEST.contentRevision || "original"}:history:v1'));
 const src=JSON.parse(await read(`scripts/practice-test-0${n}.source.json`));
 assert.deepEqual(src.answers.map(a=>a.acceptedAnswers),answers.map(a=>a.acceptedAnswers));
 assert.deepEqual(src.answers.map(a=>a.explanation),answers.map(a=>a.explanation));
 for(const doc of [html,page])for(const m of doc.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  if(!m[1].includes('application/json'))new vm.Script(m[2]);
 }
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const ctx={SOLUTIONS:answers,questions:answers.map(a=>a.globalNumber),solutionByGlobal:new Map(answers.map(a=>[a.globalNumber,a])),TOTAL:100};vm.createContext(ctx);
 vm.runInContext(script.slice(script.indexOf('    const norm ='),script.indexOf('    const solutionByGlobal ='))+'\n'+script.slice(script.indexOf('    function buildReview('),script.indexOf('    function renderWrongList(')),ctx);
 const sample=Object.fromEntries(answers.map(a=>[a.globalNumber,a.acceptedAnswers[0]]));
 assert.equal(ctx.buildReview(sample).score,100);assert.equal(ctx.buildReview({}).score,0);
 for(const a of answers)for(const key of a.acceptedAnswers)assert.equal(ctx.buildReview({...sample,[a.globalNumber]:key}).score,100,`${n}/${a.globalNumber}/${key}`);
 const reversed={...sample};[46,47,48,49,50].forEach((q,i)=>reversed[q]=sample[50-i]);
 assert.equal(ctx.buildReview(reversed).score,100);
 assert.equal(ctx.buildReview({...reversed,47:reversed[46]}).score,99);
 const vocab=JSON.parse(page.match(/<script[^>]*id="correction-vocabulary-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const vocabularySource=JSON.parse(await read(`scripts/practice-test-0${n}.vocabulary.json`));
 assert.deepEqual(vocab.words,vocabularySource.words);
 assert(vocab.words.length>=[22,58,32,29,30,30,30,30][n-1]);
 assert.equal((page.match(/class="word-card"/g)||[]).length,vocab.words.length);
 assert(vocab.words.every(w=>['term','meaning','note','usage','family','example','translation'].every(k=>typeof w[k]==='string'&&w[k].length>3)));
 assert.equal(app.test.readingSources.length,sources[n].length);
 for(const s of sources[n]){
  assert(s.originalParagraphs.length&&s.exerciseParagraphs.length&&s.url.startsWith('https://'));
  if(s.part==='II.1'||s.part==='II.2'){
   const expected=s.part==='II.1'?51:61;
   assert.deepEqual([...s.exerciseParagraphs.join(' ').matchAll(/\((\d+)\) _+/g)].map(m=>Number(m[1])),Array.from({length:10},(_,i)=>i+expected));
  }
 }
 if(n===3){assert(answers[66].acceptedAnswers.includes('whichever'));assert(answers[47].acceptedAnswers.includes('to boost'));}
 if(n===6)assert.deepEqual(answers.slice(50,60).map(a=>a.acceptedAnswers[0]),['B','C','A','D','B','C','A','D','B','C']);
 if(n===7)assert(answers[68].acceptedAnswers.includes('along'));
 if(n===8)assert.deepEqual(answers[62].acceptedAnswers,['for','on']);
 console.log(`PASS Test ${n}: exact 100 questions, all accepted variants, error matching, source coverage, vocabulary, isolated attempt revision; no network`);
}
