import { isReelsTab, type VisibleReel } from './extract';
import { parsePageReelsResponse } from './graph';

type ObserverWindow = Window & { __ffbLensObserverInstalled?: boolean };
const page = window as ObserverWindow;

if (!page.__ffbLensObserverInstalled) {
  page.__ffbLensObserverInstalled = true;
  const stored = new Map<string, VisibleReel>();
  let currentPagePath = location.pathname;
  const xhrUrls = new WeakMap<XMLHttpRequest, string>();
  const graphUrl = (url: string) => url.includes('/api/graphql/');

  function deliver(reels: VisibleReel[]) {
    if (!reels.length) return;
    window.postMessage({ source: 'FFB_LENS_OBSERVER', type: 'REELS', reels }, location.origin);
  }

  function observe(body: string) {
    if (!isReelsTab(location.href) || body.length > 8_000_000 || !body.includes('aggregated_fb_shorts')) return;
    if (currentPagePath !== location.pathname) { stored.clear(); currentPagePath = location.pathname; }
    const changed: VisibleReel[] = [];
    for (const reel of parsePageReelsResponse(body)) {
      const old = stored.get(reel.reel_id);
      const combined = old ? {
        ...old,
        caption: reel.caption || old.caption,
        views: reel.views ?? old.views,
        likes: reel.likes ?? old.likes,
        comments: reel.comments ?? old.comments,
        shares: reel.shares ?? old.shares,
        published_at: reel.published_at || old.published_at
      } : reel;
      if (!old || JSON.stringify(old) !== JSON.stringify(combined)) {
        stored.set(reel.reel_id, combined);
        changed.push(combined);
      }
      if (stored.size > 2000) stored.delete(stored.keys().next().value!);
    }
    deliver(changed);
  }

  window.addEventListener('message', event => {
    if (event.source === window && event.origin === location.origin &&
      event.data?.source === 'FFB_LENS_CONTENT' && event.data.type === 'SNAPSHOT_REQUEST') {
      if (currentPagePath !== location.pathname) { stored.clear(); currentPagePath = location.pathname; }
      deliver([...stored.values()]);
    }
  });

  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = Reflect.apply(originalFetch, this, [input, init]) as Promise<Response>;
    const url = input instanceof Request ? input.url : String(input);
    if (graphUrl(url)) {
      void response.then(result => result.clone().text()).then(observe).catch(() => {});
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  Object.defineProperty(XMLHttpRequest.prototype, 'open', { configurable: true, writable: true, value: function(this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    xhrUrls.set(this, String(url));
    return Reflect.apply(originalOpen, this, [method, url, ...rest]);
  } });
  Object.defineProperty(XMLHttpRequest.prototype, 'send', { configurable: true, writable: true, value: function(this: XMLHttpRequest, ...args: unknown[]) {
    if (graphUrl(xhrUrls.get(this) || '')) {
      this.addEventListener('loadend', () => {
        try { if (this.responseType === '' || this.responseType === 'text') observe(this.responseText); } catch { /* ignore non-text responses */ }
      }, { once: true });
    }
    return Reflect.apply(originalSend, this, args);
  } });
}
