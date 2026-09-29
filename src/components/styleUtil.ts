import type { CSSProperties } from 'react';

/**
 * Converts a plain CSS declaration string ("padding:22px;color:red") into a
 * React style object. Lets the ported markup keep its original inline CSS
 * text (just swapping `{{ x }}` for `${x}` template interpolation) instead of
 * hand-authoring hundreds of camelCase style object literals.
 */
// Aynı stil metni her render'da yeniden parse edilmesin. React style nesnesini değiştirmediği için paylaşmak güvenli.
// ponytail: sınırsız Map; farklı stil metni sayısı veriyle sınırlı (birkaç yüz), büyürse LRU'ya geç.
const cache = new Map<string, CSSProperties>();

export function sx(cssText: string): CSSProperties {
  const hit = cache.get(cssText);
  if (hit) return hit;
  const out: Record<string, string> = {};
  cssText.split(';').forEach((decl) => {
    const idx = decl.indexOf(':');
    if (idx === -1) return;
    const prop = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) return;
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = val;
  });
  cache.set(cssText, out as CSSProperties);
  return out as CSSProperties;
}
