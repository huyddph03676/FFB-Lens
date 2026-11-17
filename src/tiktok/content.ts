import { parseCount } from '../data/normalize';
import type { VisibleReel } from '../facebook/extract';
import { tiktokProfileContext } from './context';
import { parseTikTokItems, parseTikTokProfileName, visibleTikTokVideo } from './parse';

type ScanMessage = { type: 'FFB_START'; scanId: string; maxSteps: number } | { type: 'FFB_STOP'; scanId: string };
type ScanState = { scanId: string; stopped: boolean };
type ScanWindow = Window & { __ffbLensTikTokScan?: { active: ScanState | null; installed: boolean; accountName: string; metadata: Map<string, VisibleReel> } };
type Diagnostics = { links: number; recognized: number; withViews: number; withLikes: number; withComments: number; withShares: number; withDates: number; fromBrowser: number; scrollTop: number; scrollHeight: number };

declare const chrome: {
  runtime: {
    onMessage: { addListener(listener: (message: ScanMessage, sender: unknown, sendResponse: (response: unknown) => void) => void): void };
    sendMessage(message: unknown): Promise<unknown>;
  };
};

const state = (window as ScanWindow).__ffbLensTikTokScan ||= { active: null, installed: false, accountName: '', metadata: new Map() };

function send(scanId: string, phase: string, reels: VisibleReel[], step: number, reason = '', diagnostics?: Diagnostics) {
  void chrome.runtime.sendMessage({ type: 'FFB_SCAN_UPDATE', scanId, phase, reels, step, reason, diagnostics }).catch(() => {});
}

function readHydration() {
  const context = tiktokProfileContext(location.href);
  if (!context) return;
  const scripts = document.querySelectorAll<HTMLScriptElement>('script#__UNIVERSAL_DATA_FOR_REHYDRATION__, script#SIGI_STATE');
  for (const script of Array.from(scripts)) {
    if (!script.textContent || script.textContent.length > 12_000_000) continue;
    state.accountName ||= parseTikTokProfileName(script.textContent, context.username);
    for (const reel of parseTikTokItems(script.textContent, context.username)) state.metadata.set(reel.reel_id, reel);
  }
}

function accountName(): string {
  if (state.accountName) return state.accountName;
  const name = [...state.metadata.values()].map(reel => reel.account_name?.trim()).find(Boolean);
  if (name) return name;
  const title = document.title.match(/^(.+?)\s*\(@[^)]+\)\s*\|\s*TikTok$/iu);
  if (title) return title[1].trim().slice(0, 120);
  return document.querySelector<HTMLElement>('[data-e2e="user-subtitle"], [data-e2e="user-nickname"]')?.textContent?.trim().slice(0, 120) || '';
}

function collect(): VisibleReel[] {
  const context = tiktokProfileContext(location.href);
  if (!context) return [];
  const name = accountName();
  const byId = new Map<string, VisibleReel>();
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/video/"]');
  for (const link of Array.from(links).slice(0, 3000)) {
    if (link.closest('[aria-hidden="true"]')) continue;
    const parsed = visibleTikTokVideo(link.href);
    if (!parsed || !parsed.url.includes(`/@${context.username}/`)) continue;
    const card = link.closest<HTMLElement>('[data-e2e="user-post-item"], [data-e2e="user-post-item-list"] > div') || link;
    const rawViews = card.querySelector<HTMLElement>('[data-e2e="video-views"], [data-e2e="video-play-count"]')?.textContent?.trim() || '';
    const views = parseCount(rawViews);
    const caption = (link.getAttribute('title') || card.querySelector('img[alt]')?.getAttribute('alt') || '').trim().slice(0, 2000);
    byId.set(parsed.id, {
      reel_id: parsed.id, reel_url: parsed.url, account_name: name, caption,
      views, likes: null, comments: null, shares: null, published_at: null
    });
  }
  for (const [id, metadata] of state.metadata) {
    const card = byId.get(id);
    byId.set(id, card ? {
      ...card,
      account_name: name || metadata.account_name,
      caption: metadata.caption || card.caption,
      views: metadata.views ?? card.views,
      likes: metadata.likes ?? card.likes,
      comments: metadata.comments ?? card.comments,
      shares: metadata.shares ?? card.shares,
      published_at: metadata.published_at || card.published_at
    } : { ...metadata, account_name: name || metadata.account_name });
  }
  return [...byId.values()];
}

async function waitForVideos(scan: ScanState) {
  const deadline = Date.now() + 15_000;
  while (!scan.stopped && Date.now() < deadline) {
    if (state.metadata.size || document.querySelector('a[href*="/video/"]')) return;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

async function run(scan: ScanState, maxSteps: number) {
  const seen = new Map<string, VisibleReel>();
  let stale = 0, lastStep = 0;
  let reason = 'Đã đạt giới hạn số lần cuộn.';
  let diagnostics: Diagnostics = { links: 0, recognized: 0, withViews: 0, withLikes: 0, withComments: 0, withShares: 0, withDates: 0, fromBrowser: 0, scrollTop: 0, scrollHeight: 0 };
  try {
    if (!tiktokProfileContext(location.href)) throw new Error('Chỉ quét khi tab đang ở trang hồ sơ TikTok.');
    state.metadata.clear();
    state.accountName = '';
    readHydration();
    window.postMessage({ source: 'FFB_LENS_TIKTOK_CONTENT', type: 'SNAPSHOT_REQUEST' }, location.origin);
    await waitForVideos(scan);
    for (let step = 0; step <= maxSteps; step++) {
      lastStep = step;
      if (scan.stopped) { reason = 'Đã dừng theo yêu cầu.'; break; }
      if (!tiktokProfileContext(location.href)) { reason = 'Đã rời trang hồ sơ TikTok.'; break; }
      const current = collect();
      const target = (document.scrollingElement || document.documentElement) as HTMLElement;
      diagnostics = {
        links: document.querySelectorAll('a[href*="/video/"]').length,
        recognized: current.length,
        withViews: current.filter(item => item.views !== null).length,
        withLikes: current.filter(item => item.likes !== null).length,
        withComments: current.filter(item => item.comments !== null).length,
        withShares: current.filter(item => item.shares !== null).length,
        withDates: current.filter(item => item.published_at !== null).length,
        fromBrowser: state.metadata.size,
        scrollTop: target.scrollTop,
        scrollHeight: target.scrollHeight
      };
      const changed: VisibleReel[] = [];
      for (const item of current) {
        const old = seen.get(item.reel_id);
        if (!old || JSON.stringify(old) !== JSON.stringify(item)) { seen.set(item.reel_id, item); changed.push(item); }
      }
      if (changed.length) send(scan.scanId, 'progress', changed, step, '', diagnostics);
      if (step === maxSteps) break;
      const before = target.scrollTop, height = target.scrollHeight;
      target.scrollBy({ top: Math.max(350, Math.min(target.clientHeight * 0.8, 850)), behavior: 'auto' });
      await new Promise(resolve => setTimeout(resolve, 900));
      stale = changed.length === 0 && target.scrollTop === before && target.scrollHeight === height ? stale + 1 : 0;
      send(scan.scanId, 'heartbeat', [], step + 1, '', diagnostics);
      if (stale >= 3) { reason = 'Không còn video mới khi cuộn; có thể đã tới cuối phần nội dung tải được.'; break; }
      if (seen.size >= 1500) { reason = 'Đã đạt giới hạn 1.500 video.'; break; }
    }
    if (!seen.size) reason = `Không nhận diện được URL video trên hồ sơ (${diagnostics.links} liên kết ứng viên). TikTok có thể đang tải nội dung hoặc đã đổi cấu trúc trang.`;
    send(scan.scanId, 'done', [...seen.values()], lastStep, reason, diagnostics);
  } catch (error) {
    send(scan.scanId, 'error', [], lastStep, error instanceof Error ? error.message : 'Không thể đọc hồ sơ TikTok.', diagnostics);
  } finally {
    if (state.active === scan) state.active = null;
  }
}

if (!state.installed) {
  state.installed = true;
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin ||
      event.data?.source !== 'FFB_LENS_TIKTOK_OBSERVER' || event.data.type !== 'VIDEOS' || !Array.isArray(event.data.reels)) return;
    for (const reel of event.data.reels.slice(0, 2000) as VisibleReel[]) {
      const parsed = visibleTikTokVideo(reel?.reel_url || '');
      if (!parsed || parsed.id !== reel.reel_id) continue;
      state.metadata.set(reel.reel_id, reel);
    }
  });
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'FFB_START') {
      if (state.active) state.active.stopped = true;
      const scan = { scanId: message.scanId, stopped: false };
      state.active = scan;
      void run(scan, Math.max(1, Math.min(100, Math.floor(message.maxSteps))));
      respond({ ok: true });
    } else if (message?.type === 'FFB_STOP') {
      if (state.active?.scanId === message.scanId) state.active.stopped = true;
      respond({ ok: true });
    }
  });
}
