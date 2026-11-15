export type ActiveTab = { id?: number; url?: string };

export interface BrowserTabs {
  query(queryInfo: { active: boolean; currentWindow?: boolean; lastFocusedWindow?: boolean }): Promise<ActiveTab[]>;
}

export interface BrowserPermissions {
  request(options: { origins: string[] }): Promise<boolean>;
}

export async function activeBrowserTab(tabs: BrowserTabs): Promise<ActiveTab | undefined> {
  const [focused] = await tabs.query({ active: true, lastFocusedWindow: true });
  if (focused?.url) return focused;
  const [current] = await tabs.query({ active: true, currentWindow: true });
  return current?.url ? current : focused || current;
}

export async function readableActiveTab(tabs: BrowserTabs, permissions?: BrowserPermissions): Promise<{ tab: ActiveTab; grantedAll: boolean }> {
  const tab = await activeBrowserTab(tabs);
  if (tab?.url) return { tab, grantedAll: false };
  if (!tab?.id || !permissions) throw new Error('Không tìm thấy tab đang hoạt động. Hãy chọn tab Facebook hoặc TikTok rồi thử lại.');
  const granted = await permissions.request({ origins: ['https://*.facebook.com/*', 'https://*.tiktok.com/*'] });
  if (!granted) throw new Error('Chrome chưa được cấp quyền đọc URL tab. Hãy cho phép truy cập Facebook/TikTok rồi thử lại.');
  const readable = await activeBrowserTab(tabs);
  if (!readable?.id || !readable.url) throw new Error('Chrome vẫn chưa cung cấp URL tab. Hãy chọn lại tab Facebook hoặc TikTok rồi thử lại.');
  return { tab: readable, grantedAll: true };
}
