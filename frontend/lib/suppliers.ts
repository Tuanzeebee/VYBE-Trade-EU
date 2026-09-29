import { DEFAULT_SELLER_DETAIL, type SupplierData } from '../components/BuyerSellerDetail';

export const MOCK_SUPPLIERS = [
  { id: 'vietfarm', name: 'VietFarm Co., Ltd.', industry: 'agriculture', level: 'L2', location: 'Đắk Lắk', markets: ['EU', 'Hoa Kỳ', 'Nhật Bản'], products: ['Cà phê Robusta & Arabica', 'Hồ tiêu hữu cơ', 'Rau củ quả VietGAP'], image: 'photo-1559056199-641a0ac8b55e' },
  { id: 'greenfields', name: 'GreenFields Export', industry: 'agriculture', level: 'L3', location: 'Đồng Tháp', markets: ['EU', 'Hoa Kỳ', 'Nhật Bản'], products: ['Gạo thơm Jasmine xuất khẩu', 'Thanh long ruột đỏ VietGAP', 'Rau củ quả tươi'], image: 'photo-1536304993881-ff6e9eefa2a6' },
  { id: 'mekong', name: 'Mekong Seafood', industry: 'seafood', level: 'L1', location: 'Cà Mau', markets: ['EU', 'Hoa Kỳ', 'Canada', 'Nhật Bản'], products: ['Tôm thẻ chân trắng IQF', 'Tôm sú đông lạnh', 'Cá tra phi lê', 'Cá ngừ'], image: 'photo-1565680018434-b513d5e5fd47' },
  { id: 'anphu', name: 'An Phu Food', industry: 'food', level: 'L2', location: 'Bình Phước', markets: ['EU', 'Hoa Kỳ', 'UAE', 'Trung Đông'], products: ['Hạt điều rang muối W320', 'Xoài sấy dẻo', 'Trái cây sấy', 'Gia vị chế biến'], image: 'photo-1550258987-190a2d41a8ba' },
  { id: 'organic-garden', name: 'Organic Garden Vietnam', industry: 'agriculture', level: 'L2', location: 'Lâm Đồng', markets: ['Nhật Bản', 'Hàn Quốc', 'Singapore'], products: ['Rau củ quả hữu cơ', 'Trái cây tươi', 'Bơ và sầu riêng xuất khẩu'], image: 'photo-1500382017468-9049fed747ef' },
] as const;

export const DIRECTORY_SUPPLIERS: SupplierData[] = [
  DEFAULT_SELLER_DETAIL,
  {
    id: 'mekong-export',
    name: 'Công ty CP Xuất khẩu Mekong',
    tradeName: 'MEKONG AGRI EXPORT JSC',
    taxCode: '1201589412',
    badgeLevel: 'L2',
    badgeTitle: 'L2 Enhanced Verified',
    logo: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=150&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=1600&auto=format&fit=crop&q=80',
    location: 'Tiền Giang, Việt Nam',
    address: 'Số 45, Đường 30/4, Phường 1, TP. Mỹ Tho, Tỉnh Tiền Giang',
    factoryAddress: 'KCN Mỹ Tho, Tỉnh Tiền Giang (Diện tích 18,000 m²)',
    foundedYear: '2016',
    employees: '180+ nhân sự',
    factorySize: '18,000 m²',
    capacity: '8,000 tấn/năm',
    monthlyCapacity: '300+ tấn/tháng',
    responseTime: '< 3 giờ',
    responseRate: '98.5%',
    rating: 4.88,
    reviewCount: 36,
    escrowLimit: '$300,000 USD',
    mainMarkets: ['EU', 'Trung Quốc', 'Hàn Quốc'],
    description: 'Chuyên cung cấp hạt điều chất lượng cao, đáp ứng tiêu chuẩn của các thị trường khó tính như EU, Bắc Mỹ và Đông Bắc Á. Dây chuyền bóc vỏ lụa tự động và tiệt trùng hơi nước.',
    tags: ['Hạt điều', 'Hạt tiêu', 'BRC', 'HACCP'],
    pucCode: 'VN-TG-0112',
    phcCode: 'PHC-TG-045',
    products: [
      {
        id: 'mk-1',
        name: 'Hạt điều nhân xuất khẩu W240 & W320',
        category: 'Hạt dinh dưỡng',
        image: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=800&auto=format&fit=crop&q=80',
        moq: '5 tấn',
        capacity: '300 tấn/tháng',
        packaging: 'Hút chân không túi thiếc 25 lbs x 2',
        priceRange: '$6,900 - $7,150 / Tấn (FOB Cát Lái)',
        specs: ['AFI Standard Class 1', 'Độ ẩm < 5%', 'Bể vỡ < 1%']
      }
    ],
    certificates: [
      {
        id: 'c-mk-1',
        title: 'BRCGS Food Safety Issue 9',
        issuer: 'Lloyds Register',
        certNumber: 'BRC-VN-2023-891',
        date: '2023 - 2026',
        status: 'Đã thẩm định',
        fileName: 'BRCGS_Mekong.pdf',
        fileSize: '3.1 MB',
        category: 'An toàn thực phẩm'
      },
      {
        id: 'c-mk-2',
        title: 'HACCP Codex Alimentarius',
        issuer: 'SGS Vietnam',
        certNumber: 'HACCP-SGS-4891',
        date: '2022 - 2025',
        status: 'Đã thẩm định',
        fileName: 'HACCP_Mekong.pdf',
        fileSize: '2.4 MB',
        category: 'An toàn thực phẩm'
      }
    ],
    factoryPhotos: [
      {
        title: 'Phân xưởng đóng gói hút chân không hạt điều',
        description: 'Phòng sạch tiêu chuẩn ISO Class 8 với kiểm soát nhiệt ẩm nghiêm ngặt.',
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80'
      }
    ],
    reviews: [
      {
        buyerName: 'Marc Delvaux',
        buyerCountry: 'Pháp (France)',
        buyerRole: 'Purchasing Manager - AgroParis',
        date: '05/07/2024',
        rating: 5,
        comment: 'Hạt điều Mekong giao hàng rất đúng quy cách. Đóng gói thiếc chống ẩm cực tốt trong suốt chuyến hải trình 28 ngày sang cảng Le Havre.',
        productPurchased: 'Hạt điều nhân W320',
        volume: '20 Tấn'
      }
    ]
  },
  {
    id: 'anphu-rice',
    name: 'Công ty TNHH Lúa Gạo An Phú',
    tradeName: 'AN PHU RICE IMPORT-EXPORT CO., LTD',
    taxCode: '1602049182',
    badgeLevel: 'L2',
    badgeTitle: 'L2 Enhanced Verified',
    logo: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&auto=format&fit=crop&q=80',
    location: 'An Giang, Việt Nam',
    address: 'Ấp Vĩnh Phú, Xã Vĩnh Thạnh Trung, Huyện Châu Phú, Tỉnh An Giang',
    factoryAddress: 'Cụm Công nghiệp An Phú, Huyện Châu Phú, Tỉnh An Giang (Diện tích 35,000 m²)',
    foundedYear: '2015',
    employees: '220+ nhân sự',
    factorySize: '35,000 m²',
    capacity: '50,000 tấn/năm',
    monthlyCapacity: '1,000+ tấn/tháng',
    responseTime: '< 4 giờ',
    responseRate: '97.8%',
    rating: 4.85,
    reviewCount: 42,
    escrowLimit: '$450,000 USD',
    mainMarkets: ['EU', 'Trung Đông', 'Châu Phi', 'Philippines'],
    description: 'Chuyên xay xát, chế biến và xuất khẩu gạo thơm chất lượng cao như ST25, Jasmine, Japonica đạt giải thưởng quốc tế. Cánh đồng mẫu lớn liên kết tại vùng lúa đồng bằng sông Cửu Long.',
    tags: ['Gạo ST25', 'Gạo Jasmine', 'GlobalGAP', 'ISO 22000'],
    pucCode: 'VN-AG-0994',
    phcCode: 'PHC-AG-028',
    products: [
      {
        id: 'ap-1',
        name: 'Gạo thơm ST25 đạt chuẩn xuất khẩu Châu Âu',
        category: 'Lúa gạo & Ngũ cốc',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
        moq: '2 container 20ft (50 tấn)',
        capacity: '1,500 tấn/tháng',
        packaging: 'Bao 5kg, 10kg, 25kg, 50kg hoặc Jumbo 1 tấn',
        priceRange: '$920 - $980 / Tấn (FOB TP.HCM)',
        specs: ['Độ tấm: Max 5%', 'Độ ẩm: Max 14%', 'Tạp chất: Max 0.1%']
      }
    ],
    certificates: [
      {
        id: 'c-ap-1',
        title: 'GlobalG.A.P. IFA Version 5.4',
        issuer: 'Control Union',
        certNumber: 'GGN-84910298',
        date: '2023 - 2026',
        status: 'Đã thẩm định',
        fileName: 'GlobalGAP_AnPhu.pdf',
        fileSize: '3.5 MB',
        category: 'Nông nghiệp'
      }
    ],
    factoryPhotos: [
      {
        title: 'Hệ thống silo sấy lúa công nghệ tháp sấy đứng',
        description: 'Công suất sấy 1,000 tấn/ngày, duy trì tỷ lệ hạt nguyên vẹn.',
        image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80'
      }
    ],
    reviews: [
      {
        buyerName: 'Al-Mansoor Trading',
        buyerCountry: 'UAE (Dubai)',
        buyerRole: 'Senior Sourcing Executive',
        date: '18/05/2024',
        rating: 5,
        comment: 'Gạo thơm Jasmine ST25 của An Phú có hương thơm tự nhiên và độ dẻo tuyệt hảo. Khách hàng tại chuỗi siêu thị Dubai của chúng tôi đánh giá rất cao.',
        productPurchased: 'Gạo ST25 5% tấm',
        volume: '100 Tấn'
      }
    ]
  },
  ...MOCK_SUPPLIERS.map((mock, index): SupplierData => ({
    ...DEFAULT_SELLER_DETAIL, id: mock.id, name: mock.name, tradeName: mock.name.toUpperCase(),
    industry: mock.industry, taxCode: `DEMO-${index + 1}`, badgeLevel: mock.level,
    badgeTitle: mock.level === 'L3' ? 'L3 VYBE Certified' : mock.level === 'L2' ? 'L2 Enhanced Verified' : 'L1 Basic Verified',
    location: `${mock.location}, Việt Nam`, address: `${mock.location}, Việt Nam`,
    factoryAddress: `${mock.location}, Việt Nam`, foundedYear: '2018', employees: '100+ nhân sự',
    factorySize: '10,000 m²', capacity: `${(index + 1) * 5000} tấn/năm`, monthlyCapacity: `${(index + 1) * 400} tấn/tháng`,
    mainMarkets: [...mock.markets], tags: [...mock.products, 'HACCP', 'ISO 22000'],
    description: `Nhà cung cấp demo tại ${mock.location}, chuyên xuất khẩu ${mock.products.join(', ')}.`,
    logo: `https://images.unsplash.com/${mock.image}?w=150&auto=format&fit=crop`,
    coverImage: `https://images.unsplash.com/${mock.image}?w=1600&auto=format&fit=crop`,
    products: mock.products.map((name, productIndex) => ({ id: `${mock.id}-${productIndex}`, name,
      category: mock.industry === 'seafood' ? 'Thủy sản' : mock.industry === 'food' ? 'Thực phẩm chế biến' : 'Nông sản',
      image: `https://images.unsplash.com/${mock.image}?w=600&auto=format&fit=crop`,
      moq: '5 tấn', capacity: '500 tấn/tháng', packaging: 'Bao bì tiêu chuẩn xuất khẩu',
      priceRange: 'Liên hệ báo giá', specs: ['Thông số theo yêu cầu của Buyer'], isMain: productIndex === 0 })),
    certificates: [{ id: `${mock.id}-cert`, title: 'Chứng nhận an toàn thực phẩm', issuer: 'Tổ chức chứng nhận demo',
      certNumber: `DEMO-CERT-${index}`, date: '2025-01-01 - 2027-12-31', status: 'Chứng nhận mẫu',
      fileName: 'Demo_Certificate.pdf', fileSize: '2.4 MB', category: 'An toàn thực phẩm' }],
    factoryPhotos: [], reviews: [], reviewCount: 0, rating: 4.5 + index / 10,
  })),
];
