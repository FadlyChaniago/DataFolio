// Pre-build checks that the Astro schema cannot express:
// unique IDs, thumbnail files that actually exist, featured count.
// Field-level validation (types, URLs, status, dates) is done by src/content.config.ts during `astro build`.
import { readFile, access } from 'node:fs/promises';

const FILE = new URL('../src/content/projects.json', import.meta.url);
const PUBLIC = new URL('../public/', import.meta.url);

const errors = [];
const warnings = [];

let projects;
try {
  projects = JSON.parse(await readFile(FILE, 'utf8'));
} catch (err) {
  console.error(`✖ projects.json is not valid JSON: ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(projects)) {
  console.error('✖ projects.json must be an array of project objects');
  process.exit(1);
}

const seen = new Map();
for (const [i, p] of projects.entries()) {
  const label = p?.id ? `"${p.id}"` : `#${i}`;
  if (!p?.id) errors.push(`${label}: missing id`);
  else if (seen.has(p.id)) errors.push(`${label}: duplicate id (also at index ${seen.get(p.id)})`);
  else seen.set(p.id, i);

  if (p?.thumbnail) {
    try {
      await access(new URL('.' + p.thumbnail, PUBLIC));
    } catch {
      errors.push(`${label}: thumbnail not found at public${p.thumbnail}`);
    }
  }
  if (p?.publishedAt && Number.isNaN(Date.parse(p.publishedAt))) {
    errors.push(`${label}: publishedAt "${p.publishedAt}" is not a valid date (use YYYY-MM-DD)`);
  }
  if (p?.status === 'live' && !p?.projectUrl) {
    errors.push(`${label}: status "live" needs a projectUrl`);
  }
}

const featured = projects.filter((p) => p?.featured).length;
if (featured > 3) warnings.push(`${featured} projects are featured; only the newest 3 are shown in Featured Projects`);

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✖ ${e}`);
  console.error(`\n${errors.length} problem(s) in src/content/projects.json`);
  process.exit(1);
}
console.log(`✔ ${projects.length} projects OK (${featured} featured)`);
