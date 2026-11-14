export interface ReelsContext {
  contextUrl: string;
  reelsUrl: string;
  label: string;
  isReelsTab: boolean;
}

const hosts = new Set(['facebook.com', 'www.facebook.com', 'web.facebook.com', 'm.facebook.com']);
const reserved = new Set(['reel', 'reels', 'watch', 'groups', 'marketplace', 'events', 'gaming', 'videos', 'photo', 'photos', 'stories', 'profile.php']);

export function isFacebookHost(host: string): boolean { return hosts.has(host); }

export function facebookReelsContext(raw: string): ReelsContext | null {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || !isFacebookHost(url.hostname)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const section = url.searchParams.get('sk')?.toLowerCase();
  const hasReelsSection = section === 'reels' || section === 'reels_tab';
  const isReelsSection = (value: string | undefined) => value === 'reels' || value === 'reels_tab';

  if (parts[0]?.toLowerCase() === 'profile.php') {
    if (parts.length !== 1) return null;
    const id = url.searchParams.get('id');
    if (!id || !/^\d+$/.test(id) || (section && !hasReelsSection)) return null;
    return {
      contextUrl: `https://facebook.com/profile.php?id=${id}`,
      reelsUrl: `https://www.facebook.com/profile.php?id=${id}&sk=reels_tab`,
      label: `Profile ${id}`,
      isReelsTab: section === 'reels_tab'
    };
  }

  if (parts[0]?.toLowerCase() === 'people') {
    if (parts.length < 3 || parts.length > 4 || !/^\d+$/.test(parts[2]) ||
        (parts[3] && !isReelsSection(parts[3].toLowerCase())) || (section && !hasReelsSection)) return null;
    const id = parts[2];
    return {
      contextUrl: `https://facebook.com/profile.php?id=${id}`,
      reelsUrl: `https://www.facebook.com/profile.php?id=${id}&sk=reels_tab`,
      label: parts[1] || `Profile ${id}`,
      isReelsTab: isReelsSection(parts[3]?.toLowerCase()) || section === 'reels_tab'
    };
  }

  if (!parts.length || parts.length > 2 || reserved.has(parts[0].toLowerCase()) ||
      (parts[1] && !isReelsSection(parts[1].toLowerCase())) || (section && !hasReelsSection)) return null;
  const name = parts[0];
  return {
    contextUrl: `https://facebook.com/${encodeURIComponent(name)}`,
    reelsUrl: `https://www.facebook.com/${encodeURIComponent(name)}/reels/`,
    label: name,
    isReelsTab: isReelsSection(parts[1]?.toLowerCase()) || hasReelsSection
  };
}
