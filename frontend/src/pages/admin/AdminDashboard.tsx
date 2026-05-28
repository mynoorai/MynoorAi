import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Package, FileText, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { PageLayout } from '@/components/layout';
import { ProductList, ContentList, UsersList } from '@/components/admin';
import { useAdminStore } from '@/store/useAdminStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Product, Content } from '@/types/admin';

type TabType = 'products' | 'contents' | 'users';
type ViewMode = 'list' | 'create' | 'edit';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { clearProductState } = useAdminStore();
  const logout = useAuthStore((state) => state.logout);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleLogout = async () => {
    await logout();
    clearProductState();
    navigate('/');
  };

  const handleCreateClick = () => {
    if (activeTab === 'products') {
      navigate('/admin/products/new');
    } else {
      navigate('/admin/contents/new');
    }
  };

  const handleEditProductClick = (product: Product) => {
    navigate(`/admin/products/${product.id}/edit`);
  };

  const handleEditContentClick = (content: Content) => {
    navigate(`/admin/contents/${content.id}/edit`);
  };

  // URL 쿼리파라미터 ↔ 내부 상태 동기화
  useEffect(() => {
    const tab = (searchParams.get('tab') as TabType) || 'products';
    const view = (searchParams.get('view') as ViewMode) || 'list';
    setActiveTab(tab);
    setViewMode(view);
  }, [searchParams]);

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <button
                  onClick={() => navigate(-1)}
                  className="mr-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <Package className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
                  <p className="text-sm text-gray-500">상품 · 콘텐츠 관리</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('products');
                  setViewMode('list');
                  setSearchParams({ tab: 'products', view: 'list' }, { replace: false });
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'products'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4" />
                상품 관리
              </button>

              <button
                onClick={() => {
                  setActiveTab('contents');
                  setViewMode('list');
                  setSearchParams({ tab: 'contents', view: 'list' }, { replace: false });
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'contents'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                콘텐츠 관리
              </button>

              <button
                onClick={() => {
                  setActiveTab('users');
                  setViewMode('list');
                  setSearchParams({ tab: 'users', view: 'list' }, { replace: false });
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4" />
                사용자 관리
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Product Management */}
          {activeTab === 'products' && (
            <>
              <ProductList onCreateClick={handleCreateClick} onEditClick={handleEditProductClick} />
            </>
          )}

          {/* Content Management */}
          {activeTab === 'contents' && (
            <>
              <ContentList onCreateClick={handleCreateClick} onEditClick={handleEditContentClick} />
            </>
          )}

          {/* Users Management */}
          {activeTab === 'users' && <UsersList />}
        </main>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;
