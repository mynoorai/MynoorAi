import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Filter, Eye, Calendar } from 'lucide-react';
import { Button, Card, LoadingSpinner, ConfirmModal } from '@/components/ui';
import { useToast } from '@/components/ui';
import { ProductAPI } from '@/services/api/admin';
import type { Content, ContentCategory, ContentStatus } from '@/types/admin';
import { CONTENT_CATEGORY_LABELS, CONTENT_STATUS_LABELS } from '@/types/admin';

interface ContentListProps {
  onCreateClick: () => void;
  onEditClick: (content: Content) => void;
}

export const ContentList: React.FC<ContentListProps> = ({ onCreateClick, onEditClick }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ContentCategory | ''>('');
  const [filterStatus, setFilterStatus] = useState<ContentStatus | ''>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Fetch contents
  const {
    data: contents = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'contents', filterCategory, filterStatus],
    queryFn: () =>
      ProductAPI.contents.getAll({
        category: filterCategory || undefined,
        status: filterStatus || undefined,
      }),
    retry: 1,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ProductAPI.contents.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contents'] });
      addToast({
        type: 'success',
        title: '콘텐츠 삭제됨',
        message: '콘텐츠가 성공적으로 삭제되었습니다.',
      });
      setDeleteConfirmId(null);
    },
    onError: () => {
      addToast({
        type: 'error',
        title: '삭제 실패',
        message: '콘텐츠 삭제 중 오류가 발생했습니다.',
      });
    },
  });

  // Publish/Unpublish mutation
  const togglePublishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      ProductAPI.contents.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contents'] });
      addToast({
        type: 'success',
        title: '상태 업데이트 완료',
        message: '콘텐츠 상태가 업데이트되었습니다.',
      });
    },
    onError: () => {
      addToast({
        type: 'error',
        title: '상태 업데이트 실패',
        message: '상태 업데이트 중 오류가 발생했습니다.',
      });
    },
  });

  // Filter contents based on search
  const filteredContents = contents.filter((content) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      content.title.toLowerCase().includes(search) ||
      content.subtitle?.toLowerCase().includes(search) ||
      content.tags.some((tag) => tag.toLowerCase().includes(search))
    );
  });

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const handleTogglePublish = useCallback(
    (content: Content) => {
      const newStatus: ContentStatus = content.status === 'published' ? 'draft' : 'published';
      togglePublishMutation.mutate({ id: content.id, status: newStatus });
    },
    [togglePublishMutation],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">콘텐츠를 불러오지 못했습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">콘텐츠 관리</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedIds((prev) => {
                const allIds = new Set(filteredContents.map((c) => c.id));
                const isAll = filteredContents.every((c) => prev.has(c.id));
                return isAll ? new Set<string>() : allIds;
              });
            }}
          >
            전체 선택/해제
          </Button>
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            disabled={selectedIds.size === 0}
            onClick={() => setBulkConfirmOpen(true)}
          >
            선택 삭제
          </Button>
          <Button onClick={onCreateClick} leftIcon={<Plus className="w-4 h-4" />}>
            새 콘텐츠 만들기
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="제목/부제/태그로 검색..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ContentCategory | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">모든 카테고리</option>
            {Object.entries(CONTENT_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ContentStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">모든 상태</option>
            {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Content List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredContents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">
            {searchTerm || filterCategory || filterStatus
              ? '현재 필터와 일치하는 콘텐츠가 없습니다.'
              : '아직 생성된 콘텐츠가 없습니다.'}
          </p>
          {!searchTerm && !filterCategory && !filterStatus && (
            <Button variant="primary" onClick={onCreateClick} className="mt-4">
              첫 콘텐츠 만들기
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContents.map((content) => (
            <Card
              key={content.id}
              className={`p-6 hover:shadow-lg transition-shadow ${selectedIds.has(content.id) ? 'ring-2 ring-purple-500' : ''}`}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={content.thumbnailUrl}
                    alt={content.title}
                    className="w-32 h-20 object-cover rounded-lg"
                  />
                  <label className="inline-flex items-center mt-2 text-xs bg-white/90 px-2 py-1 rounded cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={selectedIds.has(content.id)}
                      onChange={() => toggleSelect(content.id)}
                    />
                    선택
                  </label>
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {content.title}
                      </h3>
                      {content.subtitle && (
                        <p className="text-sm text-gray-600 truncate">{content.subtitle}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        content.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {CONTENT_STATUS_LABELS[content.status]}
                    </span>
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      {CONTENT_CATEGORY_LABELS[content.category]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(content.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {content.viewCount.toLocaleString()}회 조회
                    </span>
                  </div>

                  {/* Tags */}
                  {content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {content.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditClick(content)}
                      leftIcon={<Edit className="w-4 h-4" />}
                    >
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(content)}
                      loading={togglePublishMutation.isPending}
                    >
                      {content.status === 'published' ? '비공개' : '공개'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(content.id)}
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      삭제
                    </Button>
                  </div>
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
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="콘텐츠 삭제"
        message="이 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        confirmButtonClass="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
        cancelText="취소"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmModal
        isOpen={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await ProductAPI.contents.bulkDelete(Array.from(selectedIds));
            queryClient.invalidateQueries({ queryKey: ['admin', 'contents'] });
            addToast({
              type: 'success',
              title: '선택 삭제 완료',
              message: `${selectedIds.size}개 콘텐츠가 삭제되었습니다.`,
            });
            clearSelection();
          } catch {
            addToast({
              type: 'error',
              title: '삭제 실패',
              message: '선택한 콘텐츠 삭제 중 오류가 발생했습니다.',
            });
          } finally {
            setBulkConfirmOpen(false);
          }
        }}
        title="선택 삭제"
        message={`선택한 ${selectedIds.size}개 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        confirmButtonClass="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
      />
    </div>
  );
};
