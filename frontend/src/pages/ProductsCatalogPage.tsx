import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Package, Search, X, Filter, Crown } from 'lucide-react';
import { ProductCard } from '@/components/products';
import { ProductAPI } from '@/services/api/products';
import { PageLayout } from '@/components/layout';
import { Button, Text } from '@/components/ui';
import { AuthRequired, PersonalColorRequired } from '@/components/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAppStore } from '@/store';
import type { ProductCategory, PersonalColorType } from '@/types';
import { CATEGORY_LABELS, PERSONAL_COLOR_LABELS } from '@/types';

type TabType = 'all' | 'recommended' | ProductCategory;

const ProductsCatalogPage: React.FC = () => {
  // Get user's personal color result
  const { analysisResult } = useAppStore();
  const {
    checkPersonalColor,
    showAuthModal,
    showPersonalColorModal,
    authModalFeature,
    personalColorModalFeature,
    closeAuthModal,
    closePersonalColorModal,
  } = useRequireAuth();

  // Filter states
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColors, setSelectedColors] = useState<PersonalColorType[]>([]);
  // Personal color filter is now presented as inline chips (no dropdown)

  // Tab options
  const tabs: { id: TabType; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    {
      id: 'recommended',
      label: 'Recommended',
      icon: <Crown className="w-4 h-4" />,
    },
    { id: 'hijab', label: 'Hijabs' },
    { id: 'blush', label: 'Blushers' },
    { id: 'lip', label: 'Lips' },
    { id: 'lens', label: 'Lenses' },
  ];

  const personalColors: PersonalColorType[] = [
    'spring_warm',
    'autumn_warm',
    'summer_cool',
    'winter_cool',
  ];

  // No-op: dropdown removed

  // Fetch products
  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => ProductAPI.getProducts(),
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get user's personal color type
  const getUserPersonalColorType = (): PersonalColorType | null => {
    if (!analysisResult) return null;

    const colorMapping: Record<string, PersonalColorType> = {
      spring: 'spring_warm',
      autumn: 'autumn_warm',
      summer: 'summer_cool',
      winter: 'winter_cool',
    };

    return colorMapping[analysisResult.personal_color_en.toLowerCase()] || null;
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !product.name.toLowerCase().includes(searchLower) &&
          !product.description?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Recommended tab filter
      if (activeTab === 'recommended') {
        const userPersonalColor = getUserPersonalColorType();
        if (!userPersonalColor) return false;
        return product.personalColors.includes(userPersonalColor);
      }

      // Category filter (based on active tab)
      if (activeTab !== 'all' && activeTab !== 'recommended' && product.category !== activeTab) {
        return false;
      }

      // Personal color filter
      if (selectedColors.length > 0) {
        const hasMatchingColor = product.personalColors.some((color) =>
          selectedColors.includes(color),
        );
        if (!hasMatchingColor) return false;
      }

      return true;
    });
  }, [products, searchTerm, activeTab, selectedColors, analysisResult]);

  // Filter handlers
  const handleColorToggle = useCallback((color: PersonalColorType) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedColors([]);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Text color="error" mb="4">
              We ran into an issue loading products.
            </Text>
            <Button onClick={() => window.location.reload()} variant="solid" color="primary">
              Try again
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showDefaultHeader>
      <div className="min-h-screen bg-gray-50">
        {/* Common header area can be used for spacing if needed */}
        <div className="max-w-7xl mx-auto px-4 py-6" />

        {/* Search and Filter Bar */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Personal Color Chips (inline, scrollable) */}
              <div className="sm:min-w-[320px]">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Filter className="w-4 h-4" />
                  <span>Personal Color</span>
                  {selectedColors.length > 0 && (
                    <button
                      onClick={() => setSelectedColors([])}
                      className="ml-auto text-purple-600 hover:text-purple-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex overflow-x-auto whitespace-nowrap gap-2 pr-1">
                  {personalColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorToggle(color)}
                      className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedColors.includes(color)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {PERSONAL_COLOR_LABELS[color]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4">
            {/* 모바일에서 탭 겹침 방지: 가로 스크롤 + 고정 폭 + 줄바꿈 금지 */}
            <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide -mb-px gap-2 pr-2 py-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'recommended') {
                      if (checkPersonalColor('recommended products')) {
                        setActiveTab(tab.id);
                      }
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`flex-none min-w-[88px] px-4 py-3 text-sm leading-none font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'text-purple-600 border-purple-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
          {/* Results count */}
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Viewing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}{' '}
              in{' '}
              {activeTab === 'all'
                ? 'All categories'
                : activeTab === 'recommended'
                  ? 'Recommended picks'
                  : `${CATEGORY_LABELS[activeTab]} category`}
            </p>
          </div>

          {/* Products Grid - 3 columns on all devices */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <Text variant="body-lg" weight="medium" color="gray" mb="2">
                No products found
              </Text>
              <Text color="gray">
                {searchTerm || selectedColors.length > 0
                  ? 'Try adjusting the search or filter selections.'
                  : 'New products are coming soon—stay tuned!'}
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Auth Required Modal */}
      <AuthRequired isOpen={showAuthModal} onClose={closeAuthModal} feature={authModalFeature} />

      {/* Personal Color Required Modal */}
      <PersonalColorRequired
        isOpen={showPersonalColorModal}
        onClose={closePersonalColorModal}
        feature={personalColorModalFeature}
      />
    </PageLayout>
  );
};

export default ProductsCatalogPage;
