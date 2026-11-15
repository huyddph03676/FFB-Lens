import type { Filters, Reel } from '../types';
import { normalizePageUrl, normalizeUrl, reelIdentity } from './normalize';
import { isDisplayAccountName } from '../facebook/name';

function completeness(reel: Reel): number {
  return ['views', 'likes', 'comments', 'shares', 'published_at', 'caption', 'page_name'].reduce(
    (count, key) => count + (reel[key as keyof Reel] !== null && reel[key as keyof Reel] !== '' ? 1 : 0), 0
  );
}

export function dedupe(reels: Reel[]): Reel[] {
  const parent = reels.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  const seen = new Map<string, number>();
  reels.forEach((reel, i) => {
    const keys = [reelIdentity(reel), `url:${normalizeUrl(reel.reel_url) || reel.reel_url.trim()}`];
    const urlId = reelIdentity({ reel_id: '', reel_url: reel.reel_url });
    if (urlId.startsWith('id:') || urlId.startsWith('tiktok:id:')) keys.push(urlId);
    keys.forEach(key => {
      const previous = seen.get(key);
      if (previous === undefined) seen.set(key, i);
      else parent[find(i)] = find(previous);
    });
  });
  const groups = new Map<number, Reel[]>();
  reels.forEach((reel, i) => {
    const root = find(i);
    const group = groups.get(root) || [];
    group.push(reel);
    groups.set(root, group);
  });
  return [...groups.values()].map(group => {
    const ranked = [...group].sort((a, b) => completeness(b) - completeness(a) || b.collected_at.localeCompare(a.collected_at));
    const merged = { ...ranked[0] };
    for (const reel of ranked.slice(1)) {
      for (const key of ['views', 'likes', 'comments', 'shares'] as const) {
        if (merged[key] === null) merged[key] = reel[key];
      }
      if (!merged.published_at) merged.published_at = reel.published_at;
      if (!merged.caption) merged.caption = reel.caption;
      if (!merged.page_name) merged.page_name = reel.page_name;
      if (!merged.page_url) merged.page_url = reel.page_url;
    }
    const named = [...group].filter(reel => isDisplayAccountName(reel.page_name, reel.page_url))
      .sort((a, b) => b.collected_at.localeCompare(a.collected_at))[0];
    if (named) merged.page_name = named.page_name;
    return merged;
  });
}

function dayEnd(date: string): number {
  const parsed = new Date(`${date}T23:59:59.999`);
  return parsed.getTime();
}

export function pageKey(reel: Reel): string | null {
  const url = normalizePageUrl(reel.page_url);
  if (url) return `url:${url}`;
  const name = reel.page_name.trim().toLocaleLowerCase();
  return name ? `name:${name}` : null;
}

export function removeAccountReels(reels: Reel[], accountKey: string): Reel[] {
  if (!accountKey) throw new Error('Chọn một tài khoản trước khi xóa dữ liệu.');
  return reels.filter(reel => pageKey(reel) !== accountKey);
}

export function accountDisplayLabel(accountKey: string, name: string): string {
  if (!accountKey.startsWith('url:')) return name;
  try {
    const host = new URL(accountKey.slice(4)).hostname;
    if (host === 'facebook.com') return `[Facebook] ${name}`;
    if (host === 'tiktok.com') return `[TikTok] ${name}`;
  } catch { /* Keep the original label for imported records without a valid URL. */ }
  return name;
}

export function distinctAccountLabels(options: [string, string][]): [string, string][] {
  const prefixed = options.map(([key, label]) => [key, accountDisplayLabel(key, label)] as [string, string]);
  const counts = new Map<string, number>();
  for (const [, label] of prefixed) {
    const name = label.toLocaleLowerCase();
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return prefixed.map(([key, label]) => [
    key,
    counts.get(label.toLocaleLowerCase())! > 1 && key.startsWith('url:')
      ? `${label} · ${key.slice(4).replace(/^https:\/\//u, '')}` : label
  ]);
}

export function filterReels(reels: Reel[], filters: Filters): Reel[] {
  const now = filters.now || new Date();
  const query = filters.query.trim().toLocaleLowerCase();
  return reels.filter(reel => {
    if (filters.pageKey && pageKey(reel) !== filters.pageKey) return false;
    if (filters.source && reel.source !== filters.source) return false;
    if (filters.minViews !== null && (reel.views === null || reel.views < filters.minViews)) return false;
    if (query && !`${reel.caption} ${reel.page_name} ${reel.reel_id} ${reel.reel_url}`.toLocaleLowerCase().includes(query)) return false;
    if (filters.range === 'all') return true;
    if (!reel.published_at) return false;
    const published = new Date(reel.published_at).getTime();
    if (!Number.isFinite(published)) return false;
    if (filters.range === 'custom') {
      if (filters.from && published < new Date(`${filters.from}T00:00:00`).getTime()) return false;
      if (filters.to && published > dayEnd(filters.to)) return false;
      return true;
    }
    const days = Number(filters.range);
    return published >= now.getTime() - days * 86_400_000 && published <= now.getTime();
  });
}

export function filterAndRank(reels: Reel[], filters: Filters): Reel[] {
  const filtered = filterReels(reels, filters);
  const metric = filters.sort as 'views' | 'likes' | 'comments' | 'shares';
  filtered.sort((a, b) => {
    if (filters.sort === 'newest' || filters.sort === 'oldest') {
      const av = a.published_at ? new Date(a.published_at).getTime() : null;
      const bv = b.published_at ? new Date(b.published_at).getTime() : null;
      if (av === null) return bv === null ? 0 : 1;
      if (bv === null) return -1;
      return filters.sort === 'newest' ? bv - av : av - bv;
    }
    const av = a[metric], bv = b[metric];
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    return bv - av;
  });
  return filtered.slice(0, filters.top);
}

export interface OutlierBaseline { median: number | null; sampleSize: number }

export function outlierBaselines(reels: Reel[], filters: Filters): Map<string, OutlierBaseline> {
  const cohort = filterReels(reels, { ...filters, query: '', pageKey: '', source: '', minViews: null });
  const groups = new Map<string, Reel[]>();
  for (const reel of cohort) {
    const key = pageKey(reel);
    if (!key) continue;
    const group = groups.get(key) || [];
    group.push(reel);
    groups.set(key, group);
  }
  const baselines = new Map<string, OutlierBaseline>();
  for (const [key, group] of groups) {
    const summary = summarize(group);
    baselines.set(key, { median: summary.median, sampleSize: summary.withViews });
  }
  return baselines;
}

export function reelOutlierScore(reel: Reel, baselines: Map<string, OutlierBaseline>): number | null {
  const key = pageKey(reel);
  const baseline = key ? baselines.get(key) : undefined;
  return baseline ? outlierScore(reel.views, baseline.median, baseline.sampleSize) : null;
}

export function summarize(reels: Reel[]) {
  const views = reels.map(r => r.views).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const totalViews = views.reduce((sum, v) => sum + v, 0);
  const middle = Math.floor(views.length / 2);
  const median = views.length ? (views.length % 2 ? views[middle] : (views[middle - 1] + views[middle]) / 2) : null;
  return { total: reels.length, withViews: views.length, totalViews, mean: views.length ? totalViews / views.length : null, median, max: views.at(-1) ?? null };
}

export function outlierScore(views: number | null, median: number | null, sampleSize: number): number | null {
  return views !== null && median !== null && median > 0 && sampleSize >= 5 ? views / median : null;
}
