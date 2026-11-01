import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeUnit,classifyDocument,resolveDocument,selectDocument} from '../gf-assets/document-binding.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'scripts/grammar-document-catalog.json'),'utf8'));
const bindings=JSON.parse(fs.readFileSync(path.join(root,'scripts/grammar-document-bindings.json'),'utf8'));

test('exact unit and role selection handles decimals, accents and surrounding spaces',()=>{
  assert.equal(normalizeUnit(' Unit 04_1 '),'4.1');
  assert.notEqual(selectDocument(catalog,'4.1','theory').id,selectDocument(catalog,'4.2','theory').id);
  assert.equal(selectDocument(catalog,'03','theory').id,'1T1YNHqVTfR7pohemwCp-RKOzeYqnWz4iofebUef2X04');
  assert.equal(classifyDocument('Unit 2_Lí thuyết ').role,'theory');
});
test('wrong-role, wrong-unit, missing and ambiguous resources fail closed',()=>{
  assert.throws(()=>resolveDocument(selectDocument(catalog,'3','test'),'3','theory'));
  assert.throws(()=>resolveDocument(selectDocument(catalog,'4.2','theory'),'4.1','theory'));
  assert.throws(()=>selectDocument(catalog,'99','theory'));
  assert.throws(()=>selectDocument([...catalog,selectDocument(catalog,'3','theory')],'3','theory'));
  assert.throws(()=>normalizeUnit('3 wrong'));
});
test('all 23 deployed theory pages use the shared role guard and matching document',()=>{
  assert.equal(bindings.length,23);
  for(const row of bindings){
    const html=fs.readFileSync(path.join(root,row.route,'index.html'),'utf8');
    const entryName=html.match(/src="\.\/([^"\s]+\.mjs)"/)[1];
    const entry=fs.readFileSync(path.join(root,row.route,entryName),'utf8');
    const moduleImport=entry.match(/import App from '([^']+)'/)[1];
    const modulePath=path.resolve(root,row.route,moduleImport);
    assert.equal(modulePath,path.resolve(root,row.module));
    const code=fs.readFileSync(modulePath,'utf8');
    const match=code.match(/docId:resolveDocument\((\{[^\n]+?\}),"([^"]+)","theory"\)/);
    assert(match,row.route);
    assert.equal(resolveDocument(JSON.parse(match[1]),match[2],'theory'),selectDocument(catalog,row.unit,'theory').id);
    assert(!/\?\?[TE]\[`01`\]/.test(code));
    assert(code.includes('src:x') && /href:[wS],target:`_blank`/.test(code)); // Both embed and full-screen link use the resolved document.
    const helper=code.match(/import \{resolveDocument\} from "([^"]+)"/)[1];
    assert(fs.existsSync(path.resolve(path.dirname(modulePath),helper)));
  }
});
test('all 23 active test pages retain their matching test documents',()=>{
  let count=0;
  for(const folder of fs.readdirSync(path.join(root,'gf-tests'))){
    const text=fs.readFileSync(path.join(root,'gf-tests',folder,'index.html'),'utf8');
    const match=text.match(/const APP = (.*);/);
    if(!match)continue;
    const data=JSON.parse(match[1]).test;
    assert.equal(data.docId,selectDocument(catalog,data.unitLabel,'test').id,folder);
    count++;
  }
  assert.equal(count,23);
});
