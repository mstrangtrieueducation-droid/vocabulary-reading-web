const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const expected = {
  1:{36:'can/could/may/might',40:'However/Nevertheless/Nonetheless',41:'have/need/ought'},
  2:{30:'B',31:'A',38:'while',42:'although/though/but/yet',43:'can/could/may/might',44:'like',58:'D'},
  3:{18:'archaeologist'},4:{39:'particularly/especially',57:'D'},5:{52:'B'},
  6:{27:'D/B',38:'however/nevertheless/nonetheless'},7:{37:'those',42:'in'},
  8:{27:'C/D'},9:{38:'Firstly/First/Initially',42:'decisions/choices'},10:{31:'D/A'},11:{49:'D/C'}
};
let unitCount=0,total=0,variants=0;
for(const dir of fs.readdirSync(root)) {
 const p=path.join(root,dir,'index.html'); if(!fs.existsSync(p))continue;
 const html=fs.readFileSync(p,'utf8');
 const match=html.match(/<script id="ri2-unit-data" type="application\/json">([\s\S]*?)<\/script>/);
 if(!match)continue;
 const unit=JSON.parse(match[1]); const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 scripts.forEach(s=>new vm.Script(s));
 const sandbox={}; vm.runInNewContext(scripts.find(s=>s.includes('RI2 grading')),sandbox);
 const engine=sandbox.RI2Grading,qs=unit.sections.flatMap(s=>s.questions);
 assert.equal(qs.length,unit.total);assert.equal(new Set(qs.map(q=>q.number)).size,unit.total);
 const answers={};
 for(const q of qs) {
  if(expected[unit.unit]?.[q.number])assert.equal(q.answer,expected[unit.unit][q.number]);
  assert.ok(q.explanation.trim());
  const options=engine.acceptedAnswers(q);answers[q.number]=options[0];
  for(const a of options){assert.equal(engine.answersMatch(a,q),true);variants++;}
  assert.equal(engine.answersMatch('NOT AN ACCEPTED ANSWER',q),false);
 }
 assert.equal(engine.gradeAttempt(unit,answers).score,unit.total);
 assert.equal(engine.gradeAttempt(unit,{}).complete,false);
 const app=scripts.find(s=>s.includes('function renderAnswers()'));
 const refresh=app.slice(app.indexOf('  function renderAnswers() {')+'  function renderAnswers() {'.length,app.indexOf('    const container = $("answer-sections");',app.indexOf('  function renderAnswers() {')));
 const stale={submittedAt:'2026-09-01',answers,grade:{complete:true,score:0,total:unit.total,wrong:qs,results:[]},delivery:{state:'sent'},id:'preserved-id',number:1};
 const state={attempt:stale,unit,RI2Grading:engine}; vm.runInNewContext(refresh,state);
 assert.equal(stale.grade.score,unit.total);assert.equal(stale.delivery.state,'sent');assert.equal(stale.id,'preserved-id');assert.equal(stale.number,1);
 const draft={submittedAt:null,answers:{},grade:null};vm.runInNewContext(refresh,{attempt:draft,unit,RI2Grading:engine});assert.equal(draft.grade,null);
 if(unit.unit===2){for(const [n,bad] of [[30,'A'],[31,'D'],[38,'from'],[44,'led'],[58,'B']]) assert.equal(engine.answersMatch(bad,qs.find(q=>q.number===n)),false);}
 if(unit.unit===3)assert.equal(engine.answersMatch('archaeologists',qs.find(q=>q.number===18)),false);
 if(unit.unit===6)assert.equal(engine.answersMatch('neverthelesss',qs.find(q=>q.number===38)),false);
 unitCount++;total+=qs.length;
}
assert.equal(unitCount,12);assert.equal(total,761);
console.log(JSON.stringify({units:unitCount,questions:total,acceptedVariants:variants,restoredResults:'updated',submissionSideEffects:'none'},null,2));
