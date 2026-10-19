// Project link health check — reports, never edits projects.json.
//
// - Skips private projects and placeholder hosts (example.com etc.).
// - HEAD first, falls back to GET; timeout + retries with backoff; sequential with a delay (polite).
// - 401/403/429 are "needs review", not "broken": many dashboards block bots or require login.
// - Writes a Markdown report to $GITHUB_STEP_SUMMARY (when set) and to link-report.md.
// - Exit code 1 only when a link is definitely broken (404/410, DNS failure, repeated 5xx/timeouts),
//   so the scheduled workflow shows a red run you can look at. Nothing is archived automatically.
import { readFile, writeFile, appendFile } from 'node:fs/promises';

const TIMEOUT_MS = 15_000;
const RETRIES = 2;
const DELAY_MS = 1_000;
const PLACEHOLDER_HOSTS = /(^|\.)(example\.(com|org|net)|localhost)$/i;
const UA = 'DatafolioLinkCheck/1.0 (+https://github.com/; portfolio link health check)';

const projects = JSON.parse(await readFile(new URL('../src/content/projects.json', import.meta.url), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(url) {
  let last = { status: 0, note: '' };
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    for (const method of ['HEAD', 'GET']) {
      try {
        const res = await fetch(url, {
          method,
          redirect: 'follow',
          headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        res.body?.cancel().catch(() => {});
        last = { status: res.status, note: res.redirected ? `→ ${res.url}` : '' };
        if (res.status === 405 || res.status === 501) continue; // HEAD not allowed → try GET
        if (res.status < 500) return last;
        break; // 5xx → retry after backoff
      } catch (err) {
        last = { status: 0, note: err.name === 'TimeoutError' ? 'timeout' : err.cause?.code || err.message };
        break;
      }
    }
    if (attempt < RETRIES) await sleep(2_000 * (attempt + 1));
  }
  return last;
}

function classify({ status }) {
  if (status >= 200 && status < 400) return 'ok';
  if ([401, 403, 429].includes(status)) return 'review';
  return 'broken';
}

const rows = [];
for (const p of projects) {
  if (p.status === 'private') continue;
  for (const [kind, url] of [['project', p.projectUrl], ['source', p.githubUrl]]) {
    if (!url) continue;
    if (PLACEHOLDER_HOSTS.test(new URL(url).hostname)) {
      rows.push({ id: p.id, kind, url, result: 'skipped', status: '-', note: 'placeholder' });
      continue;
    }
    const r = await probe(url);
    rows.push({ id: p.id, kind, url, result: classify(r), status: r.status || '-', note: r.note });
    await sleep(DELAY_MS);
  }
}

const icon = { ok: '✅', review: '🟡', broken: '❌', skipped: '⏭️' };
const count = (k) => rows.filter((r) => r.result === k).length;
const report = [
  '## Project link health',
  '',
  `Checked ${new Date().toISOString()} — ✅ ${count('ok')} ok · 🟡 ${count('review')} needs review · ❌ ${count('broken')} broken · ⏭️ ${count('skipped')} skipped`,
  '',
  '| | Project | Link | Status | Note |',
  '|---|---|---|---|---|',
  ...rows.map((r) => `| ${icon[r.result]} | \`${r.id}\` | [${r.kind}](${r.url}) | ${r.status} | ${r.note || ''} |`),
  '',
  '_🟡 401/403/429 often mean the platform blocks automated requests or needs a login — open it manually before changing anything._',
  '',
].join('\n');

await writeFile('link-report.md', report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
console.log(report);
process.exit(count('broken') > 0 ? 1 : 0);
