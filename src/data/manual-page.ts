import type { Reel } from '../types';
import { normalizeDate, normalizePageUrl, normalizeUrl, parseCount } from './normalize';
import type { SourceBatch } from './sources';

export function isFacebookPageHost(host: string): boolean {
  return host === 'facebook.com' || host === 'web.facebook.com';
}
const reserved = new Set(['reel', 'reels', 'watch', 'groups', 'marketplace', 'events', 'gaming', 'profile.php']);

export function pageContextFromTab(raw: string): string | null {
  const normalized = normalizeUrl(raw);
  if (!normalized) return null;
  const url = new URL(normalized);
  if (!isFacebookPageHost(url.hostname)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (!parts.length || reserved.has(parts[0].toLowerCase())) return null;
  if (parts.length > 1 && parts[1].toLowerCase() !== 'reels') return null;
  return normalizePageUrl(`https://www.facebook.com/${parts[0]}/reels`);
}

export interface ManualReelInput {
  pageUrl: string;
  reelUrl: string;
  caption: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  publishedAt: string;
}

function metric(raw: string, label: string): number | null {
  if (!raw.trim()) return null;
  const parsed = parseCount(raw);
  if (parsed === null) throw new Error(`${label} không hợp lệ. Ví dụ: 1200, 1.2K hoặc 2,5 triệu.`);
  return parsed;
}

export function manualPageBatch(input: ManualReelInput, collectedAt = new Date().toISOString()): SourceBatch {
  const pageUrl = pageContextFromTab(input.pageUrl);
  if (!pageUrl) throw new Error('Hãy mở tab Reels của Facebook Page hoặc nhập URL Page hợp lệ.');
  const reelUrl = normalizeUrl(input.reelUrl);
  if (!reelUrl || !isFacebookPageHost(new URL(reelUrl).hostname) ||
      !/^\/(?:reel|reels)\/\d+\/?$/i.test(new URL(reelUrl).pathname)) {
    throw new Error('URL Reel phải có dạng facebook.com/reel/123456…');
  }
  const date = input.publishedAt.trim() ? normalizeDate(input.publishedAt) : null;
  if (input.publishedAt.trim() && !date) throw new Error('Ngày đăng không hợp lệ.');
  const id = new URL(reelUrl).pathname.split('/').filter(Boolean)[1];
  const reel: Reel = {
    page_name: new URL(pageUrl).pathname.split('/').filter(Boolean)[0] || '',
    page_url: pageUrl,
    reel_id: id,
    reel_url: reelUrl,
    caption: input.caption.trim(),
    views: metric(input.views, 'Lượt xem'),
    likes: metric(input.likes, 'Lượt thích'),
    comments: metric(input.comments, 'Bình luận'),
    shares: metric(input.shares, 'Chia sẻ'),
    published_at: date,
    collected_at: collectedAt,
    source: 'Nhập khi xem Page'
  };
  return {
    adapterId: 'manual_page',
    accessBasis: 'user_entered',
    coverage: 'partial',
    viewsMetric: 'user_supplied_views',
    reels: [reel],
    total: 1,
    skipped: 0,
    invalidMetrics: 0
  };
}
