import { describe, expect, it } from 'vitest';
import { translateError } from './i18n';

describe('English error messages', () => {
  it('translates data validation errors without changing the stored Vietnamese message', () => {
    const message = 'Lượt thích không hợp lệ. Ví dụ: 1200, 1.2K hoặc 2,5 triệu.';
    expect(translateError(message, 'en')).toContain('Invalid likes');
    expect(translateError(message, 'vi')).toBe(message);
  });

  it('translates scan diagnostics that contain counts', () => {
    expect(translateError('Không nhận diện được URL Reel trên tab (12 liên kết ứng viên). Facebook có thể đang tải nội dung hoặc đã đổi cấu trúc trang.', 'en'))
      .toContain('12 candidate links');
  });
});
