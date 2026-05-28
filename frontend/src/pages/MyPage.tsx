import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout';
import { PersonalColorSection, ViewedProducts, SavedProducts } from '@/components/mypage';
import { User, Settings } from 'lucide-react';
import { useAppStore } from '@/store';
import { Text } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { trackEvent } from '@/utils/analytics';

const MyPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { instagramId, sessionId } = useAppStore();
  const { isAuthenticated, user, checkAuth } = useAuthStore();

  // 사용자 정보가 메모리에 없으면 로드(페이지 새로고침 등)
  useEffect(() => {
    if (isAuthenticated && !user) {
      void checkAuth();
    }
  }, [isAuthenticated, user, checkAuth]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      trackEvent('mypage_auth_redirect', {
        from: 'mypage',
        reason: 'not_authenticated',
      });
      navigate('/login', { state: { from: { pathname: '/mypage' } } });
    }
  }, [isAuthenticated, navigate]);

  return (
    <PageLayout showDefaultHeader>
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Page</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{user?.email || user?.fullName || 'Guest'}</span>
            </div>
            {sessionId && (
              <div className="flex items-center gap-1">
                <Settings className="w-4 h-4" />
                <span>Session: {sessionId.slice(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Personal Color Section */}
          <PersonalColorSection />

          {/* Products Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recently Viewed Products */}
            <ViewedProducts />

            {/* Saved Products */}
            <SavedProducts />
          </div>

          {/* Additional Features (Future) */}
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <Text variant="body-sm" color="gray" mb="2">
              More features are coming soon!
            </Text>
            <div className="flex justify-center gap-4">
              <Text variant="caption" color="gray">
                • Order History
              </Text>
              <Text variant="caption" color="gray">
                • Review Management
              </Text>
              <Text variant="caption" color="gray">
                • Notification Settings
              </Text>
              <Text variant="caption" color="gray">
                • Profile Editing
              </Text>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default MyPage;
