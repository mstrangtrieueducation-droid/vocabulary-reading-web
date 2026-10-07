const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const html = readFileSync(resolve(__dirname, '../gf-tests/515b39e5d27e853ed7990bef26a777e4/index.html'), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1].replace(/\n    load\(\);/, '');
const elements = new Map();
const storage = new Map();
const context = vm.createContext({
  document: {getElementById(id) {
    if (!elements.has(id)) elements.set(id, {addEventListener() {}});
    return elements.get(id);
  }},
  localStorage: {getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k)},
  setTimeout() { throw Error('Unexpected submission/retry'); }
});
vm.runInContext(script + '\n globalThis.api = {APP, questions, range, locate, completeAnswers, buildReview, ACTIVE_KEY, LAST_KEY, HISTORY_KEY};', context);
const api = context.api;
const plain = x => JSON.parse(JSON.stringify(x));
const expected = [...Array.from({length:17},(_,i)=>i+1), ...Array.from({length:24},(_,i)=>i+23)];
const answers = Object.fromEntries(api.APP.test.answers.map(a=>[a.globalNumber,a.acceptedAnswers[0]]));

test('41 source numbers across five renumbered exercises, including 42–46', () => {
  assert.equal(api.APP.test.total, 41);
  assert.deepEqual(plain(api.questions), expected);
  assert.deepEqual(plain(api.APP.test.sections.map(s=>[s.exerciseNumber,s.startGlobal,s.count])), [[1,1,7],[2,8,10],[3,23,4],[4,27,11],[5,38,9]]);
  assert.deepEqual(plain(api.APP.test.sections.flatMap(api.range)), expected);
  for(const answer of api.APP.test.answers) {
    const place = api.locate(answer.globalNumber);
    assert.equal(place.exercise,answer.exerciseNumber);
    assert.equal(place.local,answer.localNumber);
    assert.ok(answer.explanation);
  }
});
test('deleted answers are not required; all remaining source numbers are required', () => {
  assert.equal(api.completeAnswers(answers), true);
  for(const n of expected) {
    const partial = {...answers}; delete partial[n];
    assert.equal(api.completeAnswers(partial), false, `missing ${n}`);
  }
  assert.equal(api.completeAnswers(Object.fromEntries(Array.from({length:41},(_,i)=>[i+1,'x']))), false);
});
test('grading uses 41 denominator, ignores removed numbers, and reviews high numbers', () => {
  const perfect = api.buildReview({...answers,18:'obsolete',19:'obsolete',20:'obsolete',21:'obsolete',22:'obsolete'});
  assert.equal(perfect.score,41); assert.equal(perfect.percent,100); assert.equal(perfect.wrong,0);
  const oneWrong = api.buildReview({...answers,46:'A'});
  assert.equal(oneWrong.score,40); assert.equal(oneWrong.percent,98);
  assert.deepEqual(plain(oneWrong.wrongNumbers),[46]);
  const empty = api.buildReview({});
  assert.equal(empty.score,0); assert.equal(empty.wrong,41);
  assert.deepEqual(plain(empty.wrongNumbers),expected);
});
test('old 46-question attempts stay separate; original identity, history and submission route remain', () => {
  assert.match(api.ACTIVE_KEY, /active:20261007-41q$/);
  assert.match(api.LAST_KEY, /last:20261007-41q$/);
  assert.match(api.HISTORY_KEY, /grammar-foundation-u07:history:v1$/);
  assert.equal(api.APP.test.testId,'grammar-foundation-u07');
  assert.equal(api.APP.test.docId,'15pcpsmVLMip3RLKtTiQXje6S72WCU6F10rZtePGJkuw');
  assert.match(api.APP.course.scoreSink.formResponseUrl, /1FAIpQLSd9HJvGOR7VUETE-KRfvWCsQPQPEshLq_NiFNWVvA04Sicl6g/);
});
