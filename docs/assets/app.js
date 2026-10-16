/* All data is a read-only static export. No credentials, trading APIs, or server are used. */
const $ = (id) => document.getElementById(id);
const money = (n) => n == null ? 'Unknown' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const date = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
let catalog = [], chart;
const text = (tag, value, className) => { const el = document.createElement(tag); el.textContent = value; if (className) el.className = className; return el; };
async function json(path) { const response = await fetch(path); if (!response.ok) throw new Error(`Could not load ${path}`); return response.json(); }
function archive() {
  $('reports').replaceChildren();
  const selected = catalog.filter(r => $('kind').value === 'all' || r.kind === $('kind').value);
  $('report-count').textContent = `${selected.length} reports`;
  for (const report of selected) {
    const a = document.createElement('a'); a.className = 'report-card'; a.href = `#${report.id}`;
    a.append(text('p', `${date(report.date)} / ${report.kind === 'evening' ? 'Evening briefing' : 'Daily decision'}`, 'eyebrow'), text('h3', report.title), text('span', 'Read report ↗', 'read-link'));
    $('reports').append(a);
  }
  if (!selected.length) $('reports').append(text('p', 'No published reports in this category yet.', 'muted'));
}
function portfolios(data) {
  const colors = ['#176b53', '#bc6734', '#526ab3', '#9a5986', '#65844c', '#9c8238'];
  const series = data.series.filter(s => s.points.length);
  for (const s of series) {
    const last = s.points.at(-1), change = (Number(last.equity) / Number(s.starting_equity) - 1) * 100;
    const card = text('div', '', 'stat');
    card.append(text('p', s.label, 'stat-label'), text('strong', money(last.equity)), text('p', `${change >= 0 ? '+' : ''}${change.toFixed(2)}% · ${money(last.cash)} cash`, 'muted'));
    card.append(text('p', `As of ${new Date(last.at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`, 'muted'));
    $('stats').append(card);
  }
  const days = [...new Set(series.flatMap(s => s.points.map(p => p.at.slice(0, 10))))].sort();
  const datasets = series.map((s, i) => {
    const points = new Map(s.points.map(p => [p.at.slice(0, 10), (Number(p.equity) / Number(s.starting_equity) - 1) * 100]));
    return { label: s.label, data: days.map(day => points.get(day) ?? null), borderColor: colors[i % colors.length], backgroundColor: colors[i % colors.length], borderWidth: 2, pointRadius: 3, tension: 0, spanGaps: false };
  });
  if (series.length) {
    chart = new Chart($('equity-chart'), { type: 'line', data: { labels: days, datasets }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y.toFixed(2)}%` } } }, scales: { y: { ticks: { callback: v => `${v}%` } }, x: { grid: { display: false } } } } });
  } else $('chart-table').append(text('p', 'Performance observations will appear after the first completed export.', 'muted'));
  const details = document.createElement('details'); details.append(text('summary', 'View recorded values'));
  const table = document.createElement('table');
  const head = document.createElement('tr'); for (const label of ['Portfolio', 'Recorded at (UTC)', 'Equity', 'Cash']) head.append(text('th', label)); table.append(head);
  for (const s of series) for (const p of s.points) { const row = document.createElement('tr'); for (const value of [s.label, p.at, money(p.equity), money(p.cash)]) row.append(text('td', value)); table.append(row); }
  details.append(table); $('chart-table').append(details);
}
let routeVersion = 0;
async function route() {
  const version = ++routeVersion, id = location.hash.slice(1);
  $('notice').textContent = '';
  $('overview').hidden = Boolean(id); $('reader').hidden = !id;
  if (!id) { document.title = 'Paper trail · AI Trader'; return; }
  const entry = catalog.find(r => r.id === id);
  if (!entry) { $('reader').hidden = true; $('notice').textContent = 'Report not found. Use Paper trail above to return to the journal.'; return; }
  $('report-body').replaceChildren(text('p', 'Loading report…'));
  try {
    const report = await json(`./reports/${entry.id}.json`);
    if (version !== routeVersion) return;
    // HTML is escaped/allowlisted by the exporter, checked by the builder, and covered by CSP.
    $('report-body').innerHTML = report.body_html;
    $('reader-meta').textContent = `${date(report.date)} / ${report.kind === 'evening' ? 'Evening briefing' : 'Daily decision'}`;
    $('provenance').textContent = `Source artifact SHA-256: ${report.source_sha256}`;
    document.title = `${report.title} · Paper trail`;
    window.scrollTo(0, 0);
  } catch (error) { $('report-body').replaceChildren(text('p', error.message)); }
}
(async () => {
  try {
    const [entries, data] = await Promise.all([json('./catalog.json'), json('./portfolio.json')]); catalog = entries;
    $('updated').textContent = data.as_of ? `Latest published record: ${new Date(data.as_of).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })}` : 'Awaiting the first published export.';
    portfolios(data); archive(); $('kind').addEventListener('change', archive);
    window.addEventListener('hashchange', route); await route();
  } catch (error) { $('notice').textContent = `${error.message}. Please try again later.`; }
})();
