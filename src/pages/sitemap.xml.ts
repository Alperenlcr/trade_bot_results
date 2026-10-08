import type { APIRoute } from 'astro';
import { getPath, langs, languages, routeKeys, type Lang } from '../i18n/utils';
import { getPosts, postAlternates, postLang, postPath } from '../lib/blog';

const SITE = 'https://executortrading.com';

const day = (d: Date) => d.toISOString().slice(0, 10);

function url(loc: string, alternates: Partial<Record<Lang, string>>, changefreq: string, priority: string, lastmod?: string) {
  const alts = langs.filter((l) => alternates[l]);
  const xDefault = alternates.en ?? alternates[alts[0]];
  return `
  <url>
    <loc>${SITE}${loc}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${alts.map((l) => `
    <xhtml:link rel="alternate" hreflang="${languages[l].hreflang}" href="${SITE}${alternates[l]}"/>`).join('')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${xDefault}"/>
  </url>`;
}

// Generated at build time (not a static file) so <lastmod> reflects the
// actual build date — meaningful here because the daily data-update
// automation triggers a rebuild every time it pushes to data/tables/*.csv.
// Home carries the build date, the blog index its newest post's date, posts
// their own (updated) date; other pages don't change on data pushes.
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const newest = (lang: Lang) => posts.find((p) => postLang(p) === lang)?.data.pubDate;
  const pages = routeKeys.flatMap((route) => {
    const alternates = Object.fromEntries(langs.map((l) => [l, getPath(route, l)]));
    return langs.map((lang) => {
      if (route === 'home') return url(getPath(route, lang), alternates, 'daily', '1.0', day(new Date()));
      if (route === 'blog') return url(getPath(route, lang), alternates, 'weekly', '0.7', newest(lang) && day(newest(lang)!));
      return url(getPath(route, lang), alternates, 'monthly', '0.5');
    });
  });
  const articles = posts.map((p) =>
    url(postPath(p), postAlternates(p, posts), 'monthly', '0.7', day(p.data.updatedDate ?? p.data.pubDate)));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.join('')}${articles.join('')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
