import type { APIRoute } from 'astro';
import { getPath, langs, languages, routeKeys } from '../i18n/utils';

const SITE = 'https://executortrading.com';

// Generated at build time (not a static file) so <lastmod> reflects the
// actual build date — meaningful here because the daily data-update
// automation triggers a rebuild every time it pushes to data/tables/*.csv.
// Only the home page carries <lastmod>: other pages don't change on data pushes.
export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = routeKeys.flatMap((route) => {
    const alts = langs
      .map((l) => `
    <xhtml:link rel="alternate" hreflang="${languages[l].hreflang}" href="${SITE}${getPath(route, l)}"/>`)
      .join('') + `
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${getPath(route, 'en')}"/>`;
    return langs.map((lang) => `
  <url>
    <loc>${SITE}${getPath(route, lang)}</loc>${route === 'home' ? `
    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${route === 'home' ? 'daily' : 'monthly'}</changefreq>
    <priority>${route === 'home' ? '1.0' : '0.5'}</priority>${alts}
  </url>`);
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
