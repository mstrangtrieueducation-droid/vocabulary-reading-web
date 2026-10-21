import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const routes={1:{student:'fa97457ce278f90f476964841b89eb44',correction:'d7410acf3a3890aca6471be77ba75c22'},2:{student:'e89033ab50733a7997403905b7a4f467',correction:'7698699ab01270deacf705fc4c325693'},3:{student:'526b4c6c7f3932132a71e85bc2f651bd',correction:'6244b09b8d02f9a208b61f1a29a26c6a'},4:{student:'d5d87362691f486e9b798966cf29e64f',correction:'b0c35aeebf7f4144a77a4f7741a0f109'},...JSON.parse(read('scripts/practice-05-08.routes.json')),...JSON.parse(read('scripts/practice-09-39.routes.json'))};
let count=0;
for(let n=1;n<=39;n++){
 const src=JSON.parse(read(`scripts/practice-test-${String(n).padStart(2,'0')}.source.json`));
 const html=read(routes[n].student+'/index.html'),app=JSON.parse(html.match(/const APP = (.*);/)[1]);
 assert.equal(app.test.answers.length,100);
 const publicAnswer=({reviewStatus,sourceRefs,...a})=>a;
 assert.deepEqual(app.test.answers.map(publicAnswer),src.answers.map(publicAnswer));
 for(const a of src.answers.filter(x=>x.globalNumber>=91)){
  for(const answer of a.acceptedAnswers){
   const words=answer.trim().split(/\s+/).length;
   assert(words>=2&&words<=6,`${n}/${a.globalNumber}: ${answer}`);
   const tokens=answer.toLowerCase().replace(/[.,!?;:]/g,'').split(/\s+/);
   assert(tokens.includes(a.keyword.toLowerCase()),`${n}/${a.globalNumber}: missing ${a.keyword}`);
   assert(!/[\[\]/]/.test(answer),`${n}/${a.globalNumber}: notation in accepted answer`);
   assert(!/^n't\b/.test(answer),`${n}/${a.globalNumber}: split contraction`);
  }
 }
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const ctx={SOLUTIONS:src.answers,questions:src.answers.map(a=>a.globalNumber),solutionByGlobal:new Map(src.answers.map(a=>[a.globalNumber,a])),TOTAL:100};vm.createContext(ctx);
 vm.runInContext(script.slice(script.indexOf('    const norm ='),script.indexOf('    const solutionByGlobal ='))+'\n'+script.slice(script.indexOf('    function buildReview('),script.indexOf('    function renderWrongList(')),ctx);
 const sample=Object.fromEntries(src.answers.map(a=>[a.globalNumber,a.acceptedAnswers[0]]));
 assert.equal(ctx.buildReview(sample).score,100);assert.equal(ctx.buildReview({}).score,0);
 for(const a of src.answers)for(const key of a.acceptedAnswers){assert.equal(ctx.buildReview({...sample,[a.globalNumber]:key}).score,100,`${n}/${a.globalNumber}/${key}`);count++;}
 const page=read(routes[n].correction+'/index.html'),v=JSON.parse(read(`scripts/practice-test-${String(n).padStart(2,'0')}.vocabulary.json`));
 const data=JSON.parse(page.match(/<script id="correction-vocabulary-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.deepEqual(data.words,v.words);assert.equal((page.match(/class="word-card"/g)||[]).length,v.words.length);
 assert(page.includes('practice-vocabulary.355350f3f617.js'));
 for(const w of v.words)for(const k of ['meaning','note','usage','family','example','translation'])assert(w[k]?.length>3,`${n}/${w.term}/${k}`);
 console.log(`PASS ${n}: 100 answers, keyword limits, grading variants, detailed vocabulary source/web consistency`);
}
console.log(`Verified ${count} accepted-answer grading cases.`);
