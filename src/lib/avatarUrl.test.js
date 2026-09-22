import { describe, it, expect } from 'vitest';
import { avatarPath, avatarPublicUrl, avatarDbValue } from './avatarUrl';

const DIRECT = 'https://abc.supabase.co/storage/v1/object/public/avatars/p1/1700.jpg';
const PROXY = 'https://club.example/supabase-proxy/storage/v1/object/public/avatars/p1/1700.jpg';
const PROXY_RELATIVE = '/supabase-proxy/storage/v1/object/public/avatars/p1/1700.jpg';

describe('avatarUrl', () => {
  it('путь из полного URL — с прокси и без', () => {
    for (const url of [DIRECT, PROXY, PROXY_RELATIVE]) expect(avatarPath(url)).toBe('p1/1700.jpg');
    expect(avatarPath('p1/1700.jpg')).toBe('p1/1700.jpg');
  });

  it('старые URL показываются через текущий адрес', () => {
    const base = 'https://club.example/supabase-proxy';
    expect(avatarPublicUrl(DIRECT, base)).toBe(`${base}/storage/v1/object/public/avatars/p1/1700.jpg`);
    expect(avatarPublicUrl('p1/1700.jpg', base)).toBe(`${base}/storage/v1/object/public/avatars/p1/1700.jpg`);
  });

  it('в БД пишется путь', () => {
    expect(avatarDbValue(PROXY)).toBe('p1/1700.jpg');
    expect(avatarDbValue(null)).toBe(null);
    expect(avatarDbValue('')).toBe(null);
  });

  it('ссылка не на наш бакет не трогается', () => {
    const external = 'https://example.com/me.png';
    expect(avatarPath(external)).toBe(null);
    expect(avatarPublicUrl(external, 'https://x')).toBe(external);
    expect(avatarDbValue(external)).toBe(external);
  });
});
