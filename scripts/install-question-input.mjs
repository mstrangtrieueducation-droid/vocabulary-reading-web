import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let count=0;
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 if(entry.name.startsWith('.')||['node_modules','scripts','tests'].includes(entry.name))continue;
 const file=path.join(dir,entry.name);if(entry.isDirectory()){visit(file);continue;}
 if(entry.name!=='index.html')continue;
 let html=fs.readFileSync(file,'utf8');if(!html.includes('data-answer-matcher'))continue;
 html=html.replaceAll('answer-matcher.js?v=20261101','answer-matcher.js?v=20261102');
 if(!html.includes('data-question-input')){
  const relative=path.relative(path.dirname(file),path.join(root,'test-assets/question-input.js')).replaceAll('\\','/');
  html=html.replace(/<script>\s*(?=const APP =)/,`<script src="${relative}?v=20261102" data-question-input></script>\n<script>\n`);
  const start=html.indexOf('function renderRows()');const end=html.indexOf('\n    function ',start+10);
  if(start<0||end<0)throw Error(file);
  let body=html.slice(start,end);
  body=body.replace('const row = document.createElement("div");', 'const row = document.createElement("div");\n        const inputSpec = MTTQuestionInput.forQuestion(section, SOLUTIONS.find(solution => solution.globalNumber === globalNumber));');
  if(!body.includes('const inputSpec'))throw Error('Unknown renderer: '+file);
  body=body.replaceAll('section.inputType','inputSpec.inputType').replaceAll('section.choices','inputSpec.choices');
  body=body.replaceAll('button.textContent = letter;', 'button.textContent = inputSpec.choiceLabels?.[letter] || letter;');
  body=body.replaceAll('if(answers[globalNumber] === letter)', 'if(MTTQuestionInput.selected(answers[globalNumber],letter,inputSpec))');
  body=body.replace('letters.className = "letters";', 'letters.className = "letters";\n          if(inputSpec.choiceLabels || (inputSpec.choices || []).some(value => value.length > 4)) letters.classList.add("word-choices");');
  body=body.replace('input.autocomplete = "off";', 'input.autocomplete = "off";\n          input.placeholder = "Không cần điền từ: nhập 0 hoặc -";');
  html=html.slice(0,start)+body+html.slice(end);
  html=html.replace('</head>','<style>.letters.word-choices{display:flex;flex-wrap:wrap}.letters.word-choices button{flex:1 1 110px;white-space:normal;overflow-wrap:anywhere;height:auto;min-height:44px;padding:10px}</style>\n</head>');
 }
 fs.writeFileSync(file,html);count++;
}}
visit(root);console.log({pages:count});
