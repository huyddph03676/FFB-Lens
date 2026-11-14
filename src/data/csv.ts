import { normalizeDate, normalizePageUrl, normalizeUrl, parseCount } from './normalize';
import type { Reel } from '../types';

export const columns: (keyof Reel)[] = [
  'page_name', 'page_url', 'reel_id', 'reel_url', 'caption', 'views', 'likes',
  'comments', 'shares', 'published_at', 'collected_at', 'source'
];

const aliases: Record<string, keyof Reel> = {
  page: 'page_name', page_name: 'page_name', page_url: 'page_url',
  reel_id: 'reel_id', video_id: 'reel_id', reel_url: 'reel_url', video_url: 'reel_url', url: 'reel_url', link: 'reel_url',
  caption: 'caption', description: 'caption', noi_dung: 'caption',
  views: 'views', view: 'views', luot_xem: 'views',
  likes: 'likes', like: 'likes', luot_thich: 'likes',
  comments: 'comments', comment: 'comments', binh_luan: 'comments',
  shares: 'shares', share: 'shares', chia_se: 'shares',
  published_at: 'published_at', date: 'published_at', ngay_dang: 'published_at',
  collected_at: 'collected_at', source: 'source', nguon: 'source'
};

function keyOf(value: string): keyof Reel | undefined {
  const key = value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[\s-]+/g, '_');
  return aliases[key];
}

export function parseCsv(text: string): string[][] {
  const firstLine = text.replace(/^\ufeff/, '').split(/\r?\n/, 1)[0] || '';
  const delimiter = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const input = text.replace(/^\ufeff/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); if (row.some(x => x.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('CSV có ô chưa đóng dấu ngoặc kép.');
  row.push(cell); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}

export interface ImportResult { reels: Reel[]; skipped: number; invalidMetrics: number; total: number }

export function importCsv(text: string, fallbackPageUrl = '', collectedAt = new Date().toISOString()): ImportResult {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('Tệp CSV trống.');
  const headers = rows[0].map(keyOf);
  if (!headers.includes('reel_url')) throw new Error('CSV cần cột reel_url (hoặc url/link).');
  const reels: Reel[] = [];
  let skipped = 0, invalidMetrics = 0;
  for (const row of rows.slice(1)) {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => { if (header) record[header] = row[i]?.trim() || ''; });
    const reelUrl = normalizeUrl(record.reel_url || '');
    if (!reelUrl) { skipped++; continue; }
    const metric = (key: 'views' | 'likes' | 'comments' | 'shares') => {
      const raw = record[key]; const result = parseCount(raw);
      if (raw && result === null) invalidMetrics++;
      return result;
    };
    reels.push({
      page_name: record.page_name || '',
      page_url: normalizePageUrl(record.page_url || fallbackPageUrl) || '',
      reel_id: record.reel_id || '', reel_url: reelUrl,
      caption: record.caption || '', views: metric('views'), likes: metric('likes'),
      comments: metric('comments'), shares: metric('shares'),
      published_at: normalizeDate(record.published_at),
      collected_at: normalizeDate(record.collected_at) || collectedAt,
      source: record.source || 'csv_import'
    });
  }
  return { reels, skipped, invalidMetrics, total: rows.length - 1 };
}

function csvCell(value: unknown): string {
  let str = value === null || value === undefined ? '' : String(value);
  if (str && /^[=+@\-\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

export function toCsv(reels: Reel[], outlierScores: (number | null)[] = []): string {
  return '\ufeff' + [[...columns, 'outlier_score'].join(','),
    ...reels.map((reel, i) => [...columns.map(key => csvCell(reel[key])), csvCell(outlierScores[i] ?? null)].join(','))
  ].join('\r\n');
}
