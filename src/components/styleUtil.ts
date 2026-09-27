import type { CSSProperties } from 'react';

/**
 * Converts a plain CSS declaration string ("padding:22px;color:red") into a
 * React style object. Lets the ported markup keep its original inline CSS
 * text (just swapping `{{ x }}` for `${x}` template interpolation) instead of
 * hand-authoring hundreds of camelCase style object literals.
 */
export function sx(cssText: string): CSSProperties {
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
  return out as CSSProperties;
}
