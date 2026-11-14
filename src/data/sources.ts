import type { Reel } from '../types';
import { importCsv } from './csv';
import { writeReels } from './db';
import { dedupe } from './engine';
import { normalizeDate, normalizePageUrl, normalizeUrl } from './normalize';
import type { VisibleReel } from '../facebook/extract';

export type Coverage = 'unverified' | 'partial' | 'verified_complete';
export type AccessBasis = 'user_provided_file' | 'user_entered' | 'browser_visible_user_initiated' | 'approved_api' | 'licensed_provider';
export type ViewsMetric = 'user_supplied_views' | 'facebook_displayed_views' | 'facebook_reel_plays' | 'content_library_views';

export interface SourceBatch {
  adapterId: string;
  accessBasis: AccessBasis;
  coverage: Coverage;
  viewsMetric: ViewsMetric;
  reels: Reel[];
  total: number;
  skipped: number;
  invalidMetrics: number;
}

export interface SourceAdapter<Input> {
  readonly id: string;
  load(input: Input): Promise<SourceBatch>;
}

export interface CsvFileInput { file: File; fallbackPageUrl: string; collectedAt?: string }

export const csvFileSource: SourceAdapter<CsvFileInput> = {
  id: 'csv_file',
  async load({ file, fallbackPageUrl, collectedAt }) {
    const result = importCsv(await file.text(), fallbackPageUrl, collectedAt);
    return {
      adapterId: this.id,
      accessBasis: 'user_provided_file',
      coverage: 'unverified',
      viewsMetric: 'user_supplied_views',
      ...result
    };
  }
};

export function browserVisibleBatch(pageUrl: string, visible: VisibleReel[], collectedAt = new Date().toISOString()): SourceBatch {
  const normalizedPage = normalizePageUrl(pageUrl);
  if (!normalizedPage || !['facebook.com', 'web.facebook.com'].includes(new URL(normalizedPage).hostname)) {
    throw new Error('URL Page không hợp lệ.');
  }
  const page = new URL(normalizedPage);
  const pageName = page.pathname === '/profile.php' ? `Profile ${page.searchParams.get('id')}` : page.pathname.split('/').filter(Boolean)[0] || '';
  return {
    adapterId: 'facebook_visible_tab',
    accessBasis: 'browser_visible_user_initiated',
    coverage: 'partial',
    viewsMetric: 'facebook_displayed_views',
    reels: visible.map(item => ({
      page_name: pageName,
      page_url: normalizedPage,
      reel_id: item.reel_id,
      reel_url: item.reel_url,
      caption: item.caption,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      shares: item.shares,
      published_at: normalizeDate(item.published_at),
      collected_at: collectedAt,
      source: 'Facebook · tab Reels'
    })),
    total: visible.length,
    skipped: 0,
    invalidMetrics: 0
  };
}

function validateRecord(reel: Reel, viewsMetric: ViewsMetric): Reel {
  const reelUrl = normalizeUrl(reel.reel_url);
  if (!reelUrl) throw new Error('Nguồn dữ liệu có Reel URL không hợp lệ.');
  if (!reel.source?.trim()) throw new Error('Nguồn dữ liệu thiếu nhãn source.');
  const collectedAt = normalizeDate(reel.collected_at);
  if (!collectedAt) throw new Error('Nguồn dữ liệu thiếu thời điểm thu thập hợp lệ.');
  if (reel.published_at && !normalizeDate(reel.published_at)) throw new Error('Nguồn dữ liệu có ngày đăng không hợp lệ.');
  for (const key of ['views', 'likes', 'comments', 'shares'] as const) {
    const value = reel[key];
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) throw new Error(`Nguồn dữ liệu có ${key} không hợp lệ.`);
  }
  if (reel.views !== null && (viewsMetric === 'facebook_reel_plays' || viewsMetric === 'content_library_views')) {
    throw new Error('Nguồn dữ liệu dùng chỉ số khác views. Cần ánh xạ chỉ số riêng trước khi nhập.');
  }
  return { ...reel, reel_url: reelUrl, page_url: normalizePageUrl(reel.page_url) || '', collected_at: collectedAt };
}

export interface IngestResult {
  reels: Reel[];
  newCount: number;
  duplicateCount: number;
}

export async function ingestSourceBatch(
  existing: Reel[],
  batch: SourceBatch,
  persist: (reels: Reel[]) => Promise<void> = writeReels
): Promise<IngestResult> {
  const validated = batch.reels.map(reel => validateRecord(reel, batch.viewsMetric));
  const merged = dedupe([...existing, ...validated]);
  await persist(merged);
  return {
    reels: merged,
    newCount: Math.max(0, merged.length - existing.length),
    duplicateCount: existing.length + validated.length - merged.length
  };
}
