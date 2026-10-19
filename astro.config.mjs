// @ts-check
import { defineConfig } from 'astro/config';

// The production domain is NOT hard-coded. Set SITE_URL at build time
// (GitHub Actions variable or `SITE_URL=https://example.org npm run build`).
// When it is set, canonical URLs, Open Graph URLs and sitemap.xml are generated.
const site = process.env.SITE_URL?.replace(/\/+$/, '') || undefined;

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
