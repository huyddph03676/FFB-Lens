import './style.css';
import { toCsv } from './data/csv';
import { dedupe, filterAndRank, filterReels, outlierBaselines, pageKey, reelOutlierScore, summarize } from './data/engine';
import { readReels, writeReels } from './data/db';
import { browserVisibleBatch, csvFileSource, ingestSourceBatch } from './data/sources';
import { toXlsx } from './data/xlsx';
import { isFacebookPageHost, manualPageBatch, pageContextFromTab } from './data/manual-page';
import { normalizeUrl } from './data/normalize';
import { isReelsTab, type VisibleReel } from './facebook/extract';
import { facebookReelsContext } from './facebook/context';
import { isDisplayAccountName } from './facebook/name';
import { englishUi, translateError, type Language } from './i18n';
import type { DateRange, Filters, Reel, SortKey } from './types';

declare const chrome: {
  tabs?: {
    query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number; url?: string }>>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
    reload(tabId: number): Promise<void>;
    onUpdated: {
      addListener(listener: (tabId: number, changeInfo: { status?: string }) => void): void;
      removeListener(listener: (tabId: number, changeInfo: { status?: string }) => void): void;
    };
  };
  scripting?: {
    executeScript(options: { target: { tabId: number }; files: string[] }): Promise<unknown>;
    getRegisteredContentScripts(options: { ids: string[] }): Promise<Array<{ id: string }>>;
    registerContentScripts(scripts: Array<{ id: string; js: string[]; matches: string[]; runAt: 'document_start'; world: 'MAIN'; persistAcrossSessions: boolean }>): Promise<void>;
  };
  permissions?: { request(options: { origins: string[] }): Promise<boolean> };
  runtime?: { onMessage: { addListener(listener: (message: ScanUpdate, sender: { tab?: { id?: number } }) => void): void } };
} | undefined;

interface ScanUpdate {
  type: 'FFB_SCAN_UPDATE';
  scanId: string;
  phase: 'progress' | 'heartbeat' | 'done' | 'error';
  reels: VisibleReel[];
  step: number;
  reason: string;
  diagnostics?: { links: number; recognized: number; withViews: number; withLikes: number; withComments: number; withDates: number; fromBrowser: number; scrollTop: number; scrollHeight: number };
}

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="masthead">
    <div class="brand"><div class="brand-mark">◈</div><div><strong>FFB Lens</strong><span>REELS ANALYZER</span></div></div>
    <div class="masthead-actions"><label class="language-control" for="language-select"><span>Ngôn ngữ</span><select id="language-select" aria-label="Ngôn ngữ"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label><div class="local-badge"><span class="dot"></span> Dữ liệu trên máy</div></div>
  </header>
  <main>
    <section class="hero">
      <div class="eyebrow">FACEBOOK PAGE / PROFILE REELS</div>
      <h1>Phân tích Reels<br><em>ngay trên Facebook.</em></h1>
      <p>Mở mục Reels của Page hoặc trang cá nhân, bấm Quét để cuộn và xếp hạng các Reel đã tải.</p>
    </section>
    <section class="import-card page-workspace">
      <div class="section-head"><div><div class="eyebrow">01 / TÀI KHOẢN ĐANG XEM</div><h2>Quét mục Reels</h2></div><div class="step-icon">↗</div></div>
      <label class="field-label" for="page-url">URL Page hoặc trang cá nhân</label>
      <input id="page-url" type="url" placeholder="https://www.facebook.com/ten-tai-khoan/reels/" spellcheck="false" />
      <div class="page-actions"><button id="detect-page" class="button ghost" type="button">Nhận tài khoản từ tab</button><a id="open-page" class="button ghost" target="_blank" rel="noopener noreferrer" hidden>Mở mục Reels ↗</a></div>
      <p id="page-status" class="field-help">Mở mục Reels của Page hoặc trang cá nhân rồi bấm biểu tượng FFB Lens.</p>
      <div class="scan-controls"><label class="control"><span>GIỚI HẠN LẦN CUỘN</span><select id="scan-steps"><option value="10">10 lần</option><option value="30" selected>30 lần</option><option value="60">60 lần</option><option value="100">100 lần</option></select></label><button id="scan-start" class="button primary" type="button">Quét Reels trên tab</button><button id="scan-stop" class="button ghost" type="button" disabled>Dừng</button></div>
      <div id="scan-status" class="scan-status" role="status" aria-live="polite">Chưa quét. Chrome sẽ hỏi quyền đọc tab Facebook khi bạn bấm Quét lần đầu; không cần mở DevTools.</div>
      <details class="secondary-import"><summary>Ghi một Reel thủ công</summary><form id="manual-form" class="manual-form">
        <label class="field-label" for="manual-url">URL Reel <span>· bắt buộc</span></label>
        <input id="manual-url" type="url" placeholder="https://www.facebook.com/reel/123456…" required spellcheck="false" />
        <button id="detect-reel" class="button ghost" type="button">Lấy URL Reel từ tab đang mở</button>
        <div class="manual-metrics"><label class="control"><span>LƯỢT XEM</span><input id="manual-views" inputmode="decimal" placeholder="1.2M" /></label><label class="control"><span>LƯỢT THÍCH</span><input id="manual-likes" inputmode="decimal" placeholder="Tùy chọn" /></label><label class="control"><span>BÌNH LUẬN</span><input id="manual-comments" inputmode="decimal" placeholder="Tùy chọn" /></label><label class="control"><span>CHIA SẺ</span><input id="manual-shares" inputmode="decimal" placeholder="Tùy chọn" /></label></div>
        <label class="control"><span>CAPTION · TÙY CHỌN</span><textarea id="manual-caption" rows="2" placeholder="Nội dung Reel đang xem"></textarea></label>
        <label class="control"><span>NGÀY ĐĂNG · TÙY CHỌN</span><input id="manual-date" type="date" /></label>
        <button class="button primary" type="submit">+ Ghi Reel và xếp hạng</button>
      </form></details>
      <p class="field-help">Số liệu có thể được Facebook làm tròn. Chỉ số không hiển thị sẽ để trống; kết quả là Top của Reel đã đọc, không phải toàn bộ lịch sử tài khoản.</p>
      <details class="secondary-import"><summary>Nhập dữ liệu hoặc xem mẫu</summary><div class="import-actions"><button id="import-button" class="button ghost" type="button">Nhập CSV</button><button id="sample-button" class="button ghost" type="button">Xem dữ liệu mẫu</button><input id="file-input" type="file" accept=".csv,text/csv,text/plain" hidden /></div></details>
      <div id="notice" class="notice" role="status" aria-live="polite"></div>
    </section>
    <section class="insights" aria-label="Tổng quan">
      <div class="section-head compact"><div><div class="eyebrow">02 / TỔNG QUAN</div><h2>Tập dữ liệu hiện tại</h2></div></div>
      <div class="stats-grid">
        <div class="stat"><span>REELS</span><strong id="stat-count">—</strong><small>Sau bộ lọc</small></div>
        <div class="stat"><span>TỔNG LƯỢT XEM</span><strong id="stat-views">—</strong><small>Có dữ liệu views</small></div>
        <div class="stat"><span>TRUNG VỊ VIEWS</span><strong id="stat-median">—</strong><small id="stat-coverage">—</small></div>
        <div class="stat"><span>TB VIEWS</span><strong id="stat-mean">—</strong><small>Trên Reel có views</small></div>
        <div class="stat"><span>MAX VIEWS</span><strong id="stat-max">—</strong><small>Trong tập đã lọc</small></div>
        <div class="stat"><span>CÓ NGÀY ĐĂNG</span><strong id="stat-dates">—</strong><small id="stat-date-coverage">—</small></div>
      </div>
      <div id="highlight" class="highlight" hidden><div><span>REEL NỔI BẬT NHẤT THEO VIEWS</span><strong id="highlight-title"></strong></div><a id="highlight-link" target="_blank" rel="noopener noreferrer">Mở Reel ↗</a></div>
    </section>
    <section class="results">
      <div class="section-head"><div><div class="eyebrow">03 / BẢNG XẾP HẠNG</div><h2>Danh sách Reels</h2></div><span id="result-count" class="result-count">0 kết quả</span></div>
      <div class="scope-note">Xếp hạng phản ánh Reel đã quét, ghi hoặc nhập. Phạm vi quét có giới hạn và có thể thiếu Reel hoặc chỉ số.</div>
      <div class="filter-grid">
        <label class="control wide"><span>TÌM KIẾM</span><input id="query" type="search" placeholder="Caption, Page, URL..." /></label>
        <label class="control"><span>SẮP XẾP</span><select id="sort"><option value="views">Nhiều lượt xem</option><option value="likes">Nhiều lượt thích</option><option value="comments">Nhiều bình luận</option><option value="shares">Nhiều chia sẻ</option><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select></label>
        <label class="control"><span>THỜI GIAN</span><select id="range"><option value="all">Tất cả dữ liệu</option><option value="7">7 ngày</option><option value="30">30 ngày</option><option value="90">90 ngày</option><option value="custom">Tùy chỉnh</option></select></label>
        <label class="control"><span>TOP</span><select id="top"><option>10</option><option>20</option><option>50</option><option>100</option></select></label>
      </div>
      <div id="date-controls" class="date-controls" hidden><label>Từ ngày<input id="from" type="date" /></label><label>Đến ngày<input id="to" type="date" /></label></div>
      <div class="advanced-filters">
        <label class="control"><span>TÀI KHOẢN</span><select id="page-filter"><option value="">Tất cả tài khoản</option></select></label>
        <label class="control"><span>NGUỒN DỮ LIỆU</span><select id="source-filter"><option value="">Tất cả nguồn</option></select></label>
        <label class="control"><span>VIEWS TỐI THIỂU</span><input id="min-views" type="number" min="0" step="1" placeholder="Không giới hạn" /></label>
      </div>
      <div id="scope-detail" class="scope-detail"></div>
      <div class="baseline-note">Outlier = views ÷ trung vị views của cùng tài khoản trong kỳ đã chọn. Cần ít nhất 5 Reel có views và trung vị &gt; 0. Tìm kiếm, nguồn, ngưỡng views và Top không đổi nhóm so sánh.</div>
      <div class="toolbar"><span id="data-count">0 Reels đã lưu</span><div><button id="csv-button" class="text-button" disabled>↓ CSV</button><button id="xlsx-button" class="text-button" disabled>↓ XLSX</button><button id="clear-button" class="text-button danger" disabled>Xóa dữ liệu</button></div></div>
      <div id="list" class="reel-list"></div>
    </section>
    <footer>FFB LENS <span>·</span> LOCAL FIRST <span>·</span> <a id="privacy-link" href="./privacy.html" target="_blank" rel="noopener noreferrer">QUYỀN RIÊNG TƯ</a></footer>
  </main>`;

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let language: Language = localStorage.getItem('ffb-lens-language') === 'en' ? 'en' : 'vi';
let numberFormat = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 });
let compactFormat = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const t = (vi: string, en: string): string => language === 'en' ? en : vi;
const staticText: Array<{ node: Text; vi: string }> = [];
const staticAttributes: Array<{ node: Element; name: string; vi: string }> = [];
const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const node = walker.currentNode as Text;
  const vi = node.nodeValue?.trim() || '';
  if (englishUi[vi]) staticText.push({ node, vi });
}
for (const node of Array.from(app.querySelectorAll('*'))) {
  for (const name of ['placeholder', 'title', 'aria-label']) {
    const vi = node.getAttribute(name);
    if (vi && englishUi[vi]) staticAttributes.push({ node, name, vi });
  }
}
let scanStatus = {
  vi: 'Chưa quét. Chrome sẽ hỏi quyền đọc tab Facebook khi bạn bấm Quét lần đầu; không cần mở DevTools.',
  en: 'No scan yet. Chrome will ask for Facebook access when you scan for the first time. DevTools is not needed.'
};
let lastNotice: { vi: string; en: string; error: boolean } | null = null;
function setScanStatus(vi: string, en: string) {
  scanStatus = { vi, en };
  el('scan-status').textContent = t(vi, en);
}
function applyLanguage(next: Language) {
  language = next;
  localStorage.setItem('ffb-lens-language', next);
  document.documentElement.lang = next;
  el<HTMLSelectElement>('language-select').value = next;
  for (const { node, vi } of staticText) {
    const current = node.nodeValue || '';
    node.nodeValue = current.replace(current.trim(), next === 'en' ? englishUi[vi] : vi);
  }
  for (const { node, name, vi } of staticAttributes) node.setAttribute(name, next === 'en' ? englishUi[vi] : vi);
  el<HTMLAnchorElement>('privacy-link').href = next === 'en' ? './privacy-en.html' : './privacy.html';
  numberFormat = new Intl.NumberFormat(next === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 });
  compactFormat = new Intl.NumberFormat(next === 'en' ? 'en-US' : 'vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
  refreshFilterOptions();
  render();
  updatePageContext();
  el('scan-status').textContent = t(scanStatus.vi, scanStatus.en);
  if (lastNotice) notice(lastNotice.vi, lastNotice.error, lastNotice.en);
}
let allReels: Reel[] = [];
let visibleReels: Reel[] = [];
let visibleScores: (number | null)[] = [];
let activeScan: { id: string; tabId: number; pageUrl: string; seen: Set<string>; lastUpdate: number; ingestError: string } | null = null;
let scanStarting = false;
let ingestQueue = Promise.resolve();

function notice(message: string, error = false, english = translateError(message, 'en')) {
  lastNotice = { vi: message, en: english, error };
  const box = el<HTMLDivElement>('notice');
  box.textContent = t(message, english);
  box.className = `notice ${error ? 'error' : 'success'}`;
}

function validPageContext(): string | null {
  const raw = el<HTMLInputElement>('page-url').value.trim();
  if (!raw) return '';
  return pageContextFromTab(raw);
}

function updatePageContext() {
  const pageUrl = validPageContext();
  const status = el('page-status');
  const link = el<HTMLAnchorElement>('open-page');
  if (pageUrl) {
    const context = facebookReelsContext(pageUrl)!;
    const label = allReels.find(reel => pageKey(reel) === `url:${pageUrl}` && isDisplayAccountName(reel.page_name, pageUrl))?.page_name || context.label;
    status.textContent = t(`Tài khoản: ${label}. Bấm Quét khi tab này đang mở mục Reels.`, `Account: ${label}. Click Scan when this tab shows Reels.`);
    link.href = context.reelsUrl;
    link.hidden = false;
  } else {
    status.textContent = pageUrl === null
      ? t('URL này không phải Page hoặc trang cá nhân Facebook hợp lệ.', 'This is not a valid Facebook Page or profile URL.')
      : el<HTMLSelectElement>('page-filter').value.startsWith('name:')
        ? t('Tài khoản đã chọn chưa có URL trong dữ liệu đã lưu.', 'The selected account has no URL in the saved data.')
        : t('Mở mục Reels của Page hoặc trang cá nhân rồi bấm biểu tượng FFB Lens.', 'Open a Page or profile Reels tab and click FFB Lens.');
    link.hidden = true;
  }
}

function updateUrlFromAccountFilter() {
  const selected = el<HTMLSelectElement>('page-filter').value;
  el<HTMLInputElement>('page-url').value = selected.startsWith('url:') ? selected.slice(4) : '';
  updatePageContext();
}

async function detectActivePage(silent = false) {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs) throw new Error('Chức năng này chỉ hoạt động trong Chrome Extension.');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = pageContextFromTab(tab?.url || '');
    if (!pageUrl) throw new Error('Hãy mở mục Reels của Page hoặc trang cá nhân rồi bấm lại biểu tượng addon.');
    el<HTMLInputElement>('page-url').value = pageUrl;
    updatePageContext();
    const option = Array.from(el<HTMLSelectElement>('page-filter').options).find(item => item.value === `url:${pageUrl}`);
    if (option) { el<HTMLSelectElement>('page-filter').value = option.value; render(); }
  } catch (error) { if (!silent) notice(error instanceof Error ? error.message : 'Không thể nhận diện Page.', true); }
}

async function detectActiveReel() {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs) throw new Error('Chức năng này chỉ hoạt động trong Chrome Extension.');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = normalizeUrl(tab?.url || '');
    if (!url || !isFacebookPageHost(new URL(url).hostname) ||
        !/^\/(?:reel|reels|videos)\/\d+\/?$/i.test(new URL(url).pathname)) {
      throw new Error('Tab đang mở chưa phải URL của một Reel Facebook.');
    }
    el<HTMLInputElement>('manual-url').value = url;
    notice('Đã lấy URL Reel. Hãy nhập số liệu bạn nhìn thấy rồi bấm Ghi Reel.', false, 'Reel URL loaded. Enter the metrics you can see, then save the Reel.');
  } catch (error) { notice(error instanceof Error ? error.message : 'Không thể nhận diện Reel.', true); }
}

function scanButtons(running: boolean) {
  el<HTMLButtonElement>('scan-start').disabled = running;
  el<HTMLButtonElement>('scan-stop').disabled = !running;
}

async function reloadAndWait(tabId: number): Promise<void> {
  if (!chrome?.tabs) throw new Error('Không truy cập được tab Facebook.');
  const tabs = chrome.tabs;
  let resolveReady!: () => void;
  let rejectReady!: (reason: Error) => void;
  const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const listener = (updatedId: number, change: { status?: string }) => {
    if (updatedId === tabId && change.status === 'complete') resolveReady();
  };
  tabs.onUpdated.addListener(listener);
  const timeout = setTimeout(() => rejectReady(new Error('Tab Facebook tải quá lâu. Hãy đợi trang hiện Reels rồi quét lại.')), 30_000);
  try {
    await tabs.reload(tabId);
    await ready;
  } finally {
    clearTimeout(timeout);
    tabs.onUpdated.removeListener(listener);
  }
}

async function startScan() {
  if (activeScan || scanStarting) return;
  scanStarting = true;
  scanButtons(true);
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting || !chrome.permissions) throw new Error('Quét Reels chỉ hoạt động trong Chrome Extension.');
    const granted = await chrome.permissions.request({ origins: ['https://*.facebook.com/*'] });
    if (!granted) throw new Error('Chrome chưa được cấp quyền đọc tab Facebook. Bấm Quét và cho phép để tiếp tục.');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || !isReelsTab(tab.url)) throw new Error('Hãy mở mục Reels của Page hoặc trang cá nhân rồi bấm biểu tượng addon trên chính tab đó.');
    const pageUrl = pageContextFromTab(tab.url);
    if (!pageUrl) throw new Error('Không nhận diện được tài khoản từ tab Reels.');
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids: ['ffb-facebook-observer'] });
    if (!registered.length) await chrome.scripting.registerContentScripts([{
      id: 'ffb-facebook-observer', js: ['facebook-observer.js'], matches: ['https://*.facebook.com/*'],
      runAt: 'document_start', world: 'MAIN', persistAcrossSessions: false
    }]);
    setScanStatus('Đang tải lại tab Reels để ghi nhận số tương tác và ngày đăng Facebook cung cấp…', 'Reloading the Reels tab to capture engagement and posted dates provided by Facebook…');
    await reloadAndWait(tab.id);
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    const scan = { id: crypto.randomUUID(), tabId: tab.id, pageUrl, seen: new Set<string>(), lastUpdate: Date.now(), ingestError: '' };
    activeScan = scan;
    scanStarting = false;
    el<HTMLInputElement>('page-url').value = pageUrl;
    updatePageContext();
    setScanStatus('Đang đọc Reel hiển thị và cuộn tab Facebook…', 'Reading visible Reels and scrolling the Facebook tab…');
    await chrome.tabs.sendMessage(tab.id, { type: 'FFB_START', scanId: scan.id, maxSteps: Number(el<HTMLSelectElement>('scan-steps').value) });
  } catch (error) {
    activeScan = null;
    scanStarting = false;
    scanButtons(false);
    const message = error instanceof Error ? error.message : 'Không thể bắt đầu quét.';
    setScanStatus(message, translateError(message, 'en'));
  }
}

async function stopScan() {
  const scan = activeScan;
  if (!scan || typeof chrome === 'undefined' || !chrome.tabs) return;
  setScanStatus('Đang dừng sau bước cuộn hiện tại…', 'Stopping after the current scroll step…');
  try { await chrome.tabs.sendMessage(scan.tabId, { type: 'FFB_STOP', scanId: scan.id }); }
  catch { activeScan = null; scanButtons(false); }
}

function handleScanUpdate(message: ScanUpdate, sender: { tab?: { id?: number } }) {
  const scan = activeScan;
  if (!scan || message?.type !== 'FFB_SCAN_UPDATE' || message.scanId !== scan.id || sender.tab?.id !== scan.tabId) return;
  scan.lastUpdate = Date.now();
  if ((message.phase === 'progress' || message.phase === 'done') && Array.isArray(message.reels) && message.reels.length) {
    for (const reel of message.reels) scan.seen.add(reel.reel_id);
    ingestQueue = ingestQueue.then(async () => {
      const batch = browserVisibleBatch(scan.pageUrl, message.reels);
      const result = await ingestSourceBatch(allReels, batch);
      allReels = result.reels;
      refreshFilterOptions();
      el<HTMLSelectElement>('page-filter').value = `url:${scan.pageUrl}`;
      render();
      updatePageContext();
    }).catch(error => {
      scan.ingestError = error instanceof Error ? error.message : 'Không lưu được kết quả quét.';
      setScanStatus(scan.ingestError, translateError(scan.ingestError, 'en'));
    });
  }
  if (message.phase === 'progress' || message.phase === 'heartbeat') {
    const d = message.diagnostics;
    const detailVi = d ? ` · ${d.fromBrowser} từ Facebook · views ${d.withViews}, likes ${d.withLikes}, comments ${d.withComments}, ngày ${d.withDates}` : '';
    const detailEn = d ? ` · ${d.fromBrowser} from Facebook · views ${d.withViews}, likes ${d.withLikes}, comments ${d.withComments}, dates ${d.withDates}` : '';
    setScanStatus(`Đang quét: ${scan.seen.size} Reel nhận diện · ${message.step} lần cuộn${detailVi}.`, `Scanning: ${scan.seen.size} Reels found · ${message.step} scrolls${detailEn}.`);
  } else if (message.phase === 'done' || message.phase === 'error') {
    activeScan = null;
    scanButtons(false);
    void ingestQueue.then(() => {
      const d = message.diagnostics;
      const detailVi = d ? ` Bước cuối: ${d.links} liên kết ứng viên, ${d.fromBrowser} Reel từ Facebook; views ${d.withViews}, likes ${d.withLikes}, comments ${d.withComments}, ngày ${d.withDates}.` : '';
      const detailEn = d ? ` Final step: ${d.links} candidate links, ${d.fromBrowser} Reels from Facebook; views ${d.withViews}, likes ${d.withLikes}, comments ${d.withComments}, dates ${d.withDates}.` : '';
      if (scan.ingestError) setScanStatus(scan.ingestError, translateError(scan.ingestError, 'en'));
      else setScanStatus(`${message.phase === 'error' ? 'Quét lỗi' : 'Đã quét'}: ${scan.seen.size} Reel nhận diện.${detailVi} ${message.reason} Kết quả chỉ phản ánh phần tab đã tải.`, `${message.phase === 'error' ? 'Scan failed' : 'Scan complete'}: ${scan.seen.size} Reels found.${detailEn} ${translateError(message.reason, 'en')} Results cover only content loaded in the tab.`);
    });
  }
}

function currentFilters(): Filters {
  const rawMinViews = el<HTMLInputElement>('min-views').value;
  const parsedMinViews = rawMinViews === '' ? null : Number(rawMinViews);
  return {
    query: el<HTMLInputElement>('query').value,
    pageKey: el<HTMLSelectElement>('page-filter').value,
    source: el<HTMLSelectElement>('source-filter').value,
    minViews: parsedMinViews !== null && Number.isFinite(parsedMinViews) ? Math.max(0, Math.floor(parsedMinViews)) : null,
    sort: el<HTMLSelectElement>('sort').value as SortKey,
    range: el<HTMLSelectElement>('range').value as DateRange,
    from: el<HTMLInputElement>('from').value,
    to: el<HTMLInputElement>('to').value,
    top: Number(el<HTMLSelectElement>('top').value)
  };
}

function populateFilter(id: string, options: [string, string][], allLabel: string) {
  const select = el<HTMLSelectElement>(id);
  const selected = select.value;
  select.replaceChildren(new Option(allLabel, ''));
  options.forEach(([key, label]) => select.add(new Option(label, key)));
  select.value = options.some(([key]) => key === selected) ? selected : '';
}

function sourceLabel(source: string): string {
  if (source === 'Facebook · tab Reels') return t(source, 'Facebook · Reels tab');
  if (source === 'Nhập khi xem Page') return t(source, 'Added from account');
  if (source === 'Nhập từ Facebook') return t(source, 'Added from Facebook');
  return source;
}

function refreshFilterOptions() {
  const pages = new Map<string, string>();
  const sources = new Set<string>();
  allReels.forEach(reel => {
    const key = pageKey(reel);
    if (key && (!pages.has(key) || (key.startsWith('url:') && isDisplayAccountName(reel.page_name, reel.page_url) && !isDisplayAccountName(pages.get(key)!, reel.page_url)))) {
      pages.set(key, reel.page_name || reel.page_url);
    }
    if (reel.source) sources.add(reel.source);
  });
  populateFilter('page-filter', [...pages].sort((a, b) => a[1].localeCompare(b[1], language)), t('Tất cả tài khoản', 'All accounts'));
  populateFilter('source-filter', [...sources].sort((a, b) => a.localeCompare(b, language)).map(source => [source, sourceLabel(source)]), t('Tất cả nguồn', 'All sources'));
}

function addText(parent: HTMLElement, tag: string, className: string, value: string): HTMLElement {
  const child = document.createElement(tag);
  child.className = className;
  child.textContent = value;
  parent.append(child);
  return child;
}

function render() {
  const filters = currentFilters();
  visibleReels = filterAndRank(allReels, filters);
  const allFiltered = filterReels(allReels, filters);
  const baselines = outlierBaselines(allReels, filters);
  visibleScores = visibleReels.map(reel => reelOutlierScore(reel, baselines));
  const stats = summarize(allFiltered);
  el('stat-count').textContent = numberFormat.format(stats.total);
  el('stat-views').textContent = compactFormat.format(stats.totalViews);
  el('stat-median').textContent = stats.median === null ? '—' : compactFormat.format(stats.median);
  el('stat-coverage').textContent = t(`${stats.withViews}/${stats.total} có views`, `${stats.withViews}/${stats.total} with views`);
  el('stat-mean').textContent = stats.mean === null ? '—' : compactFormat.format(stats.mean);
  el('stat-max').textContent = stats.max === null ? '—' : compactFormat.format(stats.max);
  const dated = allFiltered.filter(reel => reel.published_at !== null).length;
  el('stat-dates').textContent = numberFormat.format(dated);
  el('stat-date-coverage').textContent = `${dated}/${stats.total} Reels`;
  const maxReel = stats.max === null ? null : allFiltered.find(reel => reel.views === stats.max);
  el('highlight').hidden = !maxReel;
  if (maxReel) {
    el('highlight-title').textContent = maxReel.caption || maxReel.reel_url;
    el<HTMLAnchorElement>('highlight-link').href = maxReel.reel_url;
  }
  el('result-count').textContent = t(`${visibleReels.length}/${allFiltered.length} kết quả`, `${visibleReels.length}/${allFiltered.length} results`);
  el('scope-detail').textContent = t(
    `Phạm vi thống kê: ${numberFormat.format(allFiltered.length)} Reel sau bộ lọc trên ${numberFormat.format(allReels.length)} Reel đã lưu. Bảng và tệp xuất giới hạn Top ${filters.top}.${filters.range !== 'all' ? ' Reel thiếu ngày đăng không xuất hiện khi lọc thời gian.' : ''}`,
    `Scope: ${numberFormat.format(allFiltered.length)} Reels after filters out of ${numberFormat.format(allReels.length)} saved. The list and exports show Top ${filters.top}.${filters.range !== 'all' ? ' Reels without a posted date are excluded by time filters.' : ''}`
  );
  el('data-count').textContent = t(`${numberFormat.format(allReels.length)} Reels đã lưu`, `${numberFormat.format(allReels.length)} Reels saved`);
  el<HTMLButtonElement>('csv-button').disabled = !visibleReels.length;
  el<HTMLButtonElement>('xlsx-button').disabled = !visibleReels.length;
  el<HTMLButtonElement>('clear-button').disabled = !allReels.length;
  const list = el<HTMLDivElement>('list');
  list.replaceChildren();
  if (!visibleReels.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    addText(empty, 'div', 'empty-icon', '◌');
    addText(empty, 'strong', '', allReels.length ? t('Không có Reel phù hợp', 'No matching Reels') : t('Chưa có dữ liệu Reels', 'No Reel data yet'));
    addText(empty, 'p', '', allReels.length ? t('Thử đổi từ khóa hoặc bộ lọc thời gian.', 'Try another search or time filter.') : t('Mở mục Reels của Page hoặc trang cá nhân và bấm Quét để bắt đầu.', 'Open a Page or profile Reels tab and click Scan to start.'));
    list.append(empty);
    return;
  }
  visibleReels.forEach((reel, i) => {
    const row = document.createElement('article');
    row.className = 'reel-card';
    const top = document.createElement('div'); top.className = 'reel-top';
    addText(top, 'span', 'rank', String(i + 1).padStart(2, '0'));
    const identity = document.createElement('div'); identity.className = 'reel-identity';
    addText(identity, 'strong', '', reel.caption || t('Reel không có caption', 'Reel without a caption'));
    addText(identity, 'span', '', `${reel.page_name || t('Chưa rõ Page', 'Unknown Page')} · ${reel.published_at ? new Date(reel.published_at).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN') : t('Chưa có ngày đăng', 'No posted date')}`);
    top.append(identity);
    const link = document.createElement('a'); link.className = 'open-link'; link.href = reel.reel_url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '↗'; link.title = t('Mở Reel gốc', 'Open original Reel');
    top.append(link); row.append(top);
    const metrics = document.createElement('div'); metrics.className = 'metrics';
    const entries: [string, number | null][] = [['VIEWS', reel.views], ['LIKES', reel.likes], ['COMMENTS', reel.comments], ['SHARES', reel.shares]];
    entries.forEach(([label, value]) => { const metric = document.createElement('div'); addText(metric, 'span', '', label); addText(metric, 'strong', '', value === null ? '—' : compactFormat.format(value)); metrics.append(metric); });
    row.append(metrics);
    const foot = document.createElement('div'); foot.className = 'reel-foot';
    const score = visibleScores[i];
    addText(foot, 'span', 'score', score === null ? 'Outlier —' : `Outlier ${numberFormat.format(score)}×`);
    addText(foot, 'span', 'source', `${sourceLabel(reel.source)} · ${new Date(reel.collected_at).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')}`);
    row.append(foot);
    list.append(row);
  });
}

async function handleFile(file: File) {
  if (file.size > 20 * 1024 * 1024) { notice('CSV vượt giới hạn 20 MB.', true); return; }
  const context = validPageContext();
  if (context === null) { notice('URL Page phải thuộc facebook.com và dùng http/https.', true); return; }
  try {
    const batch = await csvFileSource.load({ file, fallbackPageUrl: context });
    const result = await ingestSourceBatch(allReels, batch);
    allReels = result.reels;
    refreshFilterOptions();
    render();
    notice(
      `Đã đọc ${batch.total} dòng · lưu ${result.newCount} Reel mới · bỏ qua ${batch.skipped} URL lỗi · gộp ${result.duplicateCount} trùng${batch.invalidMetrics ? ` · ${batch.invalidMetrics} chỉ số lỗi để trống` : ''}. Phạm vi CSV chưa được xác minh.`,
      false,
      `Read ${batch.total} rows · saved ${result.newCount} new Reels · skipped ${batch.skipped} invalid URLs · merged ${result.duplicateCount} duplicates${batch.invalidMetrics ? ` · left ${batch.invalidMetrics} invalid metrics blank` : ''}. CSV coverage is unverified.`
    );
  } catch (error) { notice(error instanceof Error ? error.message : 'Không thể nhập CSV.', true); }
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

el<HTMLButtonElement>('import-button').addEventListener('click', () => el<HTMLInputElement>('file-input').click());
el<HTMLSelectElement>('language-select').addEventListener('change', event => applyLanguage((event.currentTarget as HTMLSelectElement).value === 'en' ? 'en' : 'vi'));
el<HTMLInputElement>('page-url').addEventListener('input', updatePageContext);
el<HTMLSelectElement>('page-filter').addEventListener('change', updateUrlFromAccountFilter);
el<HTMLButtonElement>('detect-page').addEventListener('click', () => void detectActivePage());
el<HTMLButtonElement>('detect-reel').addEventListener('click', () => void detectActiveReel());
el<HTMLButtonElement>('scan-start').addEventListener('click', () => void startScan());
el<HTMLButtonElement>('scan-stop').addEventListener('click', () => void stopScan());
el<HTMLFormElement>('manual-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const batch = manualPageBatch({
      pageUrl: el<HTMLInputElement>('page-url').value,
      reelUrl: el<HTMLInputElement>('manual-url').value,
      caption: el<HTMLTextAreaElement>('manual-caption').value,
      views: el<HTMLInputElement>('manual-views').value,
      likes: el<HTMLInputElement>('manual-likes').value,
      comments: el<HTMLInputElement>('manual-comments').value,
      shares: el<HTMLInputElement>('manual-shares').value,
      publishedAt: el<HTMLInputElement>('manual-date').value
    });
    const result = await ingestSourceBatch(allReels, batch);
    allReels = result.reels;
    refreshFilterOptions();
    el<HTMLSelectElement>('page-filter').value = pageKey(batch.reels[0]) || '';
    render();
    el<HTMLFormElement>('manual-form').reset();
    el<HTMLInputElement>('manual-url').focus();
    notice(
      result.newCount ? 'Đã ghi Reel. Bảng xếp hạng của tài khoản đã cập nhật.' : 'Reel này đã có; dữ liệu được cập nhật nếu bản mới đầy đủ hơn.',
      false,
      result.newCount ? 'Reel saved. The account rankings have been updated.' : 'This Reel already exists; its data was updated if the new record was more complete.'
    );
  } catch (error) { notice(error instanceof Error ? error.message : 'Không thể ghi Reel.', true); }
});
el<HTMLInputElement>('file-input').addEventListener('change', event => {
  const input = event.currentTarget as HTMLInputElement;
  if (input.files?.[0]) void handleFile(input.files[0]);
  input.value = '';
});
el<HTMLButtonElement>('sample-button').addEventListener('click', async () => {
  try { const response = await fetch('./sample-reels.csv'); await handleFile(new File([await response.text()], 'sample-reels.csv', { type: 'text/csv' })); }
  catch { notice('Không thể tải dữ liệu mẫu.', true); }
});
['query', 'sort', 'range', 'top', 'from', 'to', 'page-filter', 'source-filter', 'min-views'].forEach(id => {
  el(id).addEventListener(['query', 'min-views'].includes(id) ? 'input' : 'change', () => {
    el('date-controls').hidden = el<HTMLSelectElement>('range').value !== 'custom';
    render();
  });
});
el<HTMLButtonElement>('csv-button').addEventListener('click', () => download('ffb-lens-reels.csv', new Blob([toCsv(visibleReels, visibleScores)], { type: 'text/csv;charset=utf-8' })));
el<HTMLButtonElement>('xlsx-button').addEventListener('click', () => download('ffb-lens-reels.xlsx', new Blob([toXlsx(visibleReels, visibleScores) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })));
el<HTMLButtonElement>('clear-button').addEventListener('click', async () => {
  if (!window.confirm(t('Xóa toàn bộ dữ liệu Reels đã lưu trên thiết bị này?', 'Delete all saved Reel data on this device?'))) return;
  try {
    await writeReels([]);
    allReels = [];
    refreshFilterOptions();
    render();
    notice('Đã xóa toàn bộ dữ liệu Reels đã lưu.', false, 'All saved Reel data has been deleted.');
  } catch { notice('Không thể xóa dữ liệu cục bộ.', true); }
});

if (typeof chrome !== 'undefined' && chrome.runtime) chrome.runtime.onMessage.addListener(handleScanUpdate);
setInterval(() => {
  if (activeScan && Date.now() - activeScan.lastUpdate > 12_000) {
    activeScan = null;
    scanButtons(false);
    setScanStatus('Mất kết nối với tab Reels. Có thể tab đã tải lại hoặc chuyển trang; các Reel đã đọc vẫn được lưu.', 'Lost connection to the Reels tab. The tab may have reloaded or navigated away; Reels already read are still saved.');
  }
}, 5_000);

try { allReels = dedupe(await readReels()); applyLanguage(language); void detectActivePage(true); }
catch { applyLanguage(language); notice('Không thể mở lưu trữ cục bộ. Hãy kiểm tra quyền lưu dữ liệu của Chrome.', true); }
