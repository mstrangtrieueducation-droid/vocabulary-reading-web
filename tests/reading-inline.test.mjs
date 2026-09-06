import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { planInline, createInlineGroup } from '../reading-inline.mjs';
const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'reading-inline-manifest.json')));
const inventory = [];
for (const entry of manifest) {
  const source = fs.readFileSync(path.join(root, entry.directory, entry.previous), 'utf8');
  const start = source.indexOf('questions:[{') + 'questions:'.length;
  let end = start, depth = 0, quote = '';
  for (; end < source.length; end++) {
    const c = source[end];
    if (quote) { if (c === '\\') end++; else if (c === quote) quote = ''; continue; }
    if ('\'"`'.includes(c)) { quote = c; continue; }
    if (c === '[') depth++;
    if (c === ']' && --depth === 0) { end++; break; }
  }
  assert(start > 0 && end > start);
  const questions = vm.runInNewContext('(' + source.slice(start, end) + ')');
  inventory.push({ ...entry, questions });
}
test('all 12 lesson datasets preserve one-to-one question IDs and exact paragraph text', () => {
  let groups = 0, gaps = 0;
  for (const { directory, questions } of inventory) {
    const grouped = new Map();
    for (const q of questions) { const key = q.reading + q.section + q.group; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(q); }
    for (const items of grouped.values()) {
      const label = items[0].group;
      const plan = planInline(label, items);
      if (!plan) continue;
      const bindings = plan.flat().filter(x => typeof x !== 'string');
      assert.equal(bindings.length, items.length);
      assert.equal(new Set(bindings.map(x => x.question.id)).size, items.length);
      assert.equal(plan.map(p => p.map(x => typeof x === 'string' ? x : `(${x.number}) ____`).join('')).join('\n\n'), label.replace(/\((\d+)\)\s*_+(?:[ \t]+_+)*/g, '($1) ____'));
      groups++; gaps += bindings.length;
    }
    assert(questions.length > 0, directory);
  }
  console.log(JSON.stringify({ lessons: inventory.length, groups, gaps }));
  assert(groups >= 12);
});
test('ambiguous, repeated or missing gap numbers fall back without hiding questions', () => {
  const items = [{ id: 'x', prompt: '1. Example', kind: 'text' }];
  assert.equal(planInline('Fill.\n\n(2) ____', items), null);
  assert.equal(planInline('Fill.\n\n(1) ____ (1) ____', items), null);
  assert.equal(planInline('Fill.\n\nNo blank.', items), null);
  assert.equal(planInline('Fill.\n\n(1) ____', [...items, { ...items[0], id: 'y' }]), null);
});
test('selection, manual inflection, grading and reset share parent answer state', () => {
  const items = inventory.find(x => x.directory === 'ri3-n8w2c6r5').questions.filter(q => /^A-V[1-5]$/.test(q.id));
  const jsx = (type, props, key) => ({ type, props, key });
  const Group = createInlineGroup({ jsx, jsxs: jsx }, (q, value) => value === q.answer, (q, value) => value, q => q.source);
  const props = { label: items[0].group, items, answers: {}, words: {}, submitted: false, setAnswer: (id,v) => props.answers[id]=v, setWord: (id,v) => props.words[id]=v };
  function controls(node, type, output = []) { if (!node || typeof node !== 'object') return output; if (node.type === type) output.push(node); for (const c of [node.props?.children].flat(Infinity)) controls(c, type, output); return output; }
  let tree = Group(props);
  assert.equal(controls(tree, 'select').length, 5);
  assert.equal(controls(tree, 'input')[2].props.disabled, true);
  controls(tree, 'select')[2].props.onChange({ target: { value: 'devote' } });
  tree = Group(props);
  assert.equal(controls(tree, 'input')[2].props.value, 'devote');
  controls(tree, 'input')[2].props.onChange({ target: { value: 'devoted' } });
  assert.equal(props.answers['A-V3'], 'devoted');
  assert.equal(props.words['A-V3'], 'devote');
  props.submitted = true;
  tree = Group(props);
  assert(controls(tree, 'select').every(n => n.props.disabled));
  assert(controls(tree, 'input').every(n => n.props.disabled));
  assert.equal(controls(tree, 'article').length, 5);
  props.submitted = false; props.answers = {}; props.words = {};
  assert(controls(Group(props), 'input').every(n => n.props.value === ''));
});
