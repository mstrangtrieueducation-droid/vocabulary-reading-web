import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const old='solution.acceptedAnswers.some(answer => equivalent(answer,submitted))';
const next='MTTAnswerMatcher.matches(solution,submitted,equivalent)';
const counts={};
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.')||['node_modules','scripts','tests'].includes(entry.name))continue;
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){visit(file);continue;}
  if(entry.name!=='index.html')continue;
  let html=fs.readFileSync(file,'utf8');
  if(!html.includes(old)&&!html.includes(next))continue;
  const app=JSON.parse(html.match(/const APP = (.*);/)[1]);
  const relative=path.relative(path.dirname(file),path.join(root,'test-assets/answer-matcher.js')).replaceAll('\\','/');
  if(!html.includes('data-answer-matcher'))html=html.replace(/<script>\s*(?=const APP =)/,`<script src="${relative}?v=20261101" data-answer-matcher></script>\n  <script>\n    `);
  if(!html.includes('data-answer-matcher'))throw new Error('Missing script insertion: '+file);
  html=html.replaceAll(old,next);
  // Reopened local attempts can be re-evaluated without silently rewriting saved scores.
  const sync='setSync(restored ? (localStorage.getItem(sentKey(record.attemptId)) ? "Đã lưu điểm" : "Điểm của lượt gần nhất") : "Đang lưu điểm…");';
  if(html.includes(sync) && !html.includes('điểm đã gửi trước đó chưa được cập nhật'))html=html.replace(sync,sync+'\n      if(restored && Number(record.score) !== result.score) setSync("Đã kiểm tra lại đáp án; điểm đã gửi trước đó chưa được cập nhật.");');
  fs.writeFileSync(file,html);
  counts[app.course.courseId]=(counts[app.course.courseId]||0)+1;
}}
visit(root);console.log(JSON.stringify(counts));
