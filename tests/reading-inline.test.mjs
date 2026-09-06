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
      if (/\(\d+\)\s*_/.test(label) && items.every(q => ['text', 'choice'].includes(q.kind))) {
        assert(plan, `${directory} ${items[0].id}: every current paragraph with separate gap questions must render inline`);
      }
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
  assert.equal(groups, 44);
  assert.equal(gaps, 220);
});
test('ambiguous, repeated or missing gap numbers fall back without hiding questions', () => {
  const items = [{ id: 'x', prompt: '1. Example', kind: 'text' }];
  assert.equal(planInline('Fill.\n\n(2) ____', items), null);
  assert.equal(planInline('Fill.\n\n(1) ____ (1) ____', items), null);
  assert.equal(planInline('Fill.\n\nNo blank.', items), null);
  assert.equal(planInline('Fill.\n\n(1) ____', [...items, { ...items[0], id: 'y' }]), null);
  assert.equal(planInline('Fill.\n\n(1) ____', [items[0], { ...items[0], id: 'y', prompt: 'Gap 1' }]), null);
});
test('short gap labels bind by explicit number even when questions are out of order', () => {
  const items = [{ id: 'second', prompt: 'Gap 2', kind: 'text' }, { id: 'first', prompt: 'Blank 1', kind: 'text' }];
  const plan = planInline('Fill.\n\nThe (1) ____ comes before (2) ____.', items);
  assert.deepEqual(plan.flat().filter(x => typeof x !== 'string').map(x => x.question.id), ['first', 'second']);
  assert.equal(planInline('Fill.\n\n(1) ____', [{ ...items[0], prompt: 'Gap 10' }]), null);
  assert.equal(planInline('Fill.\n\n(1) ____', [{ ...items[0], prompt: 'Gap 1st' }]), null);
});
test('Unit 2A beauty summary renders all five Gap labels as editable inline inputs', () => {
  const items = inventory.find(x => x.directory === 'ri3-n8w2c6r5').questions.filter(q => q.reading === 'A' && q.section === 'Summary');
  assert.equal(items.length, 5);
  assert(items.every(q => /^Gap \d+$/.test(q.prompt)));
  const plan = planInline(items[0].group, items);
  assert(plan, 'The screenshot summary must not fall back to detached question cards');
  assert.deepEqual(plan.flat().filter(x => typeof x !== 'string').map(x => x.number), [1, 2, 3, 4, 5]);
});
test('inline choices display words while preserving encoded answer values', () => {
  const items = inventory.find(x => x.directory === 'ri3-c9w4k7p2').questions.filter(q => q.reading === 'B' && /^B-V[1-5]$/.test(q.id));
  assert.equal(items.length, 5);
  const jsx = (type, props, key) => ({ type, props, key });
  const Group = createInlineGroup({ jsx, jsxs: jsx }, (q, value) => value === q.answer, (q, value) => q.options.find(o => o.value === value)?.label ?? value, q => q.source);
  const props = { label: items[0].group, items, answers: {}, words: {}, submitted: false, setAnswer: (id,v) => props.answers[id]=v, setWord: (id,v) => props.words[id]=v };
  function nodes(node, type) { return !node || typeof node !== 'object' ? [] : [...(node.type === type ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(c => nodes(c, type))]; }
  let tree = Group(props);
  assert.equal(nodes(tree, 'input').length, 0);
  assert.equal(nodes(tree, 'select').length, 5);
  assert.equal(nodes(tree, 'option')[2].props.children, 'packages');
  nodes(tree, 'select')[0].props.onChange({ target: { value: 'b' } });
  assert.equal(props.answers['B-V1'], 'b');
  props.submitted = true;
  tree = Group(props);
  assert(nodes(tree, 'select').every(n => n.props.disabled));
  assert(nodes(tree, 'p').some(n => n.props.children === 'Bạn trả lời: packages'));
  assert.equal(planInline('Fill.\n\n(1) ____ (2) ____', [{ id: 'multi', kind: 'multi-choice', prompt: '1. Select two', options: items[0].options }]), null);
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
