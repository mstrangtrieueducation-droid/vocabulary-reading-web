import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
}

function patchCourse(source, label) {
  const start = source.indexOf('function pt({back:e,studentName:t,studentClass:n})');
  const end = source.indexOf('function mt()', start);
  if (start < 0 || end < start) throw new Error(`${label}: practice component not found`);

  let practice = source.slice(start, end);
  const oldState = 'function pt({back:e,studentName:t,studentClass:n}){let[r,i]=(0,h.useState)(`A`),[a,o]=(0,h.useState)({}),[s,c]=(0,h.useState)({}),[l,u]=(0,h.useState)({}),[d,f]=(0,h.useState)(!1),[p,m]=(0,h.useState)(`idle`),[g,_]=(0,h.useState)({}),v=';
  const newState = 'function __riDraftKey(e,t){return`ri-progress-v1:${Re.level}:${Ke}:${encodeURIComponent((t||``).trim().toUpperCase())}:${encodeURIComponent((e||``).trim().toUpperCase())}`}function __riHasProgress(e){return!!e&&(Object.values(e.answers??{}).some(e=>String(e??``).trim())||Object.values(e.notes??{}).some(e=>String(e??``).trim())||Object.values(e.sketch??{}).some(e=>Array.isArray(e)&&e.length))}function __riReadDraft(e,t){try{return JSON.parse(localStorage.getItem(__riDraftKey(e,t)))||null}catch{return null}}function pt({back:e,studentName:t,studentClass:n}){let __riKey=__riDraftKey(t,n),__riDraft=__riReadDraft(t,n),[H]=(0,h.useState)(()=>__riHasProgress(__riDraft)),[r,i]=(0,h.useState)(()=>__riDraft?.reading??`A`),[a,o]=(0,h.useState)(()=>__riDraft?.answers??{}),[s,c]=(0,h.useState)(()=>__riDraft?.words??{}),[l,u]=(0,h.useState)(()=>__riDraft?.notes??{}),[d,f]=(0,h.useState)(!1),[p,m]=(0,h.useState)(`idle`),[g,_]=(0,h.useState)(()=>__riDraft?.sketch??{}),[w,j]=(0,h.useState)(()=>H?__riDraft?.savedAt??0:0);(0,h.useEffect)(()=>{if(d||!__riHasProgress({answers:a,notes:l,sketch:g}))return;let e=setTimeout(()=>{let e=Date.now();try{localStorage.setItem(__riKey,JSON.stringify({reading:r,answers:a,words:s,notes:l,sketch:g,savedAt:e})),j(e)}catch{}},180);return()=>clearTimeout(e)},[__riKey,r,a,s,l,g,d]);let v=';
  practice = replaceOnce(practice, oldState, newState, `${label} state`);

  practice = replaceOnce(
    practice,
    'await fetch(de,{method:`POST`,mode:`no-cors`,credentials:`omit`,body:o}),m(`sent`)',
    'await fetch(de,{method:`POST`,mode:`no-cors`,credentials:`omit`,body:o}),localStorage.removeItem(__riKey),m(`sent`)',
    `${label} submit cleanup`,
  );
  practice = replaceOnce(
    practice,
    'function re(){o({}),c({}),u({}),_({}),f(!1),m(`idle`),i(`A`)',
    'function re(){localStorage.removeItem(__riKey),o({}),c({}),u({}),_({}),f(!1),m(`idle`),i(`A`)',
    `${label} retry cleanup`,
  );

  const banner = '(0,O.jsxs)(`aside`,{className:`study-plan-banner`,children:[(0,O.jsx)(`strong`,{children:`Kế hoạch làm bài trong tuần`}),(0,O.jsx)(`span`,{children:`Mỗi lần con nên tập trung hoàn thành trọn một passage (Reading A hoặc Reading B), rồi lần sau làm tiếp passage còn lại.`}),(0,O.jsx)(`small`,{children:w?`${H?`Đã khôi phục tiến độ · `:`Đã tự lưu · `}${new Date(w).toLocaleTimeString(`vi-VN`,{hour:`2-digit`,minute:`2-digit`})} · trên thiết bị này`:`Tiến độ sẽ tự lưu trên thiết bị này.`})]}),';
  practice = replaceOnce(
    practice,
    ']}),d&&(0,O.jsxs)(`section`,{className:`score-banner`',
    `]}),${banner}d&&(0,O.jsxs)(\`section\`,{className:\`score-banner\``,
    `${label} study banner`,
  );

  source = source.slice(0, start) + practice + source.slice(end);
  source = replaceOnce(
    source,
    'a(i.trim()),l(!0)}}):(0,O.jsx)(mt,{})',
    'a(i.trim()),l(!0);let e=__riReadDraft(i.trim(),o);__riHasProgress(e)&&(t(`practice`),r(e.reading??`A`))}}):(0,O.jsx)(mt,{})',
    `${label} resume navigation`,
  );
  return source;
}

const progressCss = `.study-plan-banner{display:grid;gap:.38rem;margin:0 0 1.25rem;padding:1rem 1.15rem;border:1px solid #b8d8ec;border-left:5px solid #1671c5;border-radius:14px;background:#eef8ff;color:#153b59}.study-plan-banner strong{font-size:1rem;color:#0b3d68}.study-plan-banner span{line-height:1.5}.study-plan-banner small{font-weight:700;color:#41647d}@media(max-width:700px){.study-plan-banner{margin-bottom:1rem;padding:.9rem 1rem}.study-plan-banner span{font-size:.94rem}}\n`;
const cssName = `reading-progress.${hash(progressCss)}.css`;
fs.writeFileSync(path.join(root, cssName), progressCss);

const routes = fs.readdirSync(root).filter(name => /^[0-9a-f]{32}$/.test(name)).flatMap(directory => {
  const htmlPath = path.join(root, directory, 'index.html');
  if (!fs.existsSync(htmlPath)) return [];
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
  const match = html.match(/Reading Intensive ([345]) · Unit (\d+)/);
  return match ? [{ directory, htmlPath, html, level: Number(match[1]), unit: Number(match[2]) }] : [];
});
if (routes.length !== 36) throw new Error(`Expected 36 RI3/4/5 routes, found ${routes.length}`);

const commonName = routes.filter(route => route.level >= 4).map(route => {
  const entry = route.html.match(/<script[^>]+src="\.\/(entry\.[^"]+\.mjs)"/);
  if (!entry) throw new Error(`${route.directory}: entry module not found`);
  const entryText = fs.readFileSync(path.join(root, route.directory, entry[1]), 'utf8');
  const common = entryText.match(/\.\.\/(reading-course\.[a-f0-9]+\.mjs)/);
  if (!common) throw new Error(`${route.directory}: shared course module not found`);
  return common[1];
})[0];
if (!commonName) throw new Error('Shared RI4/5 course module not found');

const commonSource = fs.readFileSync(path.join(root, commonName), 'utf8');
const patchedCommon = patchCourse(commonSource, commonName);
const nextCommonName = `reading-course-progress.${hash(patchedCommon)}.mjs`;
fs.writeFileSync(path.join(root, nextCommonName), patchedCommon);

const manifest = [];
for (const route of routes) {
  let html = route.html;
  let previous;
  let next;
  if (route.level === 3) {
    const match = html.match(/<script[^>]+src="\.\/(assets\/index-inline-[^"]+\.js)"/);
    if (!match) throw new Error(`${route.directory}: RI3 bundle not found`);
    previous = match[1];
    const currentSource = fs.readFileSync(path.join(root, route.directory, previous), 'utf8');
    const patched = patchCourse(currentSource, `${route.directory}/${previous}`);
    next = `assets/index-progress-${hash(patched)}.js`;
    fs.writeFileSync(path.join(root, route.directory, next), patched);
  } else {
    const match = html.match(/<script[^>]+src="\.\/(entry\.[^"]+\.mjs)"/);
    if (!match) throw new Error(`${route.directory}: RI4/5 entry not found`);
    previous = match[1];
    const currentEntry = fs.readFileSync(path.join(root, route.directory, previous), 'utf8');
    const patchedEntry = currentEntry.replace(/\.\.\/reading-course\.[a-f0-9]+\.mjs/, `../${nextCommonName}`);
    if (patchedEntry === currentEntry) throw new Error(`${route.directory}: course import not updated`);
    next = `entry.progress.${hash(patchedEntry)}.mjs`;
    fs.writeFileSync(path.join(root, route.directory, next), patchedEntry);
  }
  html = html.replace(`src="./${previous}"`, `src="./${next}"`);
  html = html.replace(/\s*<link rel="stylesheet" href="\.\.\/reading-progress\.[a-f0-9]+\.css">/g, '');
  html = html.replace('</head>', `<link rel="stylesheet" href="../${cssName}">\n</head>`);
  fs.writeFileSync(route.htmlPath, html);
  manifest.push({ level: route.level, unit: route.unit, directory: route.directory, previous, next });
}

manifest.sort((a, b) => a.level - b.level || a.unit - b.unit);
fs.writeFileSync(path.join(root, 'tests', 'reading-progress-manifest.json'), JSON.stringify({ common: nextCommonName, css: cssName, routes: manifest }, null, 2) + '\n');
console.log(`Added autosave and resume to ${manifest.length} Reading Intensive 3/4/5 lessons.`);
