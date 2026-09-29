// Hem build (loadSiteData.ts) hem istemci (App.tsx) kullanır; node:fs içermemeli.
export function parseCsv(text: string): { head: string[]; rows: string[][] } {
  const lines = text.trim().split('\n');
  return { head: lines[0].split(','), rows: lines.slice(1).map((l) => l.split(',')) };
}

export function parseTs(s: string): number {
  return new Date(s.replace(' ', 'T') + (s.length <= 10 ? 'T00:00:00' : '')).getTime();
}
