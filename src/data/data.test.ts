import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { importCsv, parseCsv, toCsv } from './csv';
import { dedupe, filterAndRank, filterReels, outlierBaselines, outlierScore, pageKey, reelOutlierScore, summarize } from './engine';
import { normalizeDate, normalizePageUrl, parseCount, reelIdentity } from './normalize';
import { toXlsx } from './xlsx';
import { browserVisibleBatch, csvFileSource, ingestSourceBatch, type SourceBatch } from './sources';
import type { Filters, Reel } from '../types';

const base: Reel = {
  page_name: 'Page', page_url: 'https://facebook.com/page', reel_id: '',
  reel_url: 'https://facebook.com/reel/1', caption: '', views: null, likes: null,
  comments: null, shares: null, published_at: null,
  collected_at: '2026-11-14T00:00:00.000Z', source: 'test'
};
const filters: Filters = { query: '', pageKey: '', source: '', minViews: null, sort: 'views', range: 'all', from: '', to: '', top: 10, now: new Date('2026-11-14T12:00:00Z') };

describe('normalization', () => {
  it.each([
    ['1.2K', 1200], ['2.5M', 2500000], ['1,2 triệu', 1200000],
    ['1,234', 1234], ['1.234', 1234], ['12 345', 12345], ['0', 0],
    ['', null], ['—', null], ['1.2', null], ['-10', null]
  ])('parses %s as %s', (input, expected) => expect(parseCount(input)).toBe(expected));
  it('normalizes valid dates and rejects impossible dates', () => {
    expect(normalizeDate('14/11/2026')).toBe('2026-11-14');
    expect(normalizeDate('31/02/2026')).toBeNull();
    expect(normalizeDate('2026-02-31')).toBeNull();
  });
  it('matches Reel URL variants', () => {
    expect(reelIdentity({ reel_id: '', reel_url: 'https://m.facebook.com/reels/123/?foo=1' })).toBe('id:123');
    expect(reelIdentity({ reel_id: '123', reel_url: 'https://facebook.com/reel/123' })).toBe('id:123');
  });
  it('treats a Page root and its Reels tab as one Page', () => {
    expect(normalizePageUrl('https://www.facebook.com/page/reels/?x=1')).toBe('https://facebook.com/page');
    expect(pageKey({ ...base, page_url: 'https://facebook.com/page/reels' })).toBe(pageKey(base));
  });
});

describe('browser visible Reel source', () => {
  it('keeps displayed views separate from other API metrics and marks coverage partial', () => {
    const batch = browserVisibleBatch('https://www.facebook.com/page/reels/', [{
      reel_id: '123', reel_url: 'https://facebook.com/reel/123', caption: '',
      views: 1_200_000, likes: null, comments: 42, shares: 9, published_at: null
    }], '2026-11-14T00:00:00.000Z');
    expect(batch).toMatchObject({ accessBasis: 'browser_visible_user_initiated', coverage: 'partial', viewsMetric: 'facebook_displayed_views' });
    expect(batch.reels[0]).toMatchObject({ page_url: 'https://facebook.com/page', views: 1_200_000, likes: null, comments: 42, shares: 9, source: 'Facebook · tab Reels' });
  });
  it('stores the Facebook display name and refreshes older Reels for the same profile', async () => {
    const profileUrl = 'https://facebook.com/profile.php?id=61589211347006';
    const old: Reel[] = [
      { ...base, page_url: profileUrl, page_name: 'Profile 61589211347006', reel_url: 'https://facebook.com/reel/111', views: 2000, likes: 50 },
      { ...base, page_url: profileUrl, page_name: 'Profile 61589211347006', reel_url: 'https://facebook.com/reel/222', views: 1000 },
      { ...base, page_url: 'https://facebook.com/profile.php?id=123', page_name: 'Profile 123', reel_url: 'https://facebook.com/reel/333' }
    ];
    const batch = browserVisibleBatch(`${profileUrl}&sk=reels_tab`, [{
      reel_id: '111', reel_url: 'https://facebook.com/reel/111', account_name: 'Nguyễn Văn A', caption: '',
      views: null, likes: null, comments: null, shares: null, published_at: null
    }], '2026-11-15T00:00:00.000Z');
    let persisted: Reel[] = [];
    const result = await ingestSourceBatch(old, batch, async reels => { persisted = reels; });
    expect(result.reels.filter(reel => reel.page_url === profileUrl).map(reel => reel.page_name)).toEqual(['Nguyễn Văn A', 'Nguyễn Văn A']);
    expect(result.reels.find(reel => reel.reel_url.endsWith('/111'))).toMatchObject({ views: 2000, likes: 50 });
    expect(result.reels.find(reel => reel.reel_url.endsWith('/333'))?.page_name).toBe('Profile 123');
    expect(persisted).toEqual(result.reels);
  });
});

describe('CSV import and export', () => {
  it('imports every row in the bundled sample', () => {
    const result = importCsv(readFileSync('public/sample-reels.csv', 'utf8'));
    expect(result.reels).toHaveLength(6);
    expect(result.reels.find(reel => reel.reel_id === '100005')?.views).toBe(1_200_000);
  });
  it('accepts quoted delimiters and keeps missing values null', () => {
    const csv = 'reel_url,caption,views,likes\r\nhttps://facebook.com/reel/1,"Hello, ""world""",1.2K,\r\n';
    const result = importCsv(csv, '', '2026-11-14T00:00:00Z');
    expect(result.reels).toHaveLength(1);
    expect(result.reels[0]).toMatchObject({ caption: 'Hello, "world"', views: 1200, likes: null });
  });
  it('reports invalid metrics and skips unsafe URLs', () => {
    const result = importCsv('reel_url,views\nhttps://facebook.com/reel/1,abc\njavascript:alert(1),100');
    expect(result.invalidMetrics).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.reels[0].views).toBeNull();
  });
  it('protects spreadsheet exports from formula text', () => {
    const reel = { ...base, caption: '=1+1' };
    expect(parseCsv(toCsv([reel], [2.5]))[1]).toMatchObject({ 4: "'=1+1", 12: '2.5' });
    const files = unzipSync(toXlsx([reel], [2.5]));
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain("&apos;=1+1");
    expect(sheet).toContain('<c r="M2"><v>2.5</v></c>');
    expect(sheet).not.toContain('<f>');
  });
});

describe('source adapter boundary', () => {
  it('marks a user-provided CSV as unverified and preserves its source label', async () => {
    const file = new File(['reel_url,views,source\nhttps://facebook.com/reel/9,120,owner_export'], 'reels.csv');
    const batch = await csvFileSource.load({ file, fallbackPageUrl: 'https://facebook.com/page' });
    expect(batch).toMatchObject({ adapterId: 'csv_file', accessBasis: 'user_provided_file', coverage: 'unverified', viewsMetric: 'user_supplied_views', total: 1 });
    expect(batch.reels[0].source).toBe('owner_export');
  });
  it('validates and persists a normalized batch before reporting success', async () => {
    const batch: SourceBatch = {
      adapterId: 'csv_file', accessBasis: 'user_provided_file', coverage: 'unverified', viewsMetric: 'user_supplied_views',
      reels: [{ ...base, reel_url: 'https://www.facebook.com/reel/1/?tracking=1', views: 100 }],
      total: 1, skipped: 0, invalidMetrics: 0
    };
    let persisted: Reel[] = [];
    const result = await ingestSourceBatch([base], batch, async reels => { persisted = reels; });
    expect(result).toMatchObject({ newCount: 0, duplicateCount: 1 });
    expect(persisted).toHaveLength(1);
    expect(persisted[0].reel_url).toBe('https://facebook.com/reel/1');
  });
  it('rejects a different metric being silently imported as views', async () => {
    const batch: SourceBatch = {
      adapterId: 'future_api', accessBasis: 'approved_api', coverage: 'partial', viewsMetric: 'facebook_reel_plays',
      reels: [{ ...base, views: 100 }], total: 1, skipped: 0, invalidMetrics: 0
    };
    await expect(ingestSourceBatch([], batch, async () => {})).rejects.toThrow('chỉ số khác views');
  });
});

describe('ranking and analytics', () => {
  const reels: Reel[] = [
    { ...base, reel_url: 'https://facebook.com/reel/1', views: 100, published_at: '2026-11-13' },
    { ...base, reel_url: 'https://facebook.com/reel/2', views: null, published_at: null },
    { ...base, reel_url: 'https://facebook.com/reel/3', views: 500, published_at: '2026-10-01' },
    { ...base, reel_url: 'https://facebook.com/reel/4', views: 200, published_at: '2026-11-12' }
  ];
  it('deduplicates URL variants and prefers complete rows', () => {
    const result = dedupe([reels[0], { ...reels[0], reel_url: 'https://www.facebook.com/reels/1/?x=1', likes: 5 }]);
    expect(result).toHaveLength(1);
    expect(result[0].likes).toBe(5);
  });
  it('deduplicates the same URL even if imported IDs disagree', () => {
    const result = dedupe([reels[0], { ...reels[0], reel_id: 'different', likes: 9 }]);
    expect(result).toHaveLength(1);
    expect(result[0].likes).toBe(9);
  });
  it('keeps grid views when a later detail record adds engagement and date', () => {
    const grid = { ...reels[0], views: 1200, likes: null, comments: null, shares: null, published_at: null };
    const detail = { ...grid, views: null, likes: 80, comments: 12, shares: 4, published_at: '2026-11-12', collected_at: '2026-11-15T00:00:00.000Z' };
    expect(dedupe([grid, detail])[0]).toMatchObject({ views: 1200, likes: 80, comments: 12, shares: 4, published_at: '2026-11-12' });
  });
  it('keeps a known account display name when a later scan has only the URL fallback', () => {
    const pageUrl = 'https://facebook.com/profile.php?id=61589211347006';
    const named = { ...reels[0], page_url: pageUrl, page_name: 'Nguyễn Văn A' };
    const fallback = { ...named, page_name: 'Profile 61589211347006', likes: 10, collected_at: '2026-11-15T00:00:00.000Z' };
    expect(dedupe([named, fallback])[0]).toMatchObject({ page_name: 'Nguyễn Văn A', likes: 10 });
  });
  it('sorts counts, leaves missing values last, then limits Top N', () => {
    expect(filterAndRank(reels, { ...filters, top: 3 }).map(r => r.views)).toEqual([500, 200, 100]);
    expect(filterAndRank(reels, filters).at(-1)?.views).toBeNull();
  });
  it('filters recent dates and excludes unknown dates', () => {
    expect(filterAndRank(reels, { ...filters, range: '7' }).map(r => r.views)).toEqual([200, 100]);
  });
  it('filters Page, source and minimum views without losing null semantics', () => {
    const otherPage = { ...reels[2], page_url: 'https://facebook.com/other', source: 'api' };
    const selected = filterReels([...reels, otherPage], {
      ...filters, pageKey: pageKey(base)!, source: 'test', minViews: 150
    });
    expect(selected.map(reel => reel.views)).toEqual([500, 200]);
  });
  it('calculates stats and guards the outlier score', () => {
    const summary = summarize(reels);
    expect(summary).toMatchObject({ total: 4, withViews: 3, totalViews: 800, median: 200 });
    expect(outlierScore(500, summary.median, summary.withViews)).toBeNull();
    expect(outlierScore(500, 200, 5)).toBe(2.5);
  });
  it('uses each Page and date range as its own outlier cohort', () => {
    const a = [100, 100, 100, 100, 500].map((views, i) => ({
      ...base, reel_url: `https://facebook.com/reel/a${i}`, views,
      caption: i === 4 ? 'viral' : 'ordinary', published_at: '2026-11-13', source: i === 4 ? 'other' : 'test'
    }));
    const b = [1000, 1000, 1000, 1000, 1000].map((views, i) => ({
      ...base, page_url: 'https://facebook.com/another', reel_url: `https://facebook.com/reel/b${i}`,
      views, published_at: '2026-11-13'
    }));
    const old = { ...base, reel_url: 'https://facebook.com/reel/old', views: 1, published_at: '2026-09-01' };
    const baseline = outlierBaselines([...a, ...b, old], { ...filters, range: '7', query: 'viral', source: 'other', minViews: 500, top: 1 });
    expect(reelOutlierScore(a[4], baseline)).toBe(5);
    expect(reelOutlierScore(b[0], baseline)).toBe(1);
    expect(baseline.get(pageKey(old)!)?.sampleSize).toBe(5);
    expect(reelOutlierScore({ ...base, page_name: '', page_url: '' }, baseline)).toBeNull();
  });
});
