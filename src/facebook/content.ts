import { extractVisibleMetrics, isReelsTab, parsePublishedValue, reelIdFromUrl, type VisibleReel } from './extract';
import { accountNameFromDocument, mostCommonAccountName } from './name';

type ScanMessage = { type: 'FFB_START'; scanId: string; maxSteps: number } | { type: 'FFB_STOP'; scanId: string };
type ScanState = { scanId: string; stopped: boolean };
type ScanWindow = Window & { __ffbLensScan?: { active: ScanState | null; installed: boolean; metadata: Map<string, VisibleReel> } };
type Diagnostics = { links: number; recognized: number; withViews: number; withLikes: number; withComments: number; withDates: number; fromBrowser: number; scrollTop: number; scrollHeight: number };

declare const chrome: {
  runtime: {
    onMessage: { addListener(listener: (message: ScanMessage, sender: unknown, sendResponse: (response: unknown) => void) => void): void };
    sendMessage(message: unknown): Promise<unknown>;
  };
};

const state = (window as ScanWindow).__ffbLensScan ||= { active: null, installed: false, metadata: new Map() };

function send(scanId: string, phase: string, reels: VisibleReel[], step: number, reason = '', diagnostics?: Diagnostics) {
  void chrome.runtime.sendMessage({ type: 'FFB_SCAN_UPDATE', scanId, phase, reels, step, reason, diagnostics }).catch(() => {});
}

function visibleText(element: HTMLElement): string {
  const text = element.innerText || '';
  const labels = Array.from(element.querySelectorAll<HTMLElement>('[aria-label], [title]'))
    .filter(node => node.getClientRects().length > 0)
    .slice(0, 20)
    .map(node => node.getAttribute('aria-label') || node.getAttribute('title') || '')
    .filter(label => /views?|lượt xem|likes?|lượt thích|comments?|bình luận|shares?|chia sẻ/i.test(label));
  return `${text}\n${labels.join('\n')}`;
}

function cardFor(link: HTMLAnchorElement): HTMLElement {
  let node = link.parentElement || link;
  let best: HTMLElement = node;
  for (let depth = 0; depth < 6 && node; depth++, node = node.parentElement!) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 1000 || rect.height > 1300 || (node.innerText || '').length > 1500) break;
    const ids = new Set(Array.from(node.querySelectorAll<HTMLAnchorElement>('a[href]')).map(a => reelIdFromUrl(a.href)).filter(Boolean));
    if (ids.size > 1) break;
    best = node;
    if (extractVisibleMetrics(visibleText(node)).views !== null) break;
  }
  return best;
}

function publishedAt(card: HTMLElement): string | null {
  const candidates = card.querySelectorAll<HTMLElement>('time[datetime], [data-utime], abbr[title]');
  for (const node of Array.from(candidates)) {
    const value = node.getAttribute('datetime') || node.getAttribute('data-utime') || node.getAttribute('title');
    const parsed = parsePublishedValue(value);
    if (parsed) return parsed;
  }
  return null;
}

function collect(): VisibleReel[] {
  const byId = new Map<string, VisibleReel>();
  const accountName = mostCommonAccountName([...state.metadata.values()].map(reel => reel.account_name)) || accountNameFromDocument(document);
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/reel/"], a[href*="/reels/"], a[href*="/videos/"]');
  for (const link of Array.from(links).slice(0, 3000)) {
    const style = getComputedStyle(link);
    if (style.display === 'none' || style.visibility === 'hidden' || link.closest('[aria-hidden="true"]')) continue;
    const id = reelIdFromUrl(link.href);
    if (!id) continue;
    const card = cardFor(link);
    const metrics = extractVisibleMetrics(visibleText(card));
    const date = publishedAt(card);
    const caption = card.querySelector<HTMLElement>('[data-ad-comet-preview="message"]')?.innerText?.trim() || '';
    const candidate: VisibleReel = {
      reel_id: id,
      reel_url: `https://facebook.com/reel/${id}`,
      account_name: accountName,
      caption: caption.slice(0, 2000),
      ...metrics,
      published_at: date
    };
    const old = byId.get(id);
    if (!old || [candidate.views, candidate.likes, candidate.comments, candidate.shares, candidate.published_at, candidate.caption].filter(v => v !== null && v !== '').length >
      [old.views, old.likes, old.comments, old.shares, old.published_at, old.caption].filter(v => v !== null && v !== '').length) byId.set(id, candidate);
  }
  for (const [id, metadata] of state.metadata) {
    const grid = byId.get(id);
    byId.set(id, grid ? {
      ...grid,
      account_name: accountName || metadata.account_name || grid.account_name,
      caption: metadata.caption || grid.caption,
      views: metadata.views ?? grid.views,
      likes: metadata.likes ?? grid.likes,
      comments: metadata.comments ?? grid.comments,
      shares: metadata.shares ?? grid.shares,
      published_at: metadata.published_at || grid.published_at
    } : { ...metadata, account_name: accountName || metadata.account_name });
  }
  return [...byId.values()];
}

function scrollTarget(): HTMLElement {
  const link = document.querySelector<HTMLAnchorElement>('a[href*="/reel/"], a[href*="/reels/"], a[href*="/videos/"]');
  let node = link?.parentElement || null;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 100) return node;
    node = node.parentElement;
  }
  return (document.scrollingElement || document.documentElement) as HTMLElement;
}

async function waitForReels(scan: ScanState): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (!scan.stopped && Date.now() < deadline) {
    if (state.metadata.size || Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/reel/"], a[href*="/reels/"], a[href*="/videos/"]')).some(link => reelIdFromUrl(link.href))) return;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

async function run(scan: ScanState, maxSteps: number) {
  const seen = new Map<string, VisibleReel>();
  let stale = 0;
  let reason = 'Đã đạt giới hạn số lần cuộn.';
  let lastStep = 0;
  let diagnostics: Diagnostics = { links: 0, recognized: 0, withViews: 0, withLikes: 0, withComments: 0, withDates: 0, fromBrowser: 0, scrollTop: 0, scrollHeight: 0 };
  try {
    if (!isReelsTab(location.href)) throw new Error('Chỉ quét khi tab đang ở mục Reels của một Page.');
    state.metadata.clear();
    window.postMessage({ source: 'FFB_LENS_CONTENT', type: 'SNAPSHOT_REQUEST' }, location.origin);
    await new Promise(resolve => setTimeout(resolve, 150));
    await waitForReels(scan);
    for (let step = 0; step <= maxSteps; step++) {
      lastStep = step;
      if (scan.stopped) { reason = 'Đã dừng theo yêu cầu.'; break; }
      if (!isReelsTab(location.href)) { reason = 'Đã rời tab Reels.'; break; }
      const changed: VisibleReel[] = [];
      const current = collect();
      const target = scrollTarget();
      diagnostics = {
        links: document.querySelectorAll('a[href*="/reel/"], a[href*="/reels/"], a[href*="/videos/"]').length,
        recognized: current.length,
        withViews: current.filter(reel => reel.views !== null).length,
        withLikes: current.filter(reel => reel.likes !== null).length,
        withComments: current.filter(reel => reel.comments !== null).length,
        withDates: current.filter(reel => reel.published_at !== null).length,
        fromBrowser: state.metadata.size,
        scrollTop: target.scrollTop,
        scrollHeight: target.scrollHeight
      };
      for (const reel of current) {
        const previous = seen.get(reel.reel_id);
        if (!previous || JSON.stringify(previous) !== JSON.stringify(reel)) {
          seen.set(reel.reel_id, reel);
          changed.push(reel);
        }
      }
      if (changed.length) send(scan.scanId, 'progress', changed, step, '', diagnostics);
      if (step === maxSteps) break;
      const before = target.scrollTop;
      const height = target.scrollHeight;
      target.scrollBy({ top: Math.max(350, Math.min(target.clientHeight * 0.8, 850)), behavior: 'auto' });
      await new Promise(resolve => setTimeout(resolve, 900));
      stale = changed.length === 0 && target.scrollTop === before && target.scrollHeight === height ? stale + 1 : 0;
      send(scan.scanId, 'heartbeat', [], step + 1, '', diagnostics);
      if (stale >= 3) { reason = 'Không còn Reel mới khi cuộn; có thể đã tới cuối phần nội dung tải được.'; break; }
      if (seen.size >= 1500) { reason = 'Đã đạt giới hạn 1.500 Reel.'; break; }
    }
    if (seen.size === 0) reason = `Không nhận diện được URL Reel trên tab (${diagnostics.links} liên kết ứng viên). Facebook có thể đang tải nội dung hoặc đã đổi cấu trúc trang.`;
    else if (![...seen.values()].some(reel => reel.views !== null)) reason += ' Đã thấy Reel nhưng không đọc được số lượt xem; Facebook có thể đã đổi cách hiển thị.';
    send(scan.scanId, 'done', [...seen.values()], lastStep, reason, diagnostics);
  } catch (error) {
    send(scan.scanId, 'error', [], lastStep, error instanceof Error ? error.message : 'Không thể đọc tab Reels.', diagnostics);
  } finally {
    if (state.active === scan) state.active = null;
  }
}

if (!state.installed) {
  state.installed = true;
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin ||
      event.data?.source !== 'FFB_LENS_OBSERVER' || event.data.type !== 'REELS' || !Array.isArray(event.data.reels)) return;
    for (const reel of event.data.reels.slice(0, 2000) as VisibleReel[]) {
      if (!reel || !/^\d+$/.test(reel.reel_id) || reelIdFromUrl(reel.reel_url) !== reel.reel_id) continue;
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
