import type { Reel } from '../types';

const multipliers: Record<string, number> = {
  k: 1_000, nghìn: 1_000, ngan: 1_000, ngàn: 1_000,
  m: 1_000_000, triệu: 1_000_000, trieu: 1_000_000,
  b: 1_000_000_000, tỷ: 1_000_000_000, tỉ: 1_000_000_000, ty: 1_000_000_000
};

export function parseCount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  const input = value.trim().toLowerCase().replace(/\u00a0/g, ' ');
  const match = input.match(/^([\d.,\s]+)\s*([a-zà-ỹ]+)?$/u);
  if (!match) return null;
  const suffix = match[2] || '';
  const multiplier = suffix ? multipliers[suffix] : 1;
  if (!multiplier) return null;
  let digits = match[1].replace(/\s/g, '');
  if (multiplier > 1) {
    const lastComma = digits.lastIndexOf(',');
    const lastDot = digits.lastIndexOf('.');
    const decimalAt = Math.max(lastComma, lastDot);
    if (decimalAt >= 0) {
      const whole = digits.slice(0, decimalAt).replace(/[.,]/g, '');
      const fraction = digits.slice(decimalAt + 1);
      digits = `${whole}.${fraction}`;
    }
    if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  } else {
    if (!/^\d{1,3}([.,]\d{3})+$|^\d+$/.test(digits)) return null;
    digits = digits.replace(/[.,]/g, '');
  }
  const result = Math.round(Number(digits) * multiplier);
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
}

export function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.protocol = 'https:';
    url.hostname = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch { return null; }
}

export function normalizePageUrl(value: string): string | null {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  if (url.hostname === 'facebook.com') url.pathname = url.pathname.replace(/\/reels?$/, '') || '/';
  return url.toString();
}

export function reelIdentity(reel: Pick<Reel, 'reel_id' | 'reel_url'>): string {
  const id = reel.reel_id.trim();
  if (id) return `id:${id}`;
  const url = normalizeUrl(reel.reel_url) || reel.reel_url.trim();
  const match = url.match(/facebook\.com\/(?:reel|reels)\/([^/?#]+)/i);
  return match ? `id:${match[1]}` : `url:${url}`;
}

export function normalizeDate(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const local = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (local) {
    const [, day, month, year] = local;
    const date = new Date(Date.UTC(+year, +month - 1, +day));
    return date.getUTCDate() === +day && date.getUTCMonth() === +month - 1 ? date.toISOString().slice(0, 10) : null;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (iso) {
    const [, year, month, day] = iso;
    const date = new Date(Date.UTC(+year, +month - 1, +day));
    if (date.getUTCFullYear() !== +year || date.getUTCMonth() !== +month - 1 || date.getUTCDate() !== +day) return null;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
