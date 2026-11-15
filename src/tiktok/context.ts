export interface TikTokContext {
  contextUrl: string;
  videosUrl: string;
  username: string;
  label: string;
}

const hosts = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']);

export function tiktokProfileContext(raw: string): TikTokContext | null {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || !hosts.has(url.hostname)) return null;
  const match = url.pathname.match(/^\/@([\w.]{1,24})\/?$/u);
  if (!match || match[1].endsWith('.')) return null;
  const username = match[1].toLowerCase();
  return {
    contextUrl: `https://tiktok.com/@${username}`,
    videosUrl: `https://www.tiktok.com/@${username}`,
    username,
    label: `@${match[1]}`
  };
}

export function tiktokVideoFromUrl(raw: string): { username: string; id: string; url: string } | null {
  let parsed: URL;
  try { parsed = new URL(raw.trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(parsed.protocol) || !hosts.has(parsed.hostname)) return null;
  const match = parsed.pathname.match(/^\/@([\w.]{1,24})\/video\/(\d+)\/?$/u);
  if (!match) return null;
  return { username: match[1].toLowerCase(), id: match[2], url: `https://tiktok.com/@${match[1].toLowerCase()}/video/${match[2]}` };
}

export function isTikTokVideoResponseUrl(raw: string): boolean {
  let url: URL;
  try { url = new URL(raw, 'https://www.tiktok.com'); } catch { return false; }
  return hosts.has(url.hostname) && /^\/api\/(?:post\/item_list|item\/detail)\/?$/u.test(url.pathname);
}
