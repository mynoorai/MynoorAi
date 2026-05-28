/**
 * ProductsCatalogPage (Shop) — App Store inspired surface.
 *
 *  - Large title "Shop"
 *  - Search bar (iOS look)
 *  - Segmented control: All / For You / Hijab / Lens / Lip / Blush
 *  - Personal color chip filter row (only when "All" tab)
 *  - Grouped grid of product cards (rounded 22, soft shadow, Get button)
 *  - Bottom tab bar consistent with HomePage / MyPage
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, ShoppingBag, Camera, User2, Crown } from 'lucide-react';

import { ProductAPI } from '@/services/api/products';
import { useAppStore } from '@/store';
import { getImageUrl } from '@/utils/imageUrl';
import { AuthRequired, PersonalColorRequired } from '@/components/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  iosPage,
  iosCard,
  IOSLargeTitle,
  IOSSearchBar,
  IOSSegmented,
  IOSSectionHeader,
  IOSTabBar,
  IOSPill,
  IOSGetButton,
} from '@/components/ios';
import {
  PERSONAL_COLOR_LABELS,
  type PersonalColorType,
  type ProductCategory,
} from '@/types';

const FALLBACK_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

type Tab = 'all' | 'for-you' | ProductCategory;

const COLOR_CHIP_BG: Record<PersonalColorType, string> = {
  spring_warm: 'linear-gradient(135deg,#FFD8A8,#FF8C9C)',
  autumn_warm: 'linear-gradient(135deg,#E0B97A,#8E5A3B)',
  summer_cool: 'linear-gradient(135deg,#C6E5FF,#88C0FF)',
  winter_cool: 'linear-gradient(135deg,#7FAFFF,#3A4DB8)',
};

const ProductsCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analysisResult } = useAppStore();
  const {
    checkPersonalColor,
    checkAuth,
    showAuthModal,
    showPersonalColorModal,
    authModalFeature,
    personalColorModalFeature,
    closeAuthModal,
    closePersonalColorModal,
  } = useRequireAuth();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [colors, setColors] = useState<PersonalColorType[]>([]);

  const productsQ = useQuery({
    queryKey: ['shop', 'products'],
    queryFn: () => ProductAPI.getProducts(),
    staleTime: 30_000,
  });
  const products = productsQ.data?.data ?? [];

  const userColor = useMemo<PersonalColorType | null>(() => {
    if (!analysisResult) return null;
    const map: Record<string, PersonalColorType> = {
      spring: 'spring_warm',
      summer: 'summer_cool',
      autumn: 'autumn_warm',
      winter: 'winter_cool',
    };
    return map[(analysisResult.personal_color_en || '').toLowerCase()] ?? null;
  }, [analysisResult]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q))
          return false;
      }
      if (activeTab === 'for-you') {
        if (!userColor) return false;
        return p.personalColors.includes(userColor);
      }
      if (activeTab !== 'all' && p.category !== activeTab) return false;
      if (colors.length > 0 && !p.personalColors.some((c) => colors.includes(c))) return false;
      return true;
    });
  }, [products, activeTab, search, colors, userColor]);

  const tabOptions: { value: Tab; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'for-you', label: 'For You' },
    { value: 'hijab', label: 'Hijab' },
    { value: 'lens', label: 'Lens' },
    { value: 'lip', label: 'Lip' },
    { value: 'blush', label: 'Blush' },
  ];

  const tabBarItems = [
    { to: '/', label: 'Home', icon: <Home className="w-6 h-6" />, match: (p: string) => p === '/' || p.startsWith('/home') },
    { to: '/products', label: 'Shop', icon: <ShoppingBag className="w-6 h-6" />, match: (p: string) => p.startsWith('/products') },
    { to: '/photoguide', label: 'Analyze', icon: <Camera className="w-6 h-6" />, match: (p: string) => p.startsWith('/photoguide') || p.startsWith('/upload') || p.startsWith('/analyzing') },
    { to: '/mypage', label: 'MyPage', icon: <User2 className="w-6 h-6" />, match: (p: string) => p.startsWith('/mypage') },
  ];

  const formatPrice = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className={iosPage}>
      <IOSLargeTitle title="Shop" subtitle={userColor ? `Curated for ${PERSONAL_COLOR_LABELS[userColor]}` : 'Explore hijab, lens, lip, blush'} />
      <IOSSearchBar value={search} onChange={setSearch} placeholder="Search items" />
      <IOSSegmented options={tabOptions} value={activeTab} onChange={(v) => setActiveTab(v as Tab)} />

      {/* Personal color chips (only on All) */}
      {activeTab === 'all' && (
        <div className="px-4 pt-1 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(PERSONAL_COLOR_LABELS) as PersonalColorType[]).map((c) => {
            const active = colors.includes(c);
            return (
              <button
                key={c}
                onClick={() =>
                  setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
                }
                className={[
                  'shrink-0 inline-flex items-center gap-2 h-8 px-3 rounded-full text-[13px] font-medium border min-h-0',
                  active
                    ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
                    : 'bg-white text-[#1C1C1E] border-[#D1D1D6]',
                ].join(' ')}
                style={{ minHeight: 32 }}
              >
                <span className="w-4 h-4 rounded-full ring-1 ring-black/5" style={{ background: COLOR_CHIP_BG[c] }} />
                {PERSONAL_COLOR_LABELS[c]}
              </button>
            );
          })}
          {(colors.length > 0 || search) && (
            <button
              onClick={() => { setColors([]); setSearch(''); }}
              className="shrink-0 h-8 px-3 rounded-full text-[13px] text-[#FF3B30] font-medium min-h-0"
              style={{ minHeight: 32 }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Personal color requirement banner */}
      {activeTab === 'for-you' && !userColor && (
        <div className="px-4 mt-2">
          <button
            onClick={() => checkPersonalColor('personalized recommendations')}
            className={`${iosCard} w-full text-left p-4 active:bg-[#F2F2F7]`}
            style={{ minHeight: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF8C9C] to-[#7FAFFF] flex items-center justify-center text-white">
                <Crown className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold">Get personal recommendations</div>
                <div className="text-[13px] text-[#8E8E93]">Run the 30-second AI analysis to unlock For You.</div>
              </div>
            </div>
          </button>
        </div>
      )}

      <IOSSectionHeader
        title={activeTab === 'all' ? 'All Items' : activeTab === 'for-you' ? 'For You' : tabOptions.find((t) => t.value === activeTab)?.label || ''}
        action={<span className="text-[13px] text-[#8E8E93]">{filtered.length} items</span>}
      />

      {productsQ.isLoading ? (
        <div className="px-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${iosCard} h-[260px] animate-pulse bg-[#E5E5EA]`} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 mt-2">
          <div className={`${iosCard} p-8 text-center text-[#8E8E93] text-[15px]`}>
            <div className="text-[40px] mb-2">🪺</div>
            No items match your filters.
            <div className="mt-3">
              <button
                onClick={() => { setActiveTab('all'); setSearch(''); setColors([]); }}
                className="text-[#007AFF] font-semibold min-h-0"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (checkAuth('product details')) navigate(`/products/${p.id}`);
              }}
              className={`${iosCard} text-left overflow-hidden active:scale-[0.99] transition-transform`}
              style={{ minHeight: 0 }}
            >
              <div className="aspect-square bg-[#F2F2F7] relative">
                <img
                  src={getImageUrl(p.thumbnailUrl) || FALLBACK_IMG}
                  alt={p.name}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                  className="w-full h-full object-cover"
                />
                {userColor && p.personalColors.includes(userColor) && (
                  <div className="absolute top-2 left-2">
                    <IOSPill bg="rgba(0,122,255,0.95)" color="white">
                      <Crown className="w-3 h-3" /> For You
                    </IOSPill>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-[11px] uppercase tracking-[0.5px] font-semibold text-[#8E8E93]">
                  {p.category}
                </div>
                <div className="text-[15px] font-semibold line-clamp-1 mt-0.5">{p.name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[13px] text-[#8E8E93]">{formatPrice(p.price)}</span>
                  <IOSGetButton>Get</IOSGetButton>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <IOSTabBar items={tabBarItems} pathname={location.pathname} />
      <AuthRequired isOpen={showAuthModal} onClose={closeAuthModal} feature={authModalFeature} />
      <PersonalColorRequired isOpen={showPersonalColorModal} onClose={closePersonalColorModal} feature={personalColorModalFeature} />
    </div>
  );
};

export default ProductsCatalogPage;
