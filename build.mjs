import { readFile, readdir, mkdir, copyFile, writeFile, rm, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
export const reportId = /^\d{4}-\d{2}-\d{2}-(daily|evening)$/;
export function validateReport(report) {
  const keys = ['id', 'date', 'kind', 'title', 'body_html', 'source_sha256', 'published_at'];
  if (Object.keys(report).sort().join() !== keys.sort().join()
      || !reportId.test(report.id) || report.id !== `${report.date}-${report.kind}`
      || !['daily', 'evening'].includes(report.kind)
      || typeof report.title !== 'string' || report.title.length > 300
      || typeof report.body_html !== 'string' || report.body_html.length > 2_000_000
      || !/^[a-f0-9]{64}$/.test(report.source_sha256)
      || !Number.isFinite(Date.parse(report.published_at))
      || /<(script|iframe|object|embed|form|link|meta|base)\b|\bon\w+\s*=|javascript:|url\s*\(/i.test(report.body_html)) {
    throw new Error('Invalid or unsafe public report');
  }
  return report;
}

export async function build(input = join(root, 'content'), output = join(root, 'dist')) {
  // Only this dedicated output directory is replaced. Source/runtime files are never copied.
  if (resolve(input) === resolve(output)) throw new Error('Input and output must differ');
  const reports = [];
  for (const name of (await readdir(join(input, 'reports'))).sort()) {
    if (name === '.gitkeep') continue;
    if (!name.endsWith('.json') || !(await lstat(join(input, 'reports', name))).isFile()) {
      throw new Error('Unexpected report file');
    }
    const report = validateReport(JSON.parse(await readFile(join(input, 'reports', name), 'utf8')));
    if (name !== `${report.id}.json`) throw new Error('Report filename mismatch');
    reports.push(report);
  }
  const portfolio = JSON.parse(await readFile(join(input, 'portfolio.json'), 'utf8'));
  if (portfolio.version !== 1 || !Array.isArray(portfolio.series)) throw new Error('Invalid portfolio');
  for (const series of portfolio.series) {
    if (typeof series.label !== 'string' || !Array.isArray(series.points)
        || !(Number(series.starting_equity) > 0)) throw new Error('Invalid portfolio series');
    for (const point of series.points) {
      if (!Number.isFinite(Date.parse(point.at)) || !Number.isFinite(Number(point.equity))
          || Number(point.equity) < 0) throw new Error('Invalid portfolio observation');
    }
  }
  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, 'assets'), { recursive: true });
  await mkdir(join(output, 'reports'), { recursive: true });
  for (const name of ['index.html', 'app.js', 'style.css']) {
    await copyFile(join(root, 'src', name), join(output, name === 'index.html' ? name : `assets/${name}`));
  }
  await copyFile(join(root, 'node_modules/chart.js/dist/chart.umd.js'), join(output, 'assets/chart.js'));
  await copyFile(join(root, 'node_modules/chart.js/LICENSE.md'), join(output, 'assets/chartjs-license.txt'));
  await copyFile(join(root, 'node_modules/@kurkle/color/LICENSE.md'), join(output, 'assets/color-license.txt'));
  for (const report of reports) {
    await writeFile(join(output, 'reports', `${report.id}.json`), JSON.stringify(report));
  }
  const catalog = reports.map(({ body_html, ...metadata }) => metadata)
    .sort((a, b) => b.id.localeCompare(a.id));
  await writeFile(join(output, 'catalog.json'), JSON.stringify(catalog));
  await writeFile(join(output, 'portfolio.json'), JSON.stringify(portfolio));
  await writeFile(join(output, '.nojekyll'), '');
  return { reports: reports.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(await build());
}
