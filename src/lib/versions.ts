import { readFileSync } from 'node:fs';
import path from 'node:path';

// Bot sürümleri data/config.json › versions içinde sıralı tutulur (eski → yeni).
// Sonuncusu güncel sürümdür: kök adreste yayınlanır ve data/tables'tan okunur (bot günceller).
// Öncekiler donmuş klasörlerdir (data/tables_v6 …) ve /v6/ altında yayınlanır.
export interface VersionDef { id: string; dir: string; liveFrom?: string; retiredAt?: string }

export function loadVersions(): VersionDef[] {
  const cfg = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'config.json'), 'utf-8'));
  const v = (cfg.versions ?? []) as VersionDef[];
  return v.length ? v : [{ id: 'latest', dir: 'tables' }];
}

export const latestVersion = (vs = loadVersions()) => vs[vs.length - 1];
export const archivedVersions = (vs = loadVersions()) => vs.slice(0, -1);

/** Bitişik sürüm çiftleri: tarih = eski sürümün bırakıldığı gün. */
export function switchPoints(vs = loadVersions()) {
  return vs.slice(1).map((to, i) => ({ from: vs[i].id, to: to.id, date: vs[i].retiredAt ?? to.liveFrom ?? '' }))
    .filter((s) => s.date);
}
