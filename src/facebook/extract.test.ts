import { describe, expect, it } from 'vitest';
import { extractVisibleMetrics, isReelsTab, parsePublishedValue, reelIdFromUrl } from './extract';

describe('visible Facebook Reel parsing', () => {
  it('accepts a Page Reels tab, not an arbitrary Facebook screen', () => {
    expect(isReelsTab('https://www.facebook.com/fearlessmotivationofficial/reels/')).toBe(true);
    expect(isReelsTab('https://www.facebook.com/reel/123')).toBe(false);
    expect(isReelsTab('https://example.com/fearlessmotivationofficial/reels')).toBe(false);
  });
  it('extracts Reel identity from supported URLs', () => {
    expect(reelIdFromUrl('https://www.facebook.com/reel/123456/?mibextid=x')).toBe('123456');
    expect(reelIdFromUrl('/fearlessmotivationofficial/reels/123456/')).toBe('123456');
    expect(reelIdFromUrl('https://example.com/reel/123456')).toBeNull();
  });
  it('reads labeled displayed counts and keeps absent metrics empty', () => {
    expect(extractVisibleMetrics('1.2M views\n24K likes\n530 comments\n210 shares')).toEqual({ views: 1_200_000, likes: 24_000, comments: 530, shares: 210 });
    expect(extractVisibleMetrics('1,2 triệu lượt xem\n120 bình luận')).toEqual({ views: 1_200_000, likes: null, comments: 120, shares: null });
  });
  it('uses a lone thumbnail count but avoids ambiguous counts', () => {
    expect(extractVisibleMetrics('1.2M\nMotivation')).toEqual({ views: 1_200_000, likes: null, comments: null, shares: null });
    expect(extractVisibleMetrics('1.2M\n25K')).toEqual({ views: null, likes: null, comments: null, shares: null });
    expect(extractVisibleMetrics('2026\nMotivation')).toEqual({ views: null, likes: null, comments: null, shares: null });
  });
  it('reads machine-readable publish dates without guessing missing years', () => {
    expect(parsePublishedValue('2026-11-12T10:30:00Z')).toBe('2026-11-12T10:30:00.000Z');
    expect(parsePublishedValue('1794479400')).toBe('2026-11-12T10:30:00.000Z');
    expect(parsePublishedValue('Yesterday')).toBeNull();
  });
});
