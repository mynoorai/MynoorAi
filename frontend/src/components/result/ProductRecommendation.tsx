import React from 'react';
import { Loader2 } from 'lucide-react';
import type { Product, ProductCategory, PersonalColorType } from '@/types';
import { ProductAPI } from '@/services/api/products';
import { ProductCard } from '@/components/products';

interface ProductRecommendationProps {
  personalColorEn: string;
}

const mapPersonalColor = (personalColorEn: string): PersonalColorType | null => {
  const colorMapping: Record<string, PersonalColorType> = {
    spring: 'spring_warm',
    autumn: 'autumn_warm',
    summer: 'summer_cool',
    winter: 'winter_cool',
    'spring warm': 'spring_warm',
    'autumn warm': 'autumn_warm',
    'summer cool': 'summer_cool',
    'winter cool': 'winter_cool',
  };

  const lower = personalColorEn.toLowerCase();
  if (colorMapping[lower]) return colorMapping[lower];

  const match = lower.match(/(spring|summer|autumn|winter)/);
  if (match) return colorMapping[match[1]];
  return null;
};

export const ProductRecommendation: React.FC<ProductRecommendationProps> = ({
  personalColorEn,
}) => {
  const [recommendations, setRecommendations] = React.useState<Record<ProductCategory, Product[]>>({
    hijab: [],
    blush: [],
    lip: [],
    lens: [],
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async (): Promise<void> => {
      const pcType = mapPersonalColor(personalColorEn);
      try {
        const results = await Promise.all(
          (['hijab', 'blush', 'lip', 'lens'] as ProductCategory[]).map(async (cat) => {
            let items: Product[] = [];
            try {
              const res = await ProductAPI.getProducts(
                pcType ? { category: cat, personalColor: pcType } : { category: cat },
              );
              items = res.data || [];
            } catch {
              items = [];
            }
            if (items.length === 0) {
              try {
                const resAll = await ProductAPI.getProducts({ category: cat });
                items = resAll.data || [];
              } catch {
                items = [];
              }
            }
            return [cat, items] as const;
          }),
        );
        const next: Record<ProductCategory, Product[]> = {
          hijab: [],
          blush: [],
          lip: [],
          lens: [],
        };
        results.forEach(([cat, items]) => {
          next[cat] = items;
        });
        setRecommendations(next);
      } catch (err) {
        console.error('[ProductRecommendation] Failed to load recommendations', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [personalColorEn]);

  const renderSection = (
    category: ProductCategory,
    label: string,
    emptyMessage: string,
  ): JSX.Element => {
    const items = recommendations[category] || [];
    return (
      <div className="w-full max-w-[402px] md:max-w-[600px] lg:max-w-[768px] mx-auto py-4 md:py-6 lg:py-8">
        <div className="bg-white rounded-2xl p-4 md:p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{label}</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-600 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>Loading recommendations...</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 px-1 py-4">{emptyMessage}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {items.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-2 md:gap-3">
      {renderSection('hijab', 'Recommended Hijabs', '등록된 히잡 상품이 없습니다.')}
      {renderSection('blush', 'Recommended Blushers', '등록된 블러셔 상품이 없습니다.')}
      {renderSection('lip', 'Recommended Lips', '등록된 립 상품이 없습니다.')}
      {renderSection('lens', 'Recommended Lenses', '등록된 렌즈 상품이 없습니다.')}
    </div>
  );
};

export default ProductRecommendation;
