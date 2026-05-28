/**
 * HomePage — Apple-inspired "Today" surface.
 *
 * Layout cues:
 *  - Status-bar-aware iOS background (#F2F2F7)
 *  - Large title with greeting + avatar pill on right
 *  - Hero "Personal Color" card (gradient if diagnosed, CTA if not)
 *  - Featured stories carousel (App Store style cards)
 *  - "For You" recommended products (horizontal scroll)
 *  - "All Picks" 2-column grid preview
 *  - Bottom tab bar (Home / Shop / Analyze / MyPage)
 *
 * Only depends on existing APIs:
 *   GET /api/contents/popular
 *   GET /api/products
 * Falls back gracefully when either is empty / loading.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ShoppingBag, Heart, Home, User2, Camera, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { ContentAPI } from '@/services/api';
import { ProductAPI } from '@/services/api/products';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store';
import { getImageUrl } from '@/utils/imageUrl';
import { AuthRequired, PersonalColorRequired } from '@/components/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  iosPage,
  IOSLargeTitle,
  IOSSectionHeader,
  IOSTabBar,
  IOSPill,
  IOSGetButton,
  iosCard,
} from '@/components/ios';
import type { Content, Product } from '@/types';

const SEASON_GRADIENT: Record<string, string> = {
  spring: 'from-[#FFD8A8] via-[#FFB199] to-[#FF8C9C]',
  summer: 'from-[#C6E5FF] via-[#9DD4FF] to-[#88C0FF]',
  autumn: 'from-[#E0B97A] via-[#C8884E] to-[#8E5A3B]',
  winter: 'from-[#7FAFFF] via-[#5C7CFA] to-[#3A4DB8]',
  default: 'from-[#A0A0A8] via-[#797980] to-[#4A4A52]',
};

const FALLBACK_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const greeting = (name?: string | null): string => {
  const hr = new Date().getHours();
  const base = hr < 5 ? 'Good Night' : hr < 12 ? 'Good Morning' : hr < 18 ? 'Good Afternoon' : 'Good Evening';
  return name ? `${base},` : base;
};

const HomePage = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const { analysisResult } = useAppStore();
  const {
    checkAuth,
    showAuthModal,
    showPersonalColorModal,
    authModalFeature,
    personalColorModalFeature,
    closeAuthModal,
    closePersonalColorModal,
  } = useRequireAuth();

  const contentsQ = useQuery({
    queryKey: ['home', 'contents'],
    queryFn: () => ContentAPI.getPopularContents(8),
    staleTime: 60_000,
  });
  const productsQ = useQuery({
    queryKey: ['home', 'products'],
    queryFn: () => ProductAPI.getProducts(),
    staleTime: 30_000,
  });

  const contents: Content[] = contentsQ.data?.data ?? [];
  const products: Product[] = productsQ.data?.data ?? [];

  const season = (analysisResult?.personal_color_en || '').toLowerCase();
  const seasonGradient = SEASON_GRADIENT[season] || SEASON_GRADIENT.default;

  const recommendedProducts = useMemo(() => {
    if (!analysisResult) return products.slice(0, 6);
    const colorMap: Record<string, string> = {
      spring: 'spring_warm',
      summer: 'summer_cool',
      autumn: 'autumn_warm',
      winter: 'winter_cool',
    };
    const wanted = colorMap[season];
    const matched = wanted ? products.filter((p) => p.personalColors.includes(wanted as any)) : [];
    const list = matched.length > 0 ? matched : products;
    return list.slice(0, 6);
  }, [products, analysisResult, season]);

  const allPicks = useMemo(() => products.slice(0, 6), [products]);

  const tabItems = [
    { to: '/', label: 'Home', icon: <Home className="w-6 h-6" />, match: (p: string) => p === '/' || p.startsWith('/home') },
    { to: '/products', label: 'Shop', icon: <ShoppingBag className="w-6 h-6" />, match: (p: string) => p.startsWith('/products') },
    { to: '/photoguide', label: 'Analyze', icon: <Camera className="w-6 h-6" />, match: (p: string) => p.startsWith('/photoguide') || p.startsWith('/upload') || p.startsWith('/analyzing') },
    { to: '/mypage', label: 'MyPage', icon: <User2 className="w-6 h-6" />, match: (p: string) => p.startsWith('/mypage') },
  ];

  return (
    <div className={iosPage}>
      <IOSLargeTitle
        title={greeting(user?.fullName)}
        subtitle={user?.fullName || 'Find your perfect color'}
        right={
          <button
            onClick={() => navigate(isAuthenticated ? '/mypage' : '/login')}
            className="w-9 h-9 rounded-full bg-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] font-semibold min-h-0"
            style={{ minHeight: 36 }}
            aria-label="Account"
          >
            {(user?.fullName?.[0] || user?.email?.[0] || 'G').toUpperCase()}
          </button>
        }
      />

      {/* Hero personal color card */}
      <div className="px-4 mt-1">
        <button
          onClick={() => {
            if (analysisResult) navigate('/result');
            else navigate('/photoguide');
          }}
          className={`${iosCard} w-full text-left overflow-hidden p-0 relative active:scale-[0.99] transition-transform`}
          style={{ minHeight: 0 }}
        >
          <div className={`bg-gradient-to-br ${seasonGradient} p-5`}>
            <div className="flex items-center justify-between text-white/90 text-[11px] font-semibold uppercase tracking-[0.6px]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {analysisResult ? 'Your personal color' : 'Personal color analysis'}
              </span>
              <span className="opacity-90">{analysisResult ? `${analysisResult.confidence ?? 0}%` : 'Free · 30s'}</span>
            </div>
            <h3 className="text-white text-[28px] leading-[33px] font-bold tracking-tight mt-3">
              {analysisResult
                ? (analysisResult.personal_color || analysisResult.personal_color_en || 'Your tone')
                : 'Discover your tone'}
            </h3>
            <p className="text-white/85 text-[14px] mt-2 max-w-[280px]">
              {analysisResult
                ? 'Tap to see your palette, do/don\u2019t colors, and curated hijab picks.'
                : 'Take a photo and our AI will find the colors that suit you best.'}
            </p>
            <div className="flex gap-2 mt-4">
              {(analysisResult?.best_colors || ['#FFB3BA', '#FFCC99', '#FFFFCC', '#CCFFCC']).slice(0, 5).map((c, i) => (
                <div key={i} className="w-7 h-7 rounded-full ring-2 ring-white/60 shadow" style={{ background: c }} />
              ))}
            </div>
          </div>
        </button>
      </div>

      {/* Featured stories */}
      {contents.length > 0 && (
        <>
          <IOSSectionHeader title="Featured" action={<button onClick={() => navigate('/products')} className="text-[#007AFF] text-[15px] font-medium min-h-0">See All</button>} />
          <div className="px-4 overflow-x-auto no-scrollbar -mx-1">
            <div className="flex gap-3 px-1 pb-1">
              {contents.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/content/${c.slug}`)}
                  className={`${iosCard} relative overflow-hidden shrink-0 w-[260px] h-[340px] text-left active:scale-[0.99] transition-transform`}
                  style={{ minHeight: 0 }}
                >
                  <img
                    src={getImageUrl(c.thumbnailUrl) || FALLBACK_IMG}
                    alt={c.title}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex justify-between">
                    <IOSPill bg="rgba(255,255,255,0.85)" color="#1C1C1E">
                      {ContentAPI.getCategoryDisplayName(c.category)}
                    </IOSPill>
                    {c.viewCount > 100 && (
                      <IOSPill bg="rgba(255,59,48,0.9)" color="white">
                        <Star className="w-3 h-3" /> Popular
                      </IOSPill>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.6px] opacity-90">
                      Story
                    </div>
                    <div className="text-[22px] leading-[26px] font-bold mt-1">{c.title}</div>
                    {c.subtitle && (
                      <div className="text-[13px] opacity-85 mt-1 line-clamp-2">{c.subtitle}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* For You — recommended products */}
      <IOSSectionHeader
        title={analysisResult ? 'For You' : 'New Arrivals'}
        action={
          <button onClick={() => navigate('/products')} className="text-[#007AFF] text-[15px] font-medium min-h-0">
            See All
          </button>
        }
      />
      {productsQ.isLoading ? (
        <div className="px-4 flex gap-3 overflow-x-auto no-scrollbar">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${iosCard} shrink-0 w-[230px] h-[300px] animate-pulse bg-[#E5E5EA]`} />
          ))}
        </div>
      ) : recommendedProducts.length === 0 ? (
        <div className="px-4">
          <div className={`${iosCard} p-6 text-center text-[#8E8E93] text-[15px]`}>
            No products yet. Admin will publish soon.
          </div>
        </div>
      ) : (
        <div className="px-4 overflow-x-auto no-scrollbar -mx-1">
          <div className="flex gap-3 px-1 pb-1">
            {recommendedProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  if (checkAuth('product details')) navigate(`/products/${p.id}`);
                }}
                className={`${iosCard} shrink-0 w-[160px] text-left overflow-hidden active:scale-[0.99] transition-transform`}
                style={{ minHeight: 0 }}
              >
                <div className="aspect-square bg-[#F2F2F7] overflow-hidden">
                  <img
                    src={getImageUrl(p.thumbnailUrl) || FALLBACK_IMG}
                    alt={p.name}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <div className="text-[11px] uppercase tracking-[0.5px] font-semibold text-[#8E8E93]">
                    {p.category}
                  </div>
                  <div className="text-[15px] font-semibold text-[#1C1C1E] line-clamp-1 mt-0.5">{p.name}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[13px] text-[#8E8E93]">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p.price)}
                    </span>
                    <IOSGetButton>Get</IOSGetButton>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All Picks grid */}
      {allPicks.length > 0 && (
        <>
          <IOSSectionHeader title="Editor's Picks" />
          <div className="px-4 grid grid-cols-2 gap-3">
            {allPicks.map((p) => (
              <button
                key={p.id}
                onClick={() => { if (checkAuth('product details')) navigate(`/products/${p.id}`); }}
                className={`${iosCard} text-left overflow-hidden active:scale-[0.99] transition-transform`}
                style={{ minHeight: 0 }}
              >
                <div className="aspect-square bg-[#F2F2F7]">
                  <img
                    src={getImageUrl(p.thumbnailUrl) || FALLBACK_IMG}
                    alt={p.name}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <div className="text-[15px] font-semibold line-clamp-1">{p.name}</div>
                  <div className="text-[13px] text-[#8E8E93] mt-1">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p.price)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <IOSTabBar items={tabItems} pathname={location.pathname} />
      <AuthRequired isOpen={showAuthModal} onClose={closeAuthModal} feature={authModalFeature} />
      <PersonalColorRequired isOpen={showPersonalColorModal} onClose={closePersonalColorModal} feature={personalColorModalFeature} />
    </div>
  );
};

export default HomePage;
