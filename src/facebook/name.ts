import { facebookReelsContext } from './context';
import { tiktokProfileContext } from '../tiktok/context';

const genericHeadings = /^(?:facebook|reels|watch reels|videos?|posts|profile|menu|thước phim|bài viết)$/iu;

export function cleanAccountName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const name = value.replace(/\s+/gu, ' ').trim()
    .replace(/\s*[|·]\s*Facebook\s*$/iu, '')
    .replace(/^(?:Reels|Videos?)\s*[|·-]\s*/iu, '')
    .replace(/(?:'s|’s)\s+reels\s*$/iu, '')
    .trim();
  return !name || name.length > 120 || genericHeadings.test(name) ? '' : name;
}

export function mostCommonAccountName(names: Iterable<unknown>): string {
  const counts = new Map<string, { name: string; count: number }>();
  for (const raw of names) {
    const name = cleanAccountName(raw);
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    const entry = counts.get(key) || { name, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.name || '';
}

export function isDisplayAccountName(name: string, accountUrl: string): boolean {
  const cleaned = cleanAccountName(name);
  const fallback = facebookReelsContext(accountUrl)?.label || tiktokProfileContext(accountUrl)?.label || '';
  return !!cleaned && cleaned.toLocaleLowerCase() !== fallback.toLocaleLowerCase();
}

export function accountNameFromDocument(doc: Document): string {
  const title = cleanAccountName(doc.querySelector('meta[property="og:title"]')?.getAttribute('content'));
  if (title) return title;
  for (const heading of Array.from(doc.querySelectorAll('h1'))) {
    if (heading.getClientRects().length === 0) continue;
    const name = cleanAccountName(heading.textContent);
    if (name) return name;
  }
  return cleanAccountName(doc.title);
}
