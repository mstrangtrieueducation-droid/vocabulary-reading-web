import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'reading-progress-manifest.json'), 'utf8'));

test('all RI3/4/5 lessons use the progress-enabled entry points', () => {
  assert.equal(manifest.routes.length, 36);
  for (const route of manifest.routes) {
    const html = fs.readFileSync(path.join(root, route.directory, 'index.html'), 'utf8');
    assert.ok(html.includes(route.next), `${route.directory} must load its progress entry`);
    assert.ok(html.includes(manifest.css), `${route.directory} must load progress styles`);
  }
});

test('progress code saves, restores and clears drafts after submission', () => {
  const sources = new Set([manifest.common]);
  for (const route of manifest.routes.filter(route => route.level === 3)) {
    sources.add(path.join(route.directory, route.next));
  }
  for (const relative of sources) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const expected of [
      'ri-progress-v1:',
      '__riHasProgress',
      'Kế hoạch làm bài trong tuần',
      'localStorage.removeItem(__riKey)',
      '__riHasProgress(e)&&(t(`practice`)',
    ]) {
      assert.ok(source.includes(expected), `${relative} is missing ${expected}`);
    }
  }
});
