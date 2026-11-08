// Link shared/review-scroll.css into every retake page that has the post-grading review panel.
// Practice Test pages switch to a page-scrolling phone layout below 1101px, so the link only applies above that;
// GF/VF pages keep a fixed-height panel at every width, so it applies everywhere.
// Usage: node scripts/install-review-scroll.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '20261109';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const pages = [];
const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.pages-output'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'index.html') pages.push(full);
  }
};
walk(root);

let changed = 0, linked = 0;
const problems = [];
for (const file of pages) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('class="review-tools"') || !html.includes('id="result"')) continue;
  const rel = path.relative(root, file).split(path.sep);
  const href = '../'.repeat(rel.length - 1) + `shared/review-scroll.css?v=${VERSION}`;
  const practice = html.includes('data-practice-retake-review');
  const media = practice ? ' media="(min-width:1101px)"' : '';
  const tag = `<link rel="stylesheet" href="${href}"${media} data-review-scroll>`;
  const existing = html.match(/<link[^>]*data-review-scroll[^>]*>/);
  linked++;
  if (existing && existing[0] === tag) continue;
  if (check) { problems.push(rel.join('/')); continue; }
  if (existing) html = html.replace(existing[0], tag);
  else {
    if (!html.includes('</head>')) { problems.push('NO_HEAD ' + rel.join('/')); continue; }
    const eol = html.includes('\r\n') ? '\r\n' : '\n';
    html = html.replace('</head>', tag + eol + '</head>');
  }
  fs.writeFileSync(file, html);
  changed++;
}
console.log(JSON.stringify({ pagesWithReview: linked, changed, problems }));
if (problems.length) process.exitCode = 1;
