// Hem build (loadSiteData.ts) hem istemci (App.tsx) kullanır; node:fs içermemeli.
export function parseCsv(text: string): { head: string[]; rows: string[][] } {
  const lines = text.trim().split('\n');
  return { head: lines[0].split(','), rows: lines.slice(1).map((l) => l.split(',')) };
}

// CSV zamanları UTC'dir (bkz. scripts/fetch-indices.mjs); 'Z' olmadan sunucu ve tarayıcı kendi saat diliminde okurdu.
export function parseTs(s: string): number {
  return new Date(s.replace(' ', 'T') + (s.length <= 10 ? 'T00:00:00' : '') + 'Z').getTime();
}
