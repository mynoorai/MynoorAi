import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, ExternalLink, Plus, CheckSquare, Trash2, Trash } from 'lucide-react';
import { Button, Card, Input, LoadingSpinner, ConfirmModal } from '@/components/ui';
import { useToast } from '@/components/ui';
import { ProductAPI } from '@/services/api/admin';
import { useAdminStore } from '@/store/useAdminStore';
import type { Product, ProductCategory, PersonalColorType } from '@/types/admin';
import { CATEGORY_LABELS, PERSONAL_COLOR_LABELS } from '@/types';
import { getImageUrl } from '@/utils/imageUrl';

interface ProductListProps {
  onCreateClick: () => void;
  onEditClick: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onCreateClick, onEditClick }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { filters, setFilters } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Fetch products
  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'products', filters],
    queryFn: () => ProductAPI.products.getAll(filters),
    retry: 1,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ProductAPI.products.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      addToast({
        type: 'success',
        title: '상품 삭제됨',
        message: '상품이 성공적으로 삭제되었습니다.',
      });
      setDeleteConfirmId(null);
    },
    onError: () => {
      addToast({
        type: 'error',
        title: '삭제 실패',
        message: '상품 삭제 중 오류가 발생했습니다.',
      });
    },
  });

  // Filter products by search term
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle category filter
  const handleCategoryFilter = useCallback(
    (category?: ProductCategory) => {
      setFilters({ ...filters, category });
    },
    [filters, setFilters],
  );

  // Handle personal color filter
  const handlePersonalColorFilter = useCallback(
    (personalColor?: PersonalColorType) => {
      setFilters({ ...filters, personalColor });
    },
    [filters, setFilters],
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
  }, [setFilters]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">상품 목록을 불러오지 못했습니다.</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })}>
          다시 시도
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">상품 관리</h2>
        <div className="flex items-center gap-2">
          {/* 액션 툴바: 선택/삭제 관련 */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1 shadow-sm">
            <Button
              size="sm"
              variant="soft"
              color="gray"
              className="gap-2"
              onClick={() => {
                setSelectedIds((prev) => {
                  // 전체 선택/해제 토글
                  const allIds = new Set(filteredProducts.map((p) => p.id));
                  const isAllSelected = filteredProducts.every((p) => prev.has(p.id));
                  return isAllSelected ? new Set<string>() : allIds;
                });
              }}
            >
              <CheckSquare className="w-4 h-4" />
              전체 선택/해제
            </Button>
            <Button
              size="sm"
              variant="soft"
              color="error"
              className="gap-2"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              선택 삭제
              {selectedIds.size > 0 && (
                <span className="ml-1 rounded-full bg-red-100 text-red-700 text-[10px] leading-none px-1.5 py-1">
                  {selectedIds.size}
                </span>
              )}
            </Button>
            <span className="w-px h-6 bg-gray-200 mx-0.5" />
            <Button
              size="sm"
              variant="outline"
              color="error"
              className="gap-2"
              disabled={filteredProducts.length === 0}
              onClick={() => setDeleteConfirmId('ALL')}
            >
              <Trash className="w-4 h-4" />
              전체 삭제
            </Button>
          </div>

          {/* 주요 CTA: 상품 추가 */}
          <Button onClick={onCreateClick} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            상품 추가
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품명으로 검색..."
              className="pl-10"
            />
          </div>

          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            필터
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={!filters.category ? 'default' : 'ghost'}
                  onClick={() => handleCategoryFilter(undefined)}
                >
                  전체
                </Button>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={filters.category === value ? 'default' : 'ghost'}
                    onClick={() => handleCategoryFilter(value as ProductCategory)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">퍼스널 컬러</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={!filters.personalColor ? 'default' : 'ghost'}
                  onClick={() => handlePersonalColorFilter(undefined)}
                >
                  전체
                </Button>
                {Object.entries(PERSONAL_COLOR_LABELS).map(([value, label]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={filters.personalColor === value ? 'default' : 'ghost'}
                    onClick={() => handlePersonalColorFilter(value as PersonalColorType)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                필터 초기화
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Product Count */}
      <div className="text-sm text-gray-600">총 {filteredProducts.length}개 상품</div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-4">아직 추가된 상품이 없습니다.</p>
          <Button onClick={onCreateClick}>첫 상품 추가</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              hover
              role="button"
              tabIndex={0}
              onClick={() => onEditClick(product)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEditClick(product);
                }
              }}
              className={`overflow-hidden transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${selectedIds.has(product.id) ? 'ring-2 ring-purple-500' : ''}`}
            >
              {/* Product Image */}
              <div className="relative aspect-square">
                <img
                  src={getImageUrl(product.thumbnailUrl)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />

                {/* Top overlay: 좌측 선택 체크박스만 유지 (카드 클릭으로 수정 진입) */}
                <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-start z-10 pointer-events-none">
                  {/* Selection checkbox */}
                  <label
                    className="bg-white/90 rounded-md px-2 py-1 text-xs cursor-pointer select-none shadow-sm pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="mr-1 align-middle"
                    />
                    선택
                  </label>
                </div>

                {!product.isActive && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-0">
                    <span className="text-white font-medium">비활성화</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-gray-500">{CATEGORY_LABELS[product.category]}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-purple-600">
                    Rp {product.price.toLocaleString('id-ID')}
                  </span>
                  {product.shopeeLink && (
                    <a
                      href={product.shopeeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      링크
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {product.personalColors.map((color) => (
                    <span
                      key={color}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                    >
                      {PERSONAL_COLOR_LABELS[color]}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (deleteConfirmId === 'ALL') {
            try {
              await ProductAPI.products.bulkDelete();
              queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
              addToast({
                type: 'success',
                title: '전체 삭제 완료',
                message: '모든 상품이 삭제되었습니다.',
              });
            } catch {
              addToast({
                type: 'error',
                title: '삭제 실패',
                message: '상품 일괄 삭제 중 오류가 발생했습니다.',
              });
            } finally {
              setDeleteConfirmId(null);
            }
          } else if (deleteConfirmId) {
            deleteMutation.mutate(deleteConfirmId);
          }
        }}
        title={deleteConfirmId === 'ALL' ? '전체 삭제' : '상품 삭제'}
        message={
          deleteConfirmId === 'ALL'
            ? '모든 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
            : '이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        }
        confirmText="삭제"
        confirmButtonClass="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
        isLoading={deleteMutation.isPending}
      />

      {/* Bulk selected delete */}
      <ConfirmModal
        isOpen={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await ProductAPI.products.bulkDelete(Array.from(selectedIds));
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            addToast({
              type: 'success',
              title: '선택 삭제 완료',
              message: `${selectedIds.size}개 상품이 삭제되었습니다.`,
            });
            clearSelection();
          } catch {
            addToast({
              type: 'error',
              title: '삭제 실패',
              message: '선택한 상품 삭제 중 오류가 발생했습니다.',
            });
          } finally {
            setBulkConfirmOpen(false);
          }
        }}
        title="선택 삭제"
        message={`선택한 ${selectedIds.size}개 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        confirmButtonClass="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
      />
    </div>
  );
};
