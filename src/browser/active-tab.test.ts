import { describe, expect, it, vi } from 'vitest';
import { readableActiveTab, type BrowserTabs } from './active-tab';

describe('active tab URL access', () => {
  it('requests supported site access and reads the TikTok URL again when Chrome initially hides it', async () => {
    let allowed = false;
    const tabs: BrowserTabs = { query: vi.fn(async () => [{ id: 17, ...(allowed ? { url: 'https://www.tiktok.com/@minhtrong230901' } : {}) }]) };
    const request = vi.fn(async () => { allowed = true; return true; });
    await expect(readableActiveTab(tabs, { request })).resolves.toEqual({
      tab: { id: 17, url: 'https://www.tiktok.com/@minhtrong230901' }, grantedAll: true
    });
    expect(request).toHaveBeenCalledWith({ origins: ['https://*.facebook.com/*', 'https://*.tiktok.com/*'] });
  });

  it('uses an already readable tab without requesting another permission', async () => {
    const tabs: BrowserTabs = { query: vi.fn(async () => [{ id: 17, url: 'https://www.tiktok.com/@minhtrong230901' }]) };
    const request = vi.fn(async () => true);
    expect(await readableActiveTab(tabs, { request })).toMatchObject({ grantedAll: false });
    expect(request).not.toHaveBeenCalled();
  });

  it('reports denied access instead of claiming the profile URL is invalid', async () => {
    const tabs: BrowserTabs = { query: vi.fn(async () => [{ id: 17 }]) };
    await expect(readableActiveTab(tabs, { request: async () => false })).rejects.toThrow('chưa được cấp quyền đọc URL tab');
  });
});
