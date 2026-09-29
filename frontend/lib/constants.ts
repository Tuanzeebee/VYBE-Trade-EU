export const POPULAR_TAGS = [
  'Cà phê',
  'Gạo',
  'Trái cây tươi',
  'Thủy sản',
  'Hạt điều',
  'Tiêu',
  'Rau củ quả'
];

export interface FeaturedSupplier {
  id: string;
  name: string;
  verifiedLevel: string;
  verifiedType: 'l1' | 'l2' | 'l3';
  category: string;
  categoryType: 'agriculture' | 'seafood' | 'food';
  location: string;
  tags: string[];
  description: string;
  capacity: string;
  standards: string;
  iconColor: string;
}

export const FEATURED_SUPPLIERS: FeaturedSupplier[] = [
  {
    id: 'vietfarm',
    name: 'VietFarm Co., Ltd.',
    verifiedLevel: 'L2 Enhanced Verified',
    verifiedType: 'l2',
    category: 'Nông sản',
    categoryType: 'agriculture',
    location: 'Việt Nam',
    tags: ['Cà phê', 'Hồ tiêu', 'Trái cây'],
    description: 'Chuyên xuất khẩu cà phê Robusta & Arabica Đắk Lắk, hồ tiêu Gia Lai đạt chứng nhận Rainforest Alliance và hữu cơ USDA.',
    capacity: '15,000 tấn/năm',
    standards: 'ISO 22000, HACCP, USDA Organic',
    iconColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'mekong',
    name: 'Mekong Seafood',
    verifiedLevel: 'L1 Basic Verified',
    verifiedType: 'l1',
    category: 'Thủy sản',
    categoryType: 'seafood',
    location: 'Việt Nam',
    tags: ['Tôm', 'Cá tra', 'Cá ngừ'],
    description: 'Cung cấp tôm sú, tôm thẻ chân trắng đông lạnh và phi lê cá tra xuất khẩu thị trường EU, Nhật Bản và Bắc Mỹ.',
    capacity: '25,000 tấn/năm',
    standards: 'BAP 4-Star, ASC, GlobalGAP',
    iconColor: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'greenfields',
    name: 'GreenFields Export',
    verifiedLevel: 'L3 VYBE Certified',
    verifiedType: 'l3',
    category: 'Nông sản',
    categoryType: 'agriculture',
    location: 'Việt Nam',
    tags: ['Gạo', 'Rau củ quả', 'Gia vị'],
    description: 'Chuỗi cung ứng gạo thơm ST25, Jasmine đạt giải thế giới, rau củ quả chuẩn VietGAP xuất khẩu trực tiếp sang Châu Âu.',
    capacity: '50,000 tấn/năm',
    standards: 'BRCGS Food, IFS Food, Fairtrade',
    iconColor: 'bg-emerald-50 text-emerald-800',
  },
  {
    id: 'anphu',
    name: 'An Phu Food',
    verifiedLevel: 'L2 Enhanced Verified',
    verifiedType: 'l2',
    category: 'Thực phẩm',
    categoryType: 'food',
    location: 'Việt Nam',
    tags: ['Hạt điều', 'Trái cây sấy', 'Gia vị'],
    description: 'Nhà chế biến sâu hạt điều Bình Phước W240, W320 và trái cây sấy dẻo công nghệ sấy lạnh giữ nguyên hương vị tự nhiên.',
    capacity: '8,000 tấn/năm',
    standards: 'FSSC 22000, Halal, Kosher',
    iconColor: 'bg-amber-50 text-amber-600',
  }
];

export const CATEGORIES = [
  'Nông sản',
  'Thủy sản',
  'Thực phẩm & Đồ uống',
  'Dệt may',
  'Thủ công mỹ nghệ',
  'Gia vị & Hương liệu'
];

export const MARKETS = [
  'Tất cả thị trường',
  'Châu Âu (EU)',
  'Hoa Kỳ (US)',
  'Nhật Bản (JP)',
  'Hàn Quốc (KR)',
  'Trung Quốc (CN)',
  'ASEAN'
];

export const TRUST_LEVELS = [
  'Tất cả cấp độ',
  'L1 Basic Verified',
  'L2 Enhanced Verified',
  'L3 VYBE Certified'
];
