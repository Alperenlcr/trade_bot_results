import type { APIRoute } from 'astro';

const SITE = 'https://www.executor-bot.com';

// Generated at build time (not a static file) so <lastmod> reflects the
// actual build date — meaningful here because the daily data-update
// automation triggers a rebuild every time it pushes to data/tables/*.csv.
export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/` },
    { loc: `${SITE}/en/` },
  ];
  const altLinks = `
    <xhtml:link rel="alternate" hreflang="tr" href="${SITE}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls
    .map(
      (u) => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>${altLinks}
  </url>`
    )
    .join('')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
