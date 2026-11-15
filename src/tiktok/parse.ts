import { normalizeDate, parseCount } from '../data/normalize';
import type { VisibleReel } from '../facebook/extract';
import { tiktokVideoFromUrl } from './context';

type Data = Record<string, unknown>;
const object = (value: unknown): Data | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : null;
const count = (value: unknown): number | null => typeof value === 'string' || typeof value === 'number' ? parseCount(value) : null;

function video(value: unknown, username: string): VisibleReel | null {
  const item = object(value);
  if (!item || !/^\d+$/.test(String(item.id || ''))) return null;
  const statsV2 = object(item.statsV2);
  const stats = object(item.stats);
  if (!statsV2 && !stats && !object(item.video)) return null;
  const author = object(item.author);
  const authorInfo = object(item.authorInfo);
  const handle = typeof item.author === 'string' ? item.author :
    typeof author?.uniqueId === 'string' ? author.uniqueId :
    typeof authorInfo?.uniqueId === 'string' ? authorInfo.uniqueId : '';
  if (!handle || handle.replace(/^@/u, '').toLowerCase() !== username) return null;
  const nickname = typeof authorInfo?.nickname === 'string' ? authorInfo.nickname :
    typeof author?.nickname === 'string' ? author.nickname : '';
  const created = Number(item.createTime ?? item.create_time);
  const published = Number.isFinite(created) && created > 0 && created < 8_640_000_000_000
    ? normalizeDate(new Date(created * 1000).toISOString()) : null;
  return {
    reel_id: String(item.id),
    reel_url: `https://tiktok.com/@${username}/video/${item.id}`,
    account_name: nickname.trim().slice(0, 120),
    caption: (typeof item.desc === 'string' ? item.desc : typeof item.video_description === 'string' ? item.video_description : '').slice(0, 2000),
    views: count(statsV2?.playCount ?? statsV2?.viewCount) ?? count(stats?.playCount ?? stats?.viewCount),
    likes: count(statsV2?.diggCount ?? statsV2?.likeCount) ?? count(stats?.diggCount ?? stats?.likeCount),
    comments: count(statsV2?.commentCount) ?? count(stats?.commentCount),
    shares: count(statsV2?.shareCount) ?? count(stats?.shareCount),
    published_at: published
  };
}

export function parseTikTokItems(body: string, username: string): VisibleReel[] {
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return []; }
  const found = new Map<string, VisibleReel>();
  let visited = 0;
  function walk(value: unknown, depth: number) {
    if (depth > 16 || ++visited > 100_000 || !value || typeof value !== 'object') return;
    const parsed = video(value, username);
    if (parsed) found.set(parsed.reel_id, parsed);
    if (Array.isArray(value)) {
      for (const child of value) walk(child, depth + 1);
    } else {
      for (const child of Object.values(value as Data)) if (child && typeof child === 'object') walk(child, depth + 1);
    }
  }
  walk(payload, 0);
  return [...found.values()];
}

export function parseTikTokProfileName(body: string, username: string): string {
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return ''; }
  let visited = 0;
  function walk(value: unknown, depth: number): string {
    if (depth > 12 || ++visited > 100_000 || !value || typeof value !== 'object') return '';
    const record = object(value);
    if (record && typeof record.uniqueId === 'string' &&
        record.uniqueId.replace(/^@/u, '').toLowerCase() === username && typeof record.nickname === 'string') {
      return record.nickname.trim().slice(0, 120);
    }
    const children = Array.isArray(value) ? value : Object.values(record || {});
    for (const child of children) {
      if (!child || typeof child !== 'object') continue;
      const found = walk(child, depth + 1);
      if (found) return found;
    }
    return '';
  }
  return walk(payload, 0);
}

export function visibleTikTokVideo(raw: string): { id: string; url: string } | null {
  const parsed = tiktokVideoFromUrl(raw);
  return parsed ? { id: parsed.id, url: parsed.url } : null;
}
