import { describe, expect, it } from 'vitest';
import en from '@/messages/en.json';
import vi from '@/messages/vi.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});
}

describe('messages', () => {
  it('vi và en có cùng bộ khóa', () => {
    expect(Object.keys(flatten(en as Tree)).sort()).toEqual(Object.keys(flatten(vi as Tree)).sort());
  });

  it.each([['vi', vi], ['en', en]])('%s không có chuỗi rỗng', (_, messages) => {
    const empty = Object.entries(flatten(messages as Tree)).filter(([, v]) => !v.trim());
    expect(empty).toEqual([]);
  });
});
