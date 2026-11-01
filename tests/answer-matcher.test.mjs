import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import matcher from '../test-assets/answer-matcher.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=[];
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(e.name.startsWith('.')||['scripts','tests','node_modules'].includes(e.name))continue;
 const p=path.join(dir,e.name);if(e.isDirectory()){visit(p);continue;}
 if(e.name==='index.html'){const html=fs.readFileSync(p,'utf8');if(html.includes('MTTAnswerMatcher.matches'))pages.push({p,html,app:JSON.parse(html.match(/const APP = (.*);/)[1])});}
}}
visit(root);
const gf10=pages.find(x=>x.app.test.testId==='grammar-foundation-u10');
test('reported Unit 10 inputs match without accepting contradictory choices',()=>{
 for(const [number,input] of [[45,'C.-'],[46,'C.will get'],[47,'B.the'],[48,'B. to experience'],[49,'A.whose']]){
  const s=gf10.app.test.answers.find(x=>x.globalNumber===number);
  assert(matcher.matches(s,input),number+': '+input);
  assert(!matcher.matches(s,'D. '+s.displayAnswer.slice(2).trim()));
  assert(!matcher.matches(s,s.acceptedAnswers[0]+'. definitely wrong'));
 }
 const s=gf10.app.test.answers.find(x=>x.globalNumber===48);
 assert(matcher.matches(s,'to experience'));assert(matcher.matches(s,' b .  to   experience. '));
 assert(!matcher.matches(s,'to experiencing'));
 assert(!matcher.matches(gf10.app.test.answers[0],'B. a'));
});
test('all 90 pages load shared matcher; all explicit accepted answers still match',()=>{
 assert.equal(pages.length,90);
 for(const {p,html,app} of pages){
  const src=html.match(/<script src="([^"]+)" data-answer-matcher>/)[1].split('?')[0];
  assert(fs.existsSync(path.resolve(path.dirname(p),src)));
  assert(html.indexOf('data-answer-matcher')<html.indexOf('const APP ='));
  for(const s of app.test.answers){
   for(const a of s.acceptedAnswers)if(String(a).trim())assert(matcher.matches(s,a),p+' '+s.globalNumber);
   assert(!matcher.matches(s,''));
   if(/^[A-D]\s*[.):\-]\s*\S/i.test(s.displayAnswer)&&s.acceptedAnswers.every(a=>/^[A-D]$/i.test(a))){
    assert(matcher.matches(s,s.displayAnswer),p+' '+s.globalNumber);
   }
  }
 }
});
test('real review function drives score and wrong list consistently without posting',()=>{
 const html=gf10.html;
 const code=html.slice(html.indexOf('    function buildReview('),html.indexOf('    function formatWrongList('));
 const context={SOLUTIONS:gf10.app.test.answers,TOTAL:61,MTTAnswerMatcher:matcher,equivalent:(a,b)=>String(a).trim().toLowerCase()===String(b).trim().toLowerCase()};
 vm.createContext(context);vm.runInContext(code,context);
 const answers=Object.fromEntries(context.SOLUTIONS.map(s=>[s.globalNumber,s.acceptedAnswers[0]]));
 Object.assign(answers,{45:'C.-',46:'C.will get',47:'B.the',48:'B. to experience',49:'A.whose'});
 const result=context.buildReview(answers);
 assert.equal(result.score,61);assert.equal(result.wrong,0);assert.equal(result.wrongNumbers.length,0);
 answers[48]='B. experience';assert.equal(context.buildReview(answers).score,60);
});
