import { describe, expect, it } from 'vitest';
import { facebookReelsContext } from './context';
import { isReelsTab, reelIdFromUrl } from './extract';
import { normalizePageUrl } from '../data/normalize';
import { browserVisibleBatch } from '../data/sources';

describe('Facebook Page and profile Reels URLs', () => {
  it('recognizes username, numeric profile, and people URLs', () => {
    expect(isReelsTab('https://www.facebook.com/creator.name/reels/')).toBe(true);
    expect(isReelsTab('https://www.facebook.com/creator.name?sk=reels_tab')).toBe(true);
    expect(isReelsTab('https://www.facebook.com/profile.php?id=100012345678901&sk=reels_tab')).toBe(true);
    expect(isReelsTab('https://www.facebook.com/profile.php?id=100012345678901&sk=reels')).toBe(false);
    expect(isReelsTab('https://www.facebook.com/people/Creator-Name/100012345678901/reels/')).toBe(true);
    expect(isReelsTab('https://www.facebook.com/profile.php?id=100012345678901&sk=photos')).toBe(false);
  });

  it('keeps numeric profile IDs distinct and builds a usable Reels link', () => {
    const first = facebookReelsContext('https://www.facebook.com/profile.php?sk=reels&id=100012345678901');
    const second = facebookReelsContext('https://www.facebook.com/profile.php?id=100012345678902&sk=reels');
    expect(first?.contextUrl).toBe('https://facebook.com/profile.php?id=100012345678901');
    expect(first?.reelsUrl).toBe('https://www.facebook.com/profile.php?id=100012345678901&sk=reels_tab');
    expect(facebookReelsContext('https://www.facebook.com/profile.php?id=61589211347006')?.reelsUrl)
      .toBe('https://www.facebook.com/profile.php?id=61589211347006&sk=reels_tab');
    expect(second?.contextUrl).not.toBe(first?.contextUrl);
    expect(normalizePageUrl('https://www.facebook.com/people/Creator-Name/100012345678901/reels/')).toBe(first?.contextUrl);
    expect(normalizePageUrl(first!.contextUrl)).toBe(first?.contextUrl);
    const batch = browserVisibleBatch(first!.contextUrl, [{
      reel_id: '987654321', reel_url: 'https://facebook.com/reel/987654321', caption: '',
      views: 1200, likes: 30, comments: 2, shares: null, published_at: null
    }], '2026-11-14T00:00:00.000Z');
    expect(batch.reels[0].page_url).toBe(first?.contextUrl);
    expect(batch.reels[0].page_name).toBe('Profile 100012345678901');
  });

  it('recognizes video links only as Reel candidates inside an accepted Reels tab', () => {
    expect(reelIdFromUrl('https://www.facebook.com/creator.name/videos/987654321/')).toBe('987654321');
    expect(reelIdFromUrl('https://www.facebook.com/people/Creator-Name/100012345678901/videos/987654321/')).toBe('987654321');
    expect(isReelsTab('https://www.facebook.com/creator.name/videos/')).toBe(false);
  });

  it('rejects unrelated Facebook areas and non-Facebook hosts', () => {
    expect(facebookReelsContext('https://www.facebook.com/groups/test/reels/')).toBeNull();
    expect(facebookReelsContext('https://example.com/profile.php?id=123&sk=reels')).toBeNull();
    expect(facebookReelsContext('https://www.facebook.com/profile.php?sk=reels')).toBeNull();
  });
});
