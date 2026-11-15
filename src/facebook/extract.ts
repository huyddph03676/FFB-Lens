import { normalizeDate, parseCount } from '../data/normalize';
import { facebookReelsContext } from './context';

export interface VisibleReel {
  reel_url: string;
  reel_id: string;
  account_name?: string;
  caption: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  published_at: string | null;
}

const number = String.raw`(?:\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:[KMB]|nghìn|ngàn|triệu|tỷ)?`;
const labels: Record<'views' | 'likes' | 'comments' | 'shares', string> = {
  views: 'views?|lượt xem|plays?|lượt phát',
  likes: 'likes?|lượt thích',
  comments: 'comments?|bình luận',
  shares: 'shares?|lượt chia sẻ|chia sẻ'
};

export function reelIdFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw, 'https://facebook.com');
    if (!['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com'].includes(url.hostname)) return null;
    const match = url.pathname.match(/^\/(?:reel|reels|videos)\/(\d+)\/?$/i) ||
      url.pathname.match(/^\/[^/]+\/(?:reels|videos)\/(\d+)\/?$/i) ||
      url.pathname.match(/^\/people\/[^/]+\/\d+\/(?:reels|videos)\/(\d+)\/?$/i);
    return match?.[1] || null;
  } catch { return null; }
}

export function isReelsTab(raw: string): boolean {
  return facebookReelsContext(raw)?.isReelsTab === true;
}

export function parsePublishedValue(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^\d{10}(?:\d{3})?$/.test(value)) {
    const milliseconds = Number(value) * (value.length === 10 ? 1000 : 1);
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return normalizeDate(value);
}

function labeledCount(text: string, label: string): number | null {
  const forward = new RegExp(`(?:^|[^\\d])(${number})\\s*(?:${label})(?=$|[^\\p{L}])`, 'iu');
  const reverse = new RegExp(`(?:${label})\\s*[:·-]?\\s*(${number})(?=$|[^\\p{L}])`, 'iu');
  const match = text.match(forward) || text.match(reverse);
  return match ? parseCount(match[1]) : null;
}

export function extractVisibleMetrics(text: string): Pick<VisibleReel, 'views' | 'likes' | 'comments' | 'shares'> {
  const cleaned = text.replace(/\u00a0/g, ' ');
  const views = labeledCount(cleaned, labels.views);
  const likes = labeledCount(cleaned, labels.likes);
  const comments = labeledCount(cleaned, labels.comments);
  const shares = labeledCount(cleaned, labels.shares);
  if (views !== null) return { views, likes, comments, shares };
  // Facebook sometimes renders only one abbreviated count on a Reel thumbnail.
  const lines = cleaned.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean);
  const isolated = lines.filter(line => new RegExp(`^${number}$`, 'iu').test(line));
  const lone = isolated.length === 1 ? parseCount(isolated[0]) : null;
  const plausibleThumbnailCount = lone !== null && (lone <= 999 || /[KMB]|nghìn|ngàn|triệu|tỷ/iu.test(isolated[0]));
  return { views: plausibleThumbnailCount ? lone : null, likes, comments, shares };
}
