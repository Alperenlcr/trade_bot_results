import { getCollection, type CollectionEntry } from 'astro:content';
import { getPath, langs, type Lang } from '../i18n/utils';

export type Post = CollectionEntry<'blog'>;

// glob loader id'si 'tr/btc-trend-takibi-nedir' biçiminde: ilk parça dil, kalanı adres.
export const postLang = (post: Post) => post.id.split('/')[0] as Lang;
export const postPath = (post: Post) => getPath('blog', postLang(post)) + post.id.split('/').slice(1).join('/') + '/';

/** Yeniden eskiye; bilinmeyen dil klasörü build'i durdurur (yazım hatası sessizce kaybolmasın). */
export async function getPosts() {
  const posts = await getCollection('blog');
  for (const p of posts) if (!langs.includes(postLang(p))) throw new Error(`blog: bilinmeyen dil klasörü "${p.id}"`);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Aynı `key`'e sahip çevirilerin adresleri: { en: '/blog/x/', tr: '/tr/blog/y/' } */
export function postAlternates(post: Post, posts: Post[]) {
  return Object.fromEntries(
    posts.filter((p) => p.data.key === post.data.key).map((p) => [postLang(p), postPath(p)]),
  ) as Partial<Record<Lang, string>>;
}
