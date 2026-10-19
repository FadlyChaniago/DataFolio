import type { APIRoute } from 'astro';

// Single-page site → one URL. Empty (but valid) when SITE_URL is not configured,
// so no unknown domain ever gets hard-coded.
export const GET: APIRoute = ({ site }) => {
  const urls = site ? [new URL('/', site).href] : [];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
