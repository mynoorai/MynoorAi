import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProductAPI } from '@/services/api/admin';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { PageLayout } from '@/components/layout';
import { ArrowLeft, Instagram, Palette, Tag, Calendar, FileText, X } from 'lucide-react';
import type { Recommendation, RecommendationStatus } from '@/types';

const STATUS_OPTIONS: ReadonlyArray<{
  value: RecommendationStatus;
  label: string;
  activeText: string;
  ring: string;
}> = [
  { value: 'pending', label: '대기', activeText: 'text-yellow-600', ring: 'focus:ring-yellow-500' },
  {
    value: 'processing',
    label: '진행중',
    activeText: 'text-blue-600',
    ring: 'focus:ring-blue-500',
  },
  { value: 'completed', label: '완료', activeText: 'text-green-600', ring: 'focus:ring-green-500' },
  { value: 'failed', label: '실패', activeText: 'text-red-600', ring: 'focus:ring-red-500' },
];

const AdminRecommendationDetail = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [productIdDraft, setProductIdDraft] = useState<string[]>([]);
  const [productIdInput, setProductIdInput] = useState('');
  const [productIdError, setProductIdError] = useState<string | null>(null);

  const loadRecommendation = useCallback(async (): Promise<void> => {
    if (!id) return;

    setIsLoading(true);
    try {
      const data = await ProductAPI.getRecommendation(id);
      setRecommendation(data);
      setProductIdDraft(Array.isArray(data?.productIds) ? data.productIds : []);
      setProductIdError(null);
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecommendation();
  }, [id, loadRecommendation]);

  const handleStatusUpdate = async (newStatus: RecommendationStatus): Promise<void> => {
    if (!id || !recommendation) return;

    setIsUpdating(true);
    setProductIdError(null);
    try {
      const updated = await ProductAPI.updateRecommendationStatus(id, newStatus, productIdDraft);
      setRecommendation(updated);
      setProductIdDraft(Array.isArray(updated?.productIds) ? updated.productIds : []);
    } catch (err) {
      // Surface validation/product-not-found errors to the admin instead of
      // swallowing — the backend rejects unknown product ids with 400.
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '상태 업데이트에 실패했습니다.';
      setProductIdError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddProductId = (): void => {
    const trimmed = productIdInput.trim();
    if (!trimmed) return;
    if (productIdDraft.includes(trimmed)) {
      setProductIdError(`이미 추가된 상품 ID 입니다: ${trimmed}`);
      return;
    }
    setProductIdDraft([...productIdDraft, trimmed]);
    setProductIdInput('');
    setProductIdError(null);
  };

  const handleRemoveProductId = (pid: string): void => {
    setProductIdDraft(productIdDraft.filter((p) => p !== pid));
    setProductIdError(null);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기';
      case 'processing':
        return '진행중';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  if (!recommendation) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">추천 데이터를 찾을 수 없습니다.</p>
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')} className="mt-4">
            대시보드로 돌아가기
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Button>
        </div>

        {/* User Info Card */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            사용자 정보
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">인스타그램 ID</p>
              <p className="font-medium">@{recommendation.instagramId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">세션 ID</p>
              <p className="font-mono text-sm">{recommendation.sessionId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">생성 시각</p>
              <p className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                {new Date(recommendation.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">상태</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(recommendation.status)}`}
                >
                  {getStatusText(recommendation.status)}
                </span>
              </div>
            </div>
            {recommendation.completedAt && (
              <div>
                <p className="text-sm text-gray-600">완료 시각</p>
                <p className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(recommendation.completedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Personal Color Result */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            퍼스널 컬러 분석
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">시즌</p>
                <p className="font-medium capitalize">
                  {recommendation.personalColorResult.personal_color_en}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">톤</p>
                <p className="font-medium">{recommendation.personalColorResult.tone_en}</p>
              </div>
            </div>

            {recommendation.personalColorResult.confidence && (
              <div>
                <p className="text-sm text-gray-600">신뢰도</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${Math.min(recommendation.personalColorResult.confidence * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.min(recommendation.personalColorResult.confidence * 100, 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Best Colors */}
            {recommendation.personalColorResult.bestColors && (
              <div>
                <p className="text-sm text-gray-600 mb-2">추천 색상</p>
                <div className="flex flex-wrap gap-2">
                  {recommendation.personalColorResult.bestColors.map((color, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-md border border-gray-200"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-sm">{color.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* User Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            사용자 선호
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">스타일 선호</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {recommendation.userPreferences.style.map((style) => (
                  <span key={style} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {style}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">가격대</p>
              <p className="font-medium">{recommendation.userPreferences.priceRange}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">선호 소재</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {recommendation.userPreferences.material.map((material) => (
                  <span key={material} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {material}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">착용 상황</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {recommendation.userPreferences.occasion.map((occasion) => (
                  <span key={occasion} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {occasion}
                  </span>
                ))}
              </div>
            </div>

            {recommendation.userPreferences.additionalNotes && (
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  추가 메모
                </p>
                <p className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                  {recommendation.userPreferences.additionalNotes}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Curated Products */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">큐레이션 상품</h2>
          <p className="text-sm text-gray-500 mb-3">
            상품 ID를 입력해 추천 번들을 구성합니다. 존재하지 않는 ID는 저장 시 거절됩니다.
          </p>

          <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
            {productIdDraft.length === 0 && (
              <span className="text-sm text-gray-400">아직 선택된 상품이 없습니다.</span>
            )}
            {productIdDraft.map((pid) => (
              <span
                key={pid}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-mono"
              >
                {pid}
                <button
                  type="button"
                  onClick={() => handleRemoveProductId(pid)}
                  disabled={isUpdating}
                  className="ml-1 text-gray-500 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Remove ${pid}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={productIdInput}
              onChange={(e) => setProductIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddProductId();
                }
              }}
              placeholder="상품 ID 입력 후 Enter 또는 추가"
              disabled={isUpdating}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono disabled:bg-gray-50"
            />
            <Button
              variant="secondary"
              onClick={handleAddProductId}
              disabled={isUpdating || !productIdInput.trim()}
            >
              추가
            </Button>
          </div>

          {productIdError && <p className="mt-2 text-sm text-red-600">{productIdError}</p>}
        </Card>

        {/* Status Update Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">상태 변경</h2>
          <p className="text-sm text-gray-500 mb-3">
            상태를 선택하면 위에서 구성한 큐레이션 상품과 함께 저장됩니다.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            {STATUS_OPTIONS.map((opt) => {
              const isActive = recommendation.status === opt.value;
              return (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={isActive}
                    onChange={() => !isUpdating && handleStatusUpdate(opt.value)}
                    disabled={isUpdating}
                    className={`w-4 h-4 ${opt.ring}`}
                  />
                  <span className={`font-medium ${isActive ? opt.activeText : 'text-gray-600'}`}>
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default AdminRecommendationDetail;
