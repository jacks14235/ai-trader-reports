import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, validateReport } from '../build.mjs';

const report = () => ({ id: '2026-10-13-daily', date: '2026-10-13', kind: 'daily', title: 'An audited wait', body_html: '<h1>An audited wait</h1>', source_sha256: 'a'.repeat(64), published_at: '2026-10-13T19:30:00Z' });
test('rejects active markup, unexpected fields and unsafe identifiers', () => {
  for (const bad of [ { body_html: '<img onerror="alert(1)">' }, { body_html: '<script>alert(1)</script>' }, { id: '../credentials' }, { token: 'private' } ]) {
    assert.throws(() => validateReport({ ...report(), ...bad }));
  }
});
test('build copies only public inputs and one shared chart asset with relative URLs', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'paper-site-'));
  const input = join(temp, 'content'), output = join(temp, 'dist');
  await mkdir(join(input, 'reports'), { recursive: true });
  await writeFile(join(input, 'reports', '2026-10-13-daily.json'), JSON.stringify(report()));
  await writeFile(join(input, 'portfolio.json'), JSON.stringify({ version: 1, as_of: null, series: [] }));
  await writeFile(join(temp, '.env'), 'DO_NOT_PUBLISH');
  assert.deepEqual(await build(input, output), { reports: 1 });
  assert.equal((await readdir(join(output, 'assets'))).filter(n => n === 'chart.js').length, 1);
  assert.ok(!(await readdir(output)).includes('.env'));
  const catalog = JSON.parse(await readFile(join(output, 'catalog.json'), 'utf8'));
  assert.ok(!('body_html' in catalog[0]));
  const index = await readFile(join(output, 'index.html'), 'utf8');
  assert.match(index, /src="\.\/assets\/chart.js"/);
  assert.match(index, /Content-Security-Policy/);
});
