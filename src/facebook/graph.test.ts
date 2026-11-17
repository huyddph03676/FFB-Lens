import { describe, expect, it } from 'vitest';
import { parsePageReelsResponse } from './graph';

describe('Page Reels browser response parser', () => {
  it('reads only Reel fields from a browser-delivered response', () => {
    const body = JSON.stringify({ data: { page: { aggregated_fb_shorts: { edges: [
      { profile_reel_node: { node: { id: '2088464188452071', permalink_url: 'https://www.facebook.com/reel/2088464188452071/',
        creation_time: 1794448800, play_count_reduced: '45K', total_comment_count: 9,
        unified_reactors: { count: 734 }, owner: { name: 'Fearless Motivation' }, message: { text: 'Most people are not where they want to be' } } } }
    ] } } } });
    expect(parsePageReelsResponse(body)[0]).toMatchObject({
      reel_id: '2088464188452071', account_name: 'Fearless Motivation', views: 45_000, likes: 734, comments: 9,
      shares: null, caption: 'Most people are not where they want to be'
    });
  });
  it('ignores unrelated data and malformed lines', () => {
    expect(parsePageReelsResponse('not json\n{"data":{"viewer":{"id":"123"}}}')).toEqual([]);
  });
  it('accepts a profile Reel returned with a videos permalink', () => {
    const body = JSON.stringify({ data: { user: { aggregated_fb_shorts: { edges: [
      { node: { id: '987654321', permalink_url: 'https://www.facebook.com/creator.name/videos/987654321/',
        play_count_reduced: '1.2K', unified_reactors: { count: 30 }, total_comment_count: 2 } }
    ] } } } });
    expect(parsePageReelsResponse(body)[0]).toMatchObject({ reel_id: '987654321', views: 1200, likes: 30, comments: 2 });
  });
  it('merges deferred metrics into the matching Reel without dropping its URL', () => {
    const response = [
      'for (;;);' + JSON.stringify({ data: { aggregated_fb_shorts: { edges: [
        { profile_reel_node: { node: { id: '2088464188452071', permalink_url: 'https://www.facebook.com/reel/2088464188452071/' } } }
      ] } } }),
      JSON.stringify({ path: ['data', 'aggregated_fb_shorts', 'edges', 0, 'profile_reel_node', 'node'], data: {
        creation_time: 1794448800, unified_reactors: { count: 734 }, total_comment_count: 9,
        play_count_reduced: '45K', feedback: { reshares: { count: 118 } }, message: { text: 'A Reel caption' }
      } })
    ].join('\n');
    expect(parsePageReelsResponse(response)).toEqual([{
      reel_id: '2088464188452071', reel_url: 'https://facebook.com/reel/2088464188452071',
      caption: 'A Reel caption', views: 45_000, likes: 734, comments: 9, shares: 118,
      published_at: '2026-11-12T02:00:00.000Z'
    }]);
  });
  it('reads exact and reduced Share counts from the matching Reel feedback', () => {
    const body = JSON.stringify({ data: { aggregated_fb_shorts: { edges: [
      { node: { id: '100001', feedback: { reshares: { count: 118 }, i18n_share_count: '118' } } },
      { node: { id: '100002', feedback: { share_count: { count: null }, i18n_share_count: '1.2K' } } },
      { node: { id: '100003', feedback: { share_count: { count: 0 } } } },
      { node: { id: '100004', first: { i18n_share_count: '1.2K' }, feedback: { share_count: { count: 1300 } } } }
    ] } } });
    expect(parsePageReelsResponse(body).map(reel => reel.shares)).toEqual([118, 1200, 0, 1300]);
  });
});
