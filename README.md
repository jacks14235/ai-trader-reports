# Paper trail

A static public journal for the AI Trader paper-only experiment. Node builds the site; GitHub
Pages serves it. No Node server runs in production, and the site cannot connect to the Pi or place
orders. Chart.js is installed once and copied into one shared, locally hosted asset.

```sh
npm ci --ignore-scripts
npm test
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

The home page displays recorded portfolio snapshots and a dated report archive. Hash routes work
under a GitHub Pages project subpath. Reports retain inert SVG illustrations from the original
rendering; the portfolio comparison chart uses the shared Chart.js dependency. Numeric values are
snapshots, not guaranteed closing prices or live quotes. Different series can start on different
dates; returns include each portfolio's cash.

Only `content/portfolio.json` and `content/reports/YYYY-MM-DD-{daily,evening}.json` are public inputs.
They are produced by the read-only, hash-verifying `scripts/export_report_site.py` in the application
repository. The exporter admits inert report markup and selected equity/cash observations only.
Never add a database, environment file, raw research, provider log, or model request to this repository.

The deployed repository serves the prebuilt `docs` directory through standard GitHub Pages branch
publishing. After an app change, run the Node tests and build, then copy `dist` into `docs`. A custom
Actions workflow is also provided in the application source as an optional deployment template;
it is not installed in the reports repository. The Pi needs only Python and Git for data updates.
The Pi
uses a dedicated write-enabled deploy key restricted to this reports repository and a known-hosts
file populated from GitHub's official host keys. Its publisher checks for completed reports hourly
at :35 on weekdays from 15:35 through 23:35 Eastern. Unchanged exports cause no new commit or build.
A failed push retains the local commit for the next publisher invocation to deliver.

Pages is public. The journal contains paper-account and simulated-book results, not live holdings.

The owner approved public release of the existing reports and future exports on October 15, 2026. Automatic outbound publication is enabled; the Pi remains inaccessible from this site.
