import { describe, expect, it } from 'vitest';
import { manualPageBatch, pageContextFromTab } from './manual-page';

const input = {
  pageUrl: 'https://www.facebook.com/fearlessmotivationofficial/reels/',
  reelUrl: 'https://www.facebook.com/reel/123456789/?mibextid=abc',
  caption: '  Keep going  ',
  views: '1.2M',
  likes: '12K',
  comments: '',
  shares: '',
  publishedAt: '2026-11-12'
};

describe('Page workspace input', () => {
  it('recognizes a Page Reels tab and rejects other Facebook areas', () => {
    expect(pageContextFromTab(input.pageUrl)).toBe('https://facebook.com/fearlessmotivationofficial');
    expect(pageContextFromTab('https://facebook.com/reel/123456789')).toBeNull();
    expect(pageContextFromTab('https://facebook.com/groups/example')).toBeNull();
    expect(pageContextFromTab('https://example.com/fearlessmotivationofficial/reels')).toBeNull();
  });
  it('records a Reel under the numeric profile ID instead of the shared profile.php path', () => {
    const batch = manualPageBatch({ ...input, pageUrl: 'https://www.facebook.com/profile.php?id=100012345678901&sk=reels_tab' }, '2026-11-14T00:00:00.000Z');
    expect(batch.reels[0].page_url).toBe('https://facebook.com/profile.php?id=100012345678901');
    expect(batch.reels[0].page_name).toBe('Profile 100012345678901');
  });

  it('records only values supplied by the user with partial coverage', () => {
    const batch = manualPageBatch(input, '2026-11-14T00:00:00.000Z');
    expect(batch.coverage).toBe('partial');
    expect(batch.accessBasis).toBe('user_entered');
    expect(batch.reels[0]).toMatchObject({
      page_url: 'https://facebook.com/fearlessmotivationofficial',
      reel_id: '123456789',
      reel_url: 'https://facebook.com/reel/123456789',
      caption: 'Keep going',
      views: 1_200_000,
      likes: 12_000,
      comments: null
    });
  });

  it('rejects invalid metric and non-Reel URL', () => {
    expect(() => manualPageBatch({ ...input, views: 'many' })).toThrow('Lượt xem không hợp lệ');
    expect(() => manualPageBatch({ ...input, reelUrl: 'https://facebook.com/watch/123' })).toThrow('URL video');
  });
  it('accepts a TikTok video for the selected profile', () => {
    const batch = manualPageBatch({ ...input, pageUrl: 'https://www.tiktok.com/@creator.name',
      reelUrl: 'https://www.tiktok.com/@creator.name/video/123' });
    expect(batch.reels[0]).toMatchObject({ page_url: 'https://tiktok.com/@creator.name',
      reel_url: 'https://tiktok.com/@creator.name/video/123', reel_id: '123', source: 'Nhập từ TikTok' });
  });
});
