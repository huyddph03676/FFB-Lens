import { describe, expect, it } from 'vitest';
import { isTikTokVideoResponseUrl, tiktokProfileContext, tiktokVideoFromUrl } from './context';
import { parseTikTokItems, parseTikTokProfileName } from './parse';
import { normalizePageUrl, reelIdentity } from '../data/normalize';
import { dedupe } from '../data/engine';
import { tiktokVisibleBatch } from '../data/sources';
import { pageContextFromTab } from '../data/manual-page';
import type { Reel } from '../types';

describe('TikTok profile videos', () => {
  it('accepts only a profile URL and canonical video URL', () => {
    expect(tiktokProfileContext('https://www.tiktok.com/@Creator.Name?lang=en')?.contextUrl).toBe('https://tiktok.com/@creator.name');
    expect(tiktokProfileContext('https://www.tiktok.com/@creator.name/video/123')).toBeNull();
    expect(tiktokProfileContext('https://www.tiktok.com/tag/topic')).toBeNull();
    expect(tiktokVideoFromUrl('https://www.tiktok.com/@creator.name/video/123?is_from_webapp=1')?.url)
      .toBe('https://tiktok.com/@creator.name/video/123');
    expect(normalizePageUrl('https://www.tiktok.com/@Creator.Name')).toBe('https://tiktok.com/@creator.name');
    expect(pageContextFromTab('https://www.tiktok.com/@minhtrong230901')).toBe('https://tiktok.com/@minhtrong230901');
  });

  it('observes TikTok item-list responses with or without a trailing slash', () => {
    expect(isTikTokVideoResponseUrl('/api/post/item_list?cursor=123')).toBe(true);
    expect(isTikTokVideoResponseUrl('https://www.tiktok.com/api/post/item_list/?cursor=123')).toBe(true);
    expect(isTikTokVideoResponseUrl('/api/item/detail/?itemId=123')).toBe(true);
    expect(isTikTokVideoResponseUrl('/api/user/detail?user=creator')).toBe(false);
  });

  it('reads video metrics from loaded profile item data and skips other creators', () => {
    const body = JSON.stringify({ itemList: [
      { id: '123', author: 'creator.name', authorInfo: { nickname: 'Creator Name' }, desc: 'A video',
        createTime: '1794448800', stats: { playCount: 1200, diggCount: 80, commentCount: 9, shareCount: 4 }, video: {} },
      { id: '456', author: 'other', stats: { playCount: 900 }, video: {} }
    ] });
    expect(parseTikTokItems(body, 'creator.name')).toMatchObject([{
      reel_id: '123', account_name: 'Creator Name', caption: 'A video',
      views: 1200, likes: 80, comments: 9, shares: 4,
      published_at: '2026-11-12T02:00:00.000Z'
    }]);
    expect(parseTikTokItems('not json', 'creator.name')).toEqual([]);
  });

  it('reads object author and string statsV2 fields from the profile item-list shape', () => {
    const body = JSON.stringify({ itemList: [{
      id: '7705272094564650261', author: { uniqueId: 'creator.name', nickname: 'Creator Display' },
      createTime: 1794023469, desc: 'A video',
      statsV2: { playCount: '142000', diggCount: '13100', commentCount: '370', shareCount: '1962' },
      stats: { playCount: 142000, diggCount: 13100, commentCount: 370, shareCount: 1962 }, video: {}
    }] });
    expect(parseTikTokItems(body, 'creator.name')[0]).toMatchObject({
      reel_id: '7705272094564650261', account_name: 'Creator Display',
      views: 142000, likes: 13100, comments: 370, shares: 1962,
      published_at: '2026-11-07T03:51:09.000Z'
    });
  });

  it('reads the profile display name from page data', () => {
    const body = JSON.stringify({ __DEFAULT_SCOPE__: { 'webapp.user-detail': { userInfo: {
      user: { uniqueId: 'creator.name', nickname: 'Creator Display' }
    } } } });
    expect(parseTikTokProfileName(body, 'creator.name')).toBe('Creator Display');
    expect(parseTikTokProfileName(body, 'other')).toBe('');
  });

  it('keeps TikTok and Facebook videos with the same numeric ID separate', () => {
    const facebook = { reel_id: '123', reel_url: 'https://facebook.com/reel/123' };
    const tiktok = { reel_id: '123', reel_url: 'https://tiktok.com/@creator.name/video/123' };
    expect(reelIdentity(facebook)).not.toBe(reelIdentity(tiktok));
    const shared = {
      page_name: '', page_url: '', caption: '', views: null, likes: null, comments: null,
      shares: null, published_at: null, collected_at: '2026-11-15', source: 'test'
    };
    expect(dedupe([{ ...shared, ...facebook }, { ...shared, ...tiktok }] as Reel[])).toHaveLength(2);
  });

  it('stores only videos from the selected profile', () => {
    const batch = tiktokVisibleBatch('https://www.tiktok.com/@creator.name', [
      { reel_id: '123', reel_url: 'https://www.tiktok.com/@creator.name/video/123', account_name: 'Creator Name', caption: '', views: 100,
        likes: 2, comments: null, shares: null, published_at: null },
      { reel_id: '456', reel_url: 'https://www.tiktok.com/@other/video/456', caption: '', views: 200,
        likes: null, comments: null, shares: null, published_at: null }
    ], '2026-11-15T00:00:00.000Z');
    expect(batch).toMatchObject({ adapterId: 'tiktok_visible_tab', skipped: 1 });
    expect(batch.reels).toMatchObject([{ page_name: 'Creator Name', page_url: 'https://tiktok.com/@creator.name',
      reel_url: 'https://tiktok.com/@creator.name/video/123', views: 100 }]);
  });
});
