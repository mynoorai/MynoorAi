import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout';
import { ContentAPI } from '@/services/api';
import { ProductAPI } from '@/services/api/products';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { AuthRequired, PersonalColorRequired } from '@/components/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Text } from '@/components/ui';
import { getImageUrl } from '@/utils/imageUrl';
import type { Content, Product } from '@/types';

const IMAGE_FALLBACK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const HomePage = (): JSX.Element => {
  const navigate = useNavigate();
  const {
    checkAuth,
    showAuthModal,
    showPersonalColorModal,
    authModalFeature,
    personalColorModalFeature,
    closeAuthModal,
    closePersonalColorModal,
  } = useRequireAuth();

  const [featuredContents, setFeaturedContents] = useState<Content[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);

      // Load featured contents and products
      const [contentsRes, productsRes] = await Promise.all([
        ContentAPI.getPopularContents(5),
        ProductAPI.getProducts(),
      ]);

      setFeaturedContents(contentsRes.data);
      // Take first 6 products (public API already filters active products)
      setProducts(productsRes.data.slice(0, 6));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = (): void => {
    setCurrentSlide((prev) => (prev + 1) % featuredContents.length);
  };

  const prevSlide = (): void => {
    setCurrentSlide((prev) => (prev - 1 + featuredContents.length) % featuredContents.length);
  };

  const goToSlide = (index: number): void => {
    setCurrentSlide(index);
  };

  const handleContentClick = (content: Content): void => {
    navigate(`/content/${content.slug}`);
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <PageLayout showDefaultHeader>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <Text color="gray">Loading...</Text>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showDefaultHeader>
      <div className="max-w-7xl mx-auto">
        {/* Content Carousel - Optional */}
        {featuredContents.length > 0 ? (
          <div className="relative mb-8 -mx-4 md:mx-0">
            <div className="relative h-[400px] md:h-[500px] overflow-hidden rounded-none md:rounded-2xl">
              <div
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {featuredContents.map((content) => (
                  <div
                    key={content.id}
                    className="w-full flex-shrink-0 relative cursor-pointer"
                    onClick={() => handleContentClick(content)}
                  >
                    <img
                      src={getImageUrl(content.thumbnailUrl)}
                      alt={content.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = IMAGE_FALLBACK;
                        e.currentTarget.onerror = null;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                          {ContentAPI.getCategoryIcon(content.category)}{' '}
                          {ContentAPI.getCategoryDisplayName(content.category)}
                        </span>
                        {content.viewCount > 100 && (
                          <span className="px-3 py-1 bg-primary-400/80 backdrop-blur-sm rounded-full text-sm">
                            🔥 Popular
                          </span>
                        )}
                      </div>
                      <Text as="h2" variant="h1" mb="2" className="text-3xl md:text-4xl">
                        {content.title}
                      </Text>
                      {content.subtitle && (
                        <Text variant="body-lg" mb="3" className="opacity-90 text-lg md:text-xl">
                          {content.subtitle}
                        </Text>
                      )}
                      {content.excerpt && (
                        <Text variant="body-sm" className="opacity-80 line-clamp-2">
                          {content.excerpt}
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation arrows */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Dots indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                {featuredContents.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSlide(index);
                    }}
                    className={`w-1 h-1 rounded-full transition-all ${
                      index === currentSlide ? 'bg-white w-2' : 'bg-white/60 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Empty state for contents */
          <div className="relative mb-8 -mx-4 md:mx-0">
            <div className="bg-gray-100 rounded-none md:rounded-2xl h-[400px] md:h-[500px] flex items-center justify-center">
              <div className="text-center px-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-10 h-10 text-gray-400" />
                </div>
                <Text variant="h3" color="gray" mb="2">
                  Content coming soon!
                </Text>
                <Text variant="body" color="gray" className="opacity-70">
                  Amazing beauty tips and color guides are on the way!
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* Products Section */}
        {products.length > 0 ? (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <Text variant="h2" color="gray">
                Recommended for You
              </Text>
              <button
                onClick={() => {
                  if (checkAuth('product catalog')) {
                    navigate('/products');
                  }
                }}
                className="px-4 py-2 text-primary-400 hover:text-primary-600 font-medium flex items-center gap-2 group transition-colors"
              >
                See More
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => {
                    if (checkAuth('product details')) {
                      navigate(`/products/${product.id}`);
                    }
                  }}
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-100">
                    <img
                      src={getImageUrl(product.thumbnailUrl)}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <Text
                      variant="body"
                      weight="medium"
                      color="gray"
                      mb="1"
                      className="line-clamp-1"
                    >
                      {product.name}
                    </Text>
                    <Text variant="body-lg" weight="semibold" color="primary">
                      {formatPrice(product.price)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty state for products */
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <Text variant="h2" color="gray">
                Recommended for You
              </Text>
            </div>
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <Text variant="h3" color="gray" mb="2">
                Products coming soon!
              </Text>
              <Text variant="body" color="gray" className="opacity-70">
                Hijabs and beauty products are on the way!
              </Text>
              <button
                onClick={() => navigate('/diagnosis')}
                className="mt-6 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-full hover:from-primary-700 hover:to-primary-800 transform hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-primary-500"
              >
                🎨 Find My Colors
              </button>
            </div>
          </div>
        )}
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

export default HomePage;
