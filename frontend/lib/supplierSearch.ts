import type { SupplierData } from '../components/BuyerSellerDetail';
import { translateText } from '../i18n/translate';

export function searchableText(values: string[]): string {
  return values.flatMap((value) => [value, ...(['en', 'fr', 'ja'] as const).map((language) => translateText(value, language))]).join(' ');
}

export function removeVietnameseTones(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export function matchSearch(source: string, query: string): boolean {
  const text = removeVietnameseTones(source).toLowerCase();
  const words = removeVietnameseTones(query).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const tokens = text.match(/[\p{L}\p{N}]+/gu) || [];
  return words.length > 0 && words.every((word) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word)
    ? text.includes(word) : tokens.some((token) => token.startsWith(word)));
}

export type SupplierFilters = { query?: string; category?: string | null; market?: string; level?: string };
export function filterSuppliers(suppliers: SupplierData[], filters: SupplierFilters): SupplierData[] {
  const marketTerms: Record<string, string[]> = {
    'Châu Âu (EU)': ['EU', 'Đức', 'Hà Lan', 'Châu Âu'], 'Mỹ & Canada': ['Hoa Kỳ', 'Mỹ', 'Canada'],
    'Nhật Bản & Hàn Quốc': ['Nhật Bản', 'Hàn Quốc'], 'Trung Đông': ['Trung Đông', 'UAE'],
  };
  return suppliers.filter((supplier) => {
    const searchText = searchableText([supplier.name, supplier.tradeName, supplier.location, supplier.description, supplier.badgeTitle,
      ...supplier.tags, ...supplier.mainMarkets, ...supplier.products.flatMap((product) => [product.name, product.category])]);
    const industry = supplier.industry || 'agriculture';
    const category = filters.category;
    const categoryMatch = !category || category === 'Tất cả ngành' ||
      (category === 'Nông sản' ? industry === 'agriculture' : category === 'Thủy sản' ? industry === 'seafood' :
        category === 'Thực phẩm chế biến' ? industry === 'food' : matchSearch(searchText, 'Gia vị') || matchSearch(searchText, 'Hồ tiêu'));
    const market = marketTerms[filters.market || ''];
    return (!filters.query?.trim() || matchSearch(searchText, filters.query)) && categoryMatch &&
      (!market || market.some((term) => supplier.mainMarkets.some((name) => matchSearch(name, term)))) &&
      (!filters.level || filters.level === 'all' || supplier.badgeLevel === filters.level);
  });
}
