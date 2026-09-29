'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translateText } from '../i18n/translate';

export type LanguageCode = 'vi' | 'en' | 'fr' | 'ja';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flagEmoji: string;
  country: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    code: 'vi',
    name: 'Tiếng Việt',
    nativeName: 'Tiếng Việt',
    flagEmoji: '🇻🇳',
    country: 'Việt Nam'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flagEmoji: '🇬🇧',
    country: 'Global / UK'
  },
  {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    flagEmoji: '🇫🇷',
    country: 'France'
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flagEmoji: '🇯🇵',
    country: '日本 (Japan)'
  }
];

export const TRANSLATIONS = {
  vi: {
    nav: {
      solutions: 'Giải pháp',
      suppliers: 'Doanh nghiệp',
      buyer: 'Buyer',
      products: 'Sản phẩm',
      pricing: 'Giá',
      about: 'Về chúng tôi'
    },
    header: {
      sellerBtn: 'Dành cho Seller',
      userCompany: 'Công ty TNHH Nông Sản Việt',
      languageSelect: 'Chọn ngôn ngữ',
      profileTitle: 'Hồ sơ doanh nghiệp'
    },
    menu: {
      sellerDetail: 'Xem chi tiết hồ sơ Seller (Buyer view)',
      directory: 'Tìm nhà cung cấp (Directory)',
      workspace: 'Workspace Quản lý Seller',
      solutions: 'Giải pháp công nghệ toàn diện',
      pricing: 'Bảng giá & Gói thành viên',
      about: 'Về chúng tôi (VYBE Trade)',
      onboarding: 'Quy trình Onboarding',
      home: 'Về trang chủ Sàn B2B'
    },
    hero: {
      kicker: 'NHÀ CUNG CẤP VIỆT NAM UY TÍN. CƠ HỘI TOÀN CẦU.',
      titlePre: 'Tìm nhà cung cấp ',
      titleHighlight: 'uy tín',
      titlePost: ' từ Việt Nam cho thị trường quốc tế',
      subtitle: 'Khám phá các doanh nghiệp đã được xác minh, sản phẩm chất lượng và cơ hội hợp tác trong ngành thực phẩm & nông sản.',
      searchPlaceholder: 'Tìm sản phẩm, ngành hàng, doanh nghiệp...',
      category: 'Ngành hàng',
      allCategories: 'Tất cả ngành',
      market: 'Thị trường',
      allMarkets: 'Tất cả thị trường',
      trustLevel: 'Cấp độ tín nhiệm',
      allTrustLevels: 'Tất cả cấp độ',
      popularSearches: 'Tìm kiếm phổ biến:',
      searchBtn: 'Tìm kiếm ngay',
      liveResultsFor: 'Kết quả gợi ý trực tiếp cho:',
      viewAllInDirectory: 'Xem tất cả kết quả trong Danh bạ Nhà cung cấp'
    },
    directory: {
      title: 'Tìm nhà cung cấp từ Việt Nam',
      subtitle: 'Kết nối với các doanh nghiệp xuất khẩu uy tín, đã được xác minh bởi VYBE Trade.',
      verifiedDataNotice: 'Dữ liệu đã thẩm định OCR & L3 Verified',
      filters: 'Bộ lọc tìm kiếm',
      resultsCount: 'nhà cung cấp',
      clearFilter: 'Xóa bộ lọc',
      sortBy: 'Sắp xếp theo',
      sortTrust: 'Độ tin cậy (cao nhất)',
      sortCapacity: 'Năng lực cung ứng lớn nhất',
      sortRating: 'Đánh giá cao nhất',
      viewProfile: 'Xem hồ sơ',
      sendRfq: 'Gửi RFQ'
    },
    features: {
      verified: 'Doanh nghiệp đã xác minh',
      verifiedDesc: '4 cấp độ trust từ L0 → L3',
      products: 'Sản phẩm đa dạng',
      productsDesc: 'Thực phẩm & nông sản Việt Nam',
      fast: 'Kết nối nhanh chóng',
      fastDesc: 'Gửi RFQ và trao đổi trực tiếp',
      ai: 'Hỗ trợ bởi AI',
      aiDesc: 'Phân tích tài liệu, phát hiện rủi ro'
    },
    featured: {
      title: 'Doanh nghiệp nổi bật',
      subtitle: 'Các nhà cung cấp Việt Nam đã được xác minh và sẵn sàng hợp tác',
      viewAll: 'Xem tất cả'
    },
    modal: {
      industry: 'Ngành hàng:',
      capacity: 'Năng lực sản xuất:',
      standards: 'Tiêu chuẩn quốc tế:',
      sendRfqBtn: 'Gửi RFQ / Liên hệ nhà cung cấp'
    },
    common: {
      verifiedBadge: 'Đã thẩm định',
      monthlyCapacity: 'Năng lực tháng:',
      mainMarkets: 'Thị trường chính:',
      close: 'Đóng',
      learnMore: 'Tìm hiểu thêm',
      getStarted: 'Bắt đầu ngay',
      bookDemo: 'Đặt lịch tư vấn',
      reviews: 'đánh giá quốc tế'
    }
  },
  en: {
    nav: {
      solutions: 'Solutions',
      suppliers: 'Suppliers',
      buyer: 'Buyers',
      products: 'Products',
      pricing: 'Pricing',
      about: 'About Us'
    },
    header: {
      sellerBtn: 'For Sellers',
      userCompany: 'Viet Agri Export Co., Ltd',
      languageSelect: 'Select Language',
      profileTitle: 'Company Profile'
    },
    menu: {
      sellerDetail: 'View Seller Profile (Buyer View)',
      directory: 'Supplier Directory',
      workspace: 'Seller Management Workspace',
      solutions: 'Comprehensive Tech Solutions',
      pricing: 'Pricing & Membership Plans',
      about: 'About Us (VYBE Trade)',
      onboarding: 'Onboarding Workflow',
      home: 'Back to B2B Marketplace'
    },
    hero: {
      kicker: 'TRUSTED VIETNAMESE SUPPLIERS. GLOBAL OPPORTUNITIES.',
      titlePre: 'Find ',
      titleHighlight: 'trusted suppliers',
      titlePost: ' from Vietnam for global markets',
      subtitle: 'Discover verified enterprises, premium agricultural & food commodities, and direct trade partnerships with Vietnamese exporters.',
      searchPlaceholder: 'Search products, categories, suppliers...',
      category: 'Category',
      allCategories: 'All Categories',
      market: 'Market',
      allMarkets: 'All Markets',
      trustLevel: 'Trust Level',
      allTrustLevels: 'All Trust Levels',
      popularSearches: 'Popular searches:',
      searchBtn: 'Search Now',
      liveResultsFor: 'Live search results for:',
      viewAllInDirectory: 'View all results in Supplier Directory'
    },
    directory: {
      title: 'Find Verified Suppliers from Vietnam',
      subtitle: 'Connect directly with certified Vietnamese exporters verified by VYBE Trade.',
      verifiedDataNotice: 'OCR Authenticated & L3 Verified Data',
      filters: 'Search Filters',
      resultsCount: 'suppliers found',
      clearFilter: 'Clear filter',
      sortBy: 'Sort by',
      sortTrust: 'Highest Trust Score',
      sortCapacity: 'Highest Supply Capacity',
      sortRating: 'Top Rated',
      viewProfile: 'View Profile',
      sendRfq: 'Send RFQ'
    },
    features: {
      verified: 'Verified Enterprises',
      verifiedDesc: '4 trust levels from L0 → L3',
      products: 'Diverse Commodities',
      productsDesc: 'Vietnamese agricultural & food commodities',
      fast: 'Instant Connection',
      fastDesc: 'Direct RFQ inquiry & trade messaging',
      ai: 'AI-Powered Assurance',
      aiDesc: 'Document OCR auditing & risk detection'
    },
    featured: {
      title: 'Featured Suppliers',
      subtitle: 'Verified Vietnamese suppliers ready for international cooperation',
      viewAll: 'View all'
    },
    modal: {
      industry: 'Category:',
      capacity: 'Production Capacity:',
      standards: 'International Standards:',
      sendRfqBtn: 'Send RFQ / Contact Supplier'
    },
    common: {
      verifiedBadge: 'Verified',
      monthlyCapacity: 'Monthly Capacity:',
      mainMarkets: 'Main Markets:',
      close: 'Close',
      learnMore: 'Learn More',
      getStarted: 'Get Started',
      bookDemo: 'Book Consultation',
      reviews: 'international reviews'
    }
  },
  fr: {
    nav: {
      solutions: 'Solutions',
      suppliers: 'Fournisseurs',
      buyer: 'Acheteurs',
      products: 'Produits',
      pricing: 'Tarifs',
      about: 'À propos'
    },
    header: {
      sellerBtn: 'Espace Vendeur',
      userCompany: 'Viet Agri Export SARL',
      languageSelect: 'Sélectionner la langue',
      profileTitle: 'Profil Entreprise'
    },
    menu: {
      sellerDetail: 'Voir le profil fournisseur (Vue acheteur)',
      directory: 'Annuaire des fournisseurs',
      workspace: 'Espace de gestion vendeur',
      solutions: 'Solutions technologiques complètes',
      pricing: 'Tarifs & Abonnements',
      about: 'À propos de VYBE Trade',
      onboarding: 'Processus d’intégration',
      home: 'Retour à la marketplace B2B'
    },
    hero: {
      kicker: 'FOURNISSEURS VIETNAMIENS DE CONFIANCE. MARCHÉ MONDIAL.',
      titlePre: 'Trouvez des ',
      titleHighlight: 'fournisseurs fiables',
      titlePost: ' au Vietnam pour l’export international',
      subtitle: 'Découvrez des producteurs certifiés, des produits agricoles et alimentaires de haute qualité et des opportunités d’approvisionnement direct.',
      searchPlaceholder: 'Rechercher un produit, une filière, un exportateur...',
      category: 'Catégorie',
      allCategories: 'Toutes les catégories',
      market: 'Marché',
      allMarkets: 'Tous les marchés',
      trustLevel: 'Niveau de confiance',
      allTrustLevels: 'Tous les niveaux',
      popularSearches: 'Recherches populaires :',
      searchBtn: 'Rechercher',
      liveResultsFor: 'Résultats suggérés pour :',
      viewAllInDirectory: 'Voir tous les résultats dans l’annuaire'
    },
    directory: {
      title: 'Trouver des fournisseurs vérifiés au Vietnam',
      subtitle: 'Connectez-vous directement avec des exportateurs vietnamiens certifiés par VYBE Trade.',
      verifiedDataNotice: 'Données certifiées OCR & Vérification L3',
      filters: 'Filtres de recherche',
      resultsCount: 'fournisseurs trouvés',
      clearFilter: 'Effacer les filtres',
      sortBy: 'Trier par',
      sortTrust: 'Indice de confiance (plus élevé)',
      sortCapacity: 'Capacité de production max.',
      sortRating: 'Mieux notés',
      viewProfile: 'Voir le profil',
      sendRfq: 'Envoyer une demande (RFQ)'
    },
    features: {
      verified: 'Entreprises vérifiées',
      verifiedDesc: '4 niveaux de confiance de L0 à L3',
      products: 'Produits diversifiés',
      productsDesc: 'Produits agricoles & alimentaires vietnamiens',
      fast: 'Connexion rapide',
      fastDesc: 'Envoi direct de RFQ et échanges directs',
      ai: 'Propulsé par l’IA',
      aiDesc: 'Audit documentaire OCR & détection des risques'
    },
    featured: {
      title: 'Fournisseurs à la une',
      subtitle: 'Exportateurs vietnamiens vérifiés et prêts à exporter',
      viewAll: 'Voir tout'
    },
    modal: {
      industry: 'Secteur :',
      capacity: 'Capacité de production :',
      standards: 'Normes internationales :',
      sendRfqBtn: 'Envoyer une RFQ / Contacter'
    },
    common: {
      verifiedBadge: 'Vérifié',
      monthlyCapacity: 'Capacité mensuelle :',
      mainMarkets: 'Marchés cibles :',
      close: 'Fermer',
      learnMore: 'En savoir plus',
      getStarted: 'Commencer',
      bookDemo: 'Prendre rendez-vous',
      reviews: 'avis internationaux'
    }
  },
  ja: {
    nav: {
      solutions: 'ソリューション',
      suppliers: 'サプライヤー',
      buyer: 'バイヤー',
      products: '取扱品目',
      pricing: '料金プラン',
      about: '企業情報'
    },
    header: {
      sellerBtn: '出展企業向け',
      userCompany: 'Viet Agri Export 有限会社',
      languageSelect: '言語選択',
      profileTitle: '企業プロフィール'
    },
    menu: {
      sellerDetail: 'サプライヤー詳細プロファイル（バイヤー表示）',
      directory: '認証サプライヤー検索',
      workspace: '出展企業管理ワークスペース',
      solutions: '包括的な技術ソリューション',
      pricing: '料金プラン＆メンバーシップ',
      about: 'VYBE Tradeについて',
      onboarding: '企業認証フロー',
      home: 'B2BマーケットプレイスTOP'
    },
    hero: {
      kicker: 'ベトナムの信頼できる認証サプライヤー。グローバルな取引機会。',
      titlePre: '国際市場向け ',
      titleHighlight: '信頼できるベトナム企業',
      titlePost: ' と直接つながる',
      subtitle: '厳格な審査を経たベトナムの農産品・加工食品輸出企業と高品質な商品をワンストップで検索・調達できます。',
      searchPlaceholder: '商品名、農産品カテゴリー、企業名で検索...',
      category: 'カテゴリー',
      allCategories: 'すべてのカテゴリー',
      market: '仕向地・市場',
      allMarkets: 'すべての市場',
      trustLevel: '信用ランク',
      allTrustLevels: 'すべてのランク',
      popularSearches: '人気の検索キーワード:',
      searchBtn: '検索する',
      liveResultsFor: '直接検索の候補結果:',
      viewAllInDirectory: 'サプライヤー一覧ですべての結果を表示'
    },
    directory: {
      title: 'ベトナムの認証サプライヤーを探す',
      subtitle: 'VYBE Tradeによって厳格に実在性・品質が検証された優良輸出企業と直接交渉。',
      verifiedDataNotice: 'OCR照合済・L3ランク認証データ',
      filters: '絞り込み条件',
      resultsCount: '社のサプライヤーが見つかりました',
      clearFilter: '条件をクリア',
      sortBy: '並び替え',
      sortTrust: '信用度順（高）',
      sortCapacity: '月間供給能力順（大）',
      sortRating: '評価順（高）',
      viewProfile: '詳細を見る',
      sendRfq: '見積依頼（RFQ）'
    },
    features: {
      verified: '認証済みサプライヤー',
      verifiedDesc: 'L0からL3までの4段階信用ランク',
      products: '多彩な取扱品目',
      productsDesc: 'ベトナム産農水産物・加工食品',
      fast: '迅速なダイレクト連携',
      fastDesc: 'RFQ（見積依頼）の送信と直接商談',
      ai: 'AI搭載の信用評価',
      aiDesc: '書類OCR自動照合・リスク検出'
    },
    featured: {
      title: '注目の優良サプライヤー',
      subtitle: '認証済みで即座に商談可能なベトナム輸出企業',
      viewAll: 'すべて見る'
    },
    modal: {
      industry: '業種・品目:',
      capacity: '生産・供給能力:',
      standards: '国際認証・規格:',
      sendRfqBtn: 'RFQ送信・サプライヤーに問合せ'
    },
    common: {
      verifiedBadge: '認証済み',
      monthlyCapacity: '月間供給力:',
      mainMarkets: '主な輸出先:',
      close: '閉じる',
      learnMore: '詳しく見る',
      getStarted: '今すぐ始める',
      bookDemo: 'オンライン相談予約',
      reviews: '件の国際バイヤー評価'
    }
  }
};

interface LanguageContextType {
  tr: <T>(value: T) => T;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentLanguageOption: LanguageOption;
  t: typeof TRANSLATIONS['vi'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('vybe_language') as LanguageCode;
      return LANGUAGES.some((option) => option.code === saved) ? saved : 'vi';
    } catch { return 'vi'; }
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('vybe_language', lang);
  };

  const currentLanguageOption = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const t = TRANSLATIONS[language] || TRANSLATIONS.vi;
  const tr = <T,>(value: T): T => translateText(value, language);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = { vi: 'VYBE TRADE - Kết nối doanh nghiệp Việt Nam với thế giới', en: 'VYBE TRADE - Connecting Vietnamese businesses with the world', fr: 'VYBE TRADE - Connecter les entreprises vietnamiennes au monde', ja: 'VYBE TRADE - ベトナム企業と世界をつなぐ' }[language];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguageOption, t, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
