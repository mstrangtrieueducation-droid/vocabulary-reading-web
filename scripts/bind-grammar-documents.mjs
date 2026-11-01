import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {selectDocument} from '../gf-assets/document-binding.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root,'scripts/grammar-document-catalog.json'),'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0,12);
const report = [];
for (const folder of fs.readdirSync(path.join(root,'gf-theory'))) {
  const page = path.join(root,'gf-theory',folder,'index.html');
  let html = fs.readFileSync(page,'utf8');
  if (!html.includes('id="grammar-root"')) continue; // Retired links stay retired.
  const entryName = html.match(/src="\.\/([^"\s]+\.mjs)"/)[1];
  const entryPath = path.join(path.dirname(page),entryName);
  let entry = fs.readFileSync(entryPath,'utf8');
  const moduleImport = entry.match(/import App from '([^']+)'/)[1];
  const modulePath = path.resolve(path.dirname(page),moduleImport);
  let code = fs.readFileSync(modulePath,'utf8');
  const unit = code.match(/unit:`([^`]+)`/)[1];
  const record = selectDocument(catalog, unit, 'theory');
  const binding = `docId:resolveDocument(${JSON.stringify(record)},${JSON.stringify(unit)},"theory")`;
  const pattern = /docId:(?:`[^`]+`|resolveDocument\([^\n]*?,"theory"\))/;
  assert.equal([...code.matchAll(new RegExp(pattern.source,'g'))].length,1);
  code = code.replace(pattern,binding);
  if (!code.includes('import {resolveDocument}')) code = 'import {resolveDocument} from "../../../../document-binding.mjs";\n' + code;
  code = code.replace(/([TE])\[e\.unit\]\?\?\1\[`01`\]/g,'$1[e.unit]');
  assert(!code.includes('??T[`01`]') && !code.includes('??E[`01`]'));
  const moduleName = `lesson-${code.match(/session:`([^`]+)`/)[1]}.${hash(code)}.mjs`;
  fs.writeFileSync(path.join(path.dirname(modulePath),moduleName),code);
  entry = entry.replace(moduleImport,moduleImport.replace(/[^/]+$/,moduleName));
  const nextEntry = `lesson-entry.${hash(entry)}.mjs`;
  fs.writeFileSync(path.join(path.dirname(page),nextEntry),entry);
  html = html.replace('./'+entryName,'./'+nextEntry);
  fs.writeFileSync(page,html);
  report.push({unit,route:`gf-theory/${folder}/`,docId:record.id,title:record.title,module: path.relative(root,path.join(path.dirname(modulePath),moduleName)).replaceAll('\\','/')});
}
assert.equal(report.length,23);
fs.writeFileSync(path.join(root,'scripts/grammar-document-bindings.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({theoryPages:report.length,exactUnitAndRole:true}));
