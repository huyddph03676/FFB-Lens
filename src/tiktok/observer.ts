import type { VisibleReel } from '../facebook/extract';
import { isTikTokVideoResponseUrl, tiktokProfileContext } from './context';
import { parseTikTokItems } from './parse';

type ObserverWindow = Window & { __ffbLensTikTokObserver?: boolean };
const page = window as ObserverWindow;

if (!page.__ffbLensTikTokObserver) {
  page.__ffbLensTikTokObserver = true;
  const stored = new Map<string, VisibleReel>();
  const xhrUrls = new WeakMap<XMLHttpRequest, string>();
  let currentProfile = tiktokProfileContext(location.href)?.contextUrl || '';

  function deliver(reels: VisibleReel[]) {
    if (reels.length) window.postMessage({ source: 'FFB_LENS_TIKTOK_OBSERVER', type: 'VIDEOS', reels }, location.origin);
  }

  function observe(body: string) {
    const context = tiktokProfileContext(location.href);
    if (!context || body.length > 12_000_000) return;
    if (currentProfile !== context.contextUrl) { stored.clear(); currentProfile = context.contextUrl; }
    const changed: VisibleReel[] = [];
    for (const reel of parseTikTokItems(body, context.username)) {
      const old = stored.get(reel.reel_id);
      const merged = old ? {
        ...old,
        account_name: reel.account_name || old.account_name,
        caption: reel.caption || old.caption,
        views: reel.views ?? old.views,
        likes: reel.likes ?? old.likes,
        comments: reel.comments ?? old.comments,
        shares: reel.shares ?? old.shares,
        published_at: reel.published_at || old.published_at
      } : reel;
      if (!old || JSON.stringify(old) !== JSON.stringify(merged)) {
        stored.set(reel.reel_id, merged);
        changed.push(merged);
      }
      if (stored.size > 2000) stored.delete(stored.keys().next().value!);
    }
    deliver(changed);
  }

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin ||
      event.data?.source !== 'FFB_LENS_TIKTOK_CONTENT' || event.data.type !== 'SNAPSHOT_REQUEST') return;
    const context = tiktokProfileContext(location.href);
    if (!context || context.contextUrl !== currentProfile) { stored.clear(); currentProfile = context?.contextUrl || ''; }
    deliver([...stored.values()]);
  });

  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = Reflect.apply(originalFetch, this, [input, init]) as Promise<Response>;
    const url = input instanceof Request ? input.url : String(input);
    if (isTikTokVideoResponseUrl(url)) void response.then(result => result.clone().text()).then(observe).catch(() => {});
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  Object.defineProperty(XMLHttpRequest.prototype, 'open', { configurable: true, writable: true, value: function(this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    xhrUrls.set(this, String(url));
    return Reflect.apply(originalOpen, this, [method, url, ...rest]);
  } });
  Object.defineProperty(XMLHttpRequest.prototype, 'send', { configurable: true, writable: true, value: function(this: XMLHttpRequest, ...args: unknown[]) {
    if (isTikTokVideoResponseUrl(xhrUrls.get(this) || '')) {
      this.addEventListener('loadend', () => {
        try { if (this.responseType === '' || this.responseType === 'text') observe(this.responseText); } catch { /* ignore non-text responses */ }
      }, { once: true });
    }
    return Reflect.apply(originalSend, this, args);
  } });
}
