/**
 * MyPage — Apple Settings inspired surface.
 *
 *  - Profile card (avatar gradient, name, email, member-since)
 *  - Personal color status card
 *  - Inset-grouped lists:
 *      • Activity: Saved, Viewed, My Recommendations
 *      • Account: Edit profile, Change password
 *      • Notifications & Preferences
 *      • Support / Legal
 *      • Sign out (destructive)
 *
 * Uses real backend endpoints:
 *   GET /api/users/me/saved-products
 *   GET /api/users/me/viewed-products
 *   GET /api/recommendations (filtered to current user via cookie auth)
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, ShoppingBag, Camera, User2,
  Heart, History, Sparkles, Bell, Lock, FileText, Shield, LogOut, ChevronRight,
  Mail, IdCard, Palette,
} from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store';
import { apiClient } from '@/services/api/client';
import { ProductAPI } from '@/services/api/products';
import { getImageUrl } from '@/utils/imageUrl';
import {
  iosPage, iosCard, iosGroup,
  IOSLargeTitle, IOSList, IOSListRow, IOSSectionHeader, IOSTabBar,
} from '@/components/ios';
import type { Product } from '@/types';

const FALLBACK_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const SEASON_GRADIENT: Record<string, string> = {
  spring: 'from-[#FFD8A8] via-[#FFB199] to-[#FF8C9C]',
  summer: 'from-[#C6E5FF] via-[#9DD4FF] to-[#88C0FF]',
  autumn: 'from-[#E0B97A] via-[#C8884E] to-[#8E5A3B]',
  winter: 'from-[#7FAFFF] via-[#5C7CFA] to-[#3A4DB8]',
  default: 'from-[#FF8FA3] via-[#FFB199] to-[#7FA1FF]',
};

type SavedItem = { productId: string; savedAt?: string };
type ViewedItem = { productId: string; viewedAt?: string };

const useUserProducts = (kind: 'saved-products' | 'viewed-products', enabled: boolean) =>
  useQuery({
    queryKey: ['me', kind],
    enabled,
    queryFn: async () => {
      try {
        const r = await apiClient.get<{ success: boolean; data: (SavedItem | ViewedItem)[] }>(
          `/users/me/${kind}`,
        );
        return r.data?.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

const useMyRecommendations = (enabled: boolean) =>
  useQuery({
    queryKey: ['me', 'recommendations'],
    enabled,
    queryFn: async () => {
      try {
        const r = await apiClient.get<{ success: boolean; data: any[] }>(`/recommendations`);
        return r.data?.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

const MyPage = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, checkAuth, logout } = useAuthStore();
  const { analysisResult } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !user) void checkAuth().catch(() => {});
  }, [isAuthenticated, user, checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { state: { from: { pathname: '/mypage' } } });
  }, [isAuthenticated, navigate]);

  const saved = useUserProducts('saved-products', isAuthenticated);
  const viewed = useUserProducts('viewed-products', isAuthenticated);
  const recs = useMyRecommendations(isAuthenticated);

  const allIds = useMemo(() => {
    const s = new Set<string>();
    (saved.data || []).forEach((i) => s.add(i.productId));
    (viewed.data || []).forEach((i) => s.add(i.productId));
    return [...s];
  }, [saved.data, viewed.data]);

  const productsQ = useQuery({
    queryKey: ['me', 'product-batch', allIds.sort().join(',')],
    enabled: allIds.length > 0,
    queryFn: () => ProductAPI.getProductsByIds(allIds),
    select: (r) => r.data,
    staleTime: 60_000,
  });

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    (productsQ.data || []).forEach((p) => m.set(p.id, p));
    return m;
  }, [productsQ.data]);

  const savedProducts = useMemo(() => (saved.data || []).map((s) => productMap.get(s.productId)).filter(Boolean) as Product[], [saved.data, productMap]);
  const viewedProducts = useMemo(() => (viewed.data || []).map((s) => productMap.get(s.productId)).filter(Boolean) as Product[], [viewed.data, productMap]);

  const initial = (user?.fullName?.[0] || user?.email?.[0] || 'G').toUpperCase();
  const season = (analysisResult?.personal_color_en || '').toLowerCase();
  const seasonGradient = SEASON_GRADIENT[season] || SEASON_GRADIENT.default;

  const memberSince = (() => {
    const u: any = user;
    const ts = u?.createdAt;
    if (!ts) return null;
    try { return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }); } catch { return null; }
  })();

  const handleSignOut = async (): Promise<void> => {
    if (signingOut) return;
    setSigningOut(true);
    try { await logout?.(); } catch {/* ignore */} finally {
      setSigningOut(false);
      navigate('/login');
    }
  };

  const tabBarItems = [
    { to: '/', label: 'Home', icon: <Home className="w-6 h-6" />, match: (p: string) => p === '/' || p.startsWith('/home') },
    { to: '/products', label: 'Shop', icon: <ShoppingBag className="w-6 h-6" />, match: (p: string) => p.startsWith('/products') },
    { to: '/photoguide', label: 'Analyze', icon: <Camera className="w-6 h-6" />, match: (p: string) => p.startsWith('/photoguide') || p.startsWith('/upload') || p.startsWith('/analyzing') },
    { to: '/mypage', label: 'MyPage', icon: <User2 className="w-6 h-6" />, match: (p: string) => p.startsWith('/mypage') },
  ];

  return (
    <div className={iosPage}>
      <IOSLargeTitle title="MyPage" subtitle="Account & preferences" />

      {/* Profile card */}
      <div className="px-4">
        <div className={`${iosCard} p-4 flex items-center gap-4`}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[22px] font-semibold shrink-0"
            style={{ background: 'linear-gradient(135deg,#FF8C9C,#7FAFFF)' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold text-[#1C1C1E] truncate">
              {user?.fullName || 'Guest'}
            </div>
            <div className="text-[13px] text-[#8E8E93] truncate">{user?.email}</div>
            {memberSince && (
              <div className="text-[11px] text-[#C7C7CC] mt-0.5">Member since {memberSince}</div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
        </div>
      </div>

      {/* Personal color */}
      <IOSSectionHeader title="Personal Color" action={
        <button onClick={() => navigate(analysisResult ? '/result' : '/photoguide')} className="text-[#007AFF] text-[15px] font-medium min-h-0">
          {analysisResult ? 'View' : 'Start'}
        </button>
      } />
      <div className="px-4">
        <button
          onClick={() => navigate(analysisResult ? '/result' : '/photoguide')}
          className={`${iosCard} w-full text-left overflow-hidden active:scale-[0.99] transition-transform`}
          style={{ minHeight: 0 }}
        >
          <div className={`bg-gradient-to-br ${seasonGradient} p-4 text-white`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.6px] opacity-90 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Your tone
            </div>
            <div className="text-[24px] font-bold leading-[28px] mt-1">
              {analysisResult ? (analysisResult.personal_color || analysisResult.personal_color_en) : 'Not analyzed yet'}
            </div>
            <div className="text-[13px] opacity-85 mt-1">
              {analysisResult ? `${analysisResult.confidence ?? '–'}% confidence` : 'Run a quick photo analysis.'}
            </div>
          </div>
        </button>
      </div>

      {/* Activity */}
      <IOSSectionHeader title="Activity" />
      <IOSList>
        <IOSListRow
          icon={<Heart className="w-4 h-4" />}
          iconBg="#FF3B30"
          title="Saved"
          trailing={<span>{savedProducts.length}</span>}
          showChevron
          onClick={() => navigate('/products')}
        />
        <IOSListRow
          icon={<History className="w-4 h-4" />}
          iconBg="#5856D6"
          title="Recently Viewed"
          trailing={<span>{viewedProducts.length}</span>}
          showChevron
          onClick={() => navigate('/products')}
        />
        <IOSListRow
          icon={<Sparkles className="w-4 h-4" />}
          iconBg="#FF9500"
          title="My Recommendations"
          trailing={<span>{recs.data?.length ?? 0}</span>}
          showChevron
          divider={false}
          onClick={() => navigate('/products')}
        />
      </IOSList>

      {/* Saved preview */}
      {savedProducts.length > 0 && (
        <>
          <IOSSectionHeader title="Saved Items" action={<span className="text-[13px] text-[#8E8E93]">{savedProducts.length}</span>} />
          <div className="px-4 overflow-x-auto no-scrollbar -mx-1">
            <div className="flex gap-3 px-1 pb-1">
              {savedProducts.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/products/${p.id}`)}
                  className={`${iosCard} shrink-0 w-[140px] text-left overflow-hidden active:scale-[0.99] transition-transform`}
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
                  <div className="p-2">
                    <div className="text-[13px] font-medium line-clamp-1">{p.name}</div>
                    <div className="text-[11px] text-[#8E8E93]">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p.price)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Account */}
      <IOSSectionHeader title="Account" />
      <IOSList>
        <IOSListRow icon={<Mail className="w-4 h-4" />} iconBg="#34C759" title="Email" detail={user?.email} divider />
        <IOSListRow icon={<IdCard className="w-4 h-4" />} iconBg="#007AFF" title="Display Name" detail={user?.fullName} divider />
        <IOSListRow
          icon={<Lock className="w-4 h-4" />}
          iconBg="#8E8E93"
          title="Change Password"
          showChevron
          divider={false}
          onClick={() => navigate('/forgot-password')}
        />
      </IOSList>

      {/* Preferences */}
      <IOSSectionHeader title="Preferences" />
      <IOSList>
        <IOSListRow icon={<Bell className="w-4 h-4" />} iconBg="#FF3B30" title="Notifications" trailing={<span>Coming soon</span>} divider />
        <IOSListRow icon={<Palette className="w-4 h-4" />} iconBg="#AF52DE" title="Appearance" trailing={<span>System</span>} divider={false} />
      </IOSList>

      {/* About */}
      <IOSSectionHeader title="About" />
      <IOSList>
        <IOSListRow icon={<FileText className="w-4 h-4" />} iconBg="#8E8E93" title="Terms of Service" showChevron onClick={() => navigate('/terms-of-service')} divider />
        <IOSListRow icon={<Shield className="w-4 h-4" />} iconBg="#8E8E93" title="Privacy Policy" showChevron onClick={() => navigate('/privacy-policy')} divider={false} />
      </IOSList>

      {/* Sign out */}
      <div className="px-4 mt-6">
        <div className={iosGroup}>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 text-[17px] text-[#FF3B30] active:bg-[#E5E5EA]/40 min-h-0"
            style={{ minHeight: 44 }}
          >
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </div>

      <div className="text-center text-[12px] text-[#C7C7CC] mt-6 mb-4">
        MyNoor AI · v1.0
      </div>

      <IOSTabBar items={tabBarItems} pathname={location.pathname} />
    </div>
  );
};

export default MyPage;
