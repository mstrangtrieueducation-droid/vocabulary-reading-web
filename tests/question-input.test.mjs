import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import input from '../test-assets/question-input.js';
import matcher from '../test-assets/answer-matcher.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=[];
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(e.name.startsWith('.')||['scripts','tests','node_modules'].includes(e.name))continue;
 const p=path.join(dir,e.name);if(e.isDirectory()){visit(p);continue;}
 if(e.name==='index.html'){const html=fs.readFileSync(p,'utf8');if(html.includes('data-answer-matcher'))pages.push({p,html,app:JSON.parse(html.match(/const APP = (.*);/)[1])});}
}}visit(root);
function element(){return {children:[],style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(name,fn){this['on'+name]=fn;},append(...v){this.children.push(...v)}};}
test('every deployed renderer uses question metadata and clicking a choice saves its value',()=>{
 assert.equal(pages.length,90);let metadata=0;
 for(const {p,html,app} of pages){
  assert(html.indexOf('data-question-input')<html.indexOf('const APP ='));
  const start=html.indexOf('function renderRows()');const end=html.indexOf('\n    function ',start+10);
  const nodes={};const answers={};
  const ctx={SECTIONS:app.test.sections,SOLUTIONS:app.test.answers,current:0,answers,graded:false,PRODUCTION_READY:true,
   solutionByGlobal:new Map(app.test.answers.map(s=>[s.globalNumber,s])),MTTQuestionInput:input,document:{createElement:element},norm:v=>String(v||'').trim(),
   $:id=>nodes[id]||(nodes[id]=element()),range:s=>Array.from({length:s.count},(_,i)=>s.start+i),
   setAnswer:(n,v)=>{answers[n]=v;}};
  // Existing sections use startNumber rather than start in some course schemas.
  ctx.range=s=>app.test.answers.filter(a=>(a.exerciseNumber===s.exerciseNumber && s.exerciseNumber!==undefined)||(a.sectionCode===s.sectionCode && s.sectionCode!==undefined)).map(a=>a.globalNumber);
  vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
  for(let i=0;i<ctx.SECTIONS.length;i++){
   ctx.current=i;nodes.rows=element();ctx.renderRows();
   const numbers=ctx.range(ctx.SECTIONS[i]);
   for(let j=0;j<numbers.length;j++){
    const solution=ctx.SOLUTIONS.find(a=>a.globalNumber===numbers[j]);
    if(!solution.choices)continue;metadata++;
    const choices=nodes.rows.children[j].children[1].children;
    assert.equal(choices.length,solution.choices.length,p);
    choices[0].onclick();assert.equal(answers[numbers[j]],solution.choices[0]);
    assert(solution.choices.some(v=>matcher.matches(solution,v)),p+' '+numbers[j]);
   }
  }
 }
 assert.equal(metadata,138);
});
test('zero, dash and empty answers stay distinct; mixed sections retain free text',()=>{
 const noArticle={acceptedAnswers:['ø'],displayAnswer:'Ø'};
 for(const v of ['0','-','–','Ø'])assert(matcher.matches(noArticle,v));
 for(const v of ['', ' ', 'a', 'the'])assert(!matcher.matches(noArticle,v));
 assert(!matcher.matches({acceptedAnswers:['the'],displayAnswer:'the'},'0'));
 const section={inputType:'text'};assert.equal(input.forQuestion(section,{}),section);
 assert.equal(input.forQuestion(section,{choices:['A','B']}).inputType,'letters');
 assert(input.selected('B. to experience','B',{choiceLabels:{B:'B. to experience'}}));
});
