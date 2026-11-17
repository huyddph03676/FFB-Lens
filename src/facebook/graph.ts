import { normalizeDate, parseCount } from '../data/normalize';
import { reelIdFromUrl, type VisibleReel } from './extract';
import { cleanAccountName } from './name';

type RecordValue = Record<string, unknown>;

function object(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null;
}

function findKey(value: unknown, key: string, depth = 0): unknown {
  if (depth > 14) return null;
  const record = object(value);
  if (record) {
    if (key in record) return record[key];
    for (const child of Object.values(record)) {
      const found = findKey(child, key, depth + 1);
      if (found !== null && found !== undefined) return found;
    }
  } else if (Array.isArray(value)) {
    for (const child of value) {
      const found = findKey(child, key, depth + 1);
      if (found !== null && found !== undefined) return found;
    }
  }
  return null;
}

function count(value: unknown): number | null {
  if (typeof value === 'string' || typeof value === 'number') return parseCount(value);
  const record = object(value);
  return record ? count(record.count) : null;
}

function shareCount(value: unknown): number | null {
  let reduced: number | null = null;
  function visit(item: unknown, depth: number): number | null {
    if (depth > 18) return null;
    const record = object(item);
    if (record) {
      for (const key of ['total_share_count', 'share_count', 'reshares']) {
        const exact = count(record[key]);
        if (exact !== null) return exact;
      }
      if (reduced === null) {
        for (const key of ['share_count_reduced', 'i18n_share_count']) {
          reduced = count(record[key]);
          if (reduced !== null) break;
        }
      }
      for (const child of Object.values(record)) {
        const exact = visit(child, depth + 1);
        if (exact !== null) return exact;
      }
    } else if (Array.isArray(item)) {
      for (const child of item) {
        const exact = visit(child, depth + 1);
        if (exact !== null) return exact;
      }
    }
    return null;
  }
  return visit(value, 0) ?? reduced;
}

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  const record = object(value);
  return record && typeof record.text === 'string' ? record.text : '';
}

function reelFromNode(value: unknown, fallbackId: string | null = null): VisibleReel | null {
  const node = object(value);
  if (!node) return null;
  const permalink = findKey(node, 'permalink_url');
  const rawId = node.id;
  const id = (typeof rawId === 'string' || typeof rawId === 'number') && /^\d+$/.test(String(rawId)) ? String(rawId) :
    typeof permalink === 'string' ? reelIdFromUrl(permalink) : null;
  const reelId = id || fallbackId;
  if (!reelId) return null;
  const created = findKey(node, 'creation_time');
  const seconds = typeof created === 'number' || typeof created === 'string' ? Number(created) : NaN;
  const publishedAt = Number.isFinite(seconds) && seconds > 0 ? normalizeDate(new Date(seconds * 1000).toISOString()) : null;
  const owner = object(findKey(node, 'owner'));
  const accountName = cleanAccountName(owner?.name);
  return {
    reel_id: reelId,
    reel_url: `https://facebook.com/reel/${reelId}`,
    ...(accountName ? { account_name: accountName } : {}),
    caption: text(findKey(node, 'message')).slice(0, 2000),
    views: count(findKey(node, 'play_count_reduced')),
    likes: count(findKey(node, 'unified_reactors')),
    comments: count(findKey(node, 'total_comment_count')),
    shares: shareCount(node),
    published_at: publishedAt
  };
}

function merge(a: VisibleReel, b: VisibleReel): VisibleReel {
  return {
    ...a,
    ...(b.account_name || a.account_name ? { account_name: b.account_name || a.account_name } : {}),
    caption: b.caption || a.caption,
    views: b.views ?? a.views,
    likes: b.likes ?? a.likes,
    comments: b.comments ?? a.comments,
    shares: b.shares ?? a.shares,
    published_at: b.published_at || a.published_at
  };
}

export function parsePageReelsResponse(body: string): VisibleReel[] {
  const lines = body.replace(/^for\s*\(;;\);\s*/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const edges: unknown[] = [];
  const patches: { index: number; data: unknown }[] = [];
  for (const line of lines) {
    let payload: unknown;
    try { payload = JSON.parse(line); } catch { continue; }
    const record = object(payload);
    if (!record) continue;
    const aggregate = findKey(record, 'aggregated_fb_shorts');
    const edgeList = object(aggregate)?.edges;
    if (Array.isArray(edgeList)) edges.push(...edgeList);
    if (Array.isArray(record.path)) {
      const edgeIndex = record.path.indexOf('edges');
      const index = edgeIndex >= 0 ? record.path[edgeIndex + 1] : null;
      if (typeof index === 'number' && index >= 0 && index < 5000) patches.push({ index, data: record.data });
    }
  }
  const reels = new Map<string, VisibleReel>();
  for (const edge of edges) {
    const record = object(edge);
    const node = record?.profile_reel_node && object(record.profile_reel_node)?.node || record?.node || edge;
    const reel = reelFromNode(node);
    if (reel) reels.set(reel.reel_id, reels.has(reel.reel_id) ? merge(reels.get(reel.reel_id)!, reel) : reel);
  }
  for (const patch of patches) {
    const base = object(edges[patch.index]);
    const baseNode = base?.profile_reel_node && object(base.profile_reel_node)?.node || base?.node || edges[patch.index];
    const baseReel = reelFromNode(baseNode);
    const patchReel = reelFromNode(patch.data, baseReel?.reel_id || null);
    if (patchReel) reels.set(patchReel.reel_id, reels.has(patchReel.reel_id) ? merge(reels.get(patchReel.reel_id)!, patchReel) : patchReel);
  }
  return [...reels.values()];
}
