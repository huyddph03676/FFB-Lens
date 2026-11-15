import { describe, expect, it } from 'vitest';
import { cleanAccountName, isDisplayAccountName, mostCommonAccountName } from './name';

describe('Facebook account names', () => {
  it('cleans Facebook title suffixes and rejects generic headings', () => {
    expect(cleanAccountName('  Fearless Motivation’s Reels | Facebook  ')).toBe('Fearless Motivation');
    expect(cleanAccountName('Reels · Nguyễn Văn A')).toBe('Nguyễn Văn A');
    expect(cleanAccountName('Reels | Facebook')).toBe('');
  });
  it('chooses the most common owner name and distinguishes a URL fallback', () => {
    expect(mostCommonAccountName(['Fearless Motivation', 'Other', 'fearless motivation'])).toBe('Fearless Motivation');
    expect(isDisplayAccountName('Fearless Motivation', 'https://facebook.com/fearlessmotivationofficial')).toBe(true);
    expect(isDisplayAccountName('Profile 61589211347006', 'https://facebook.com/profile.php?id=61589211347006')).toBe(false);
  });
});
