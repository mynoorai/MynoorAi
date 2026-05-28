import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button, Input, Card } from '@/components/ui';
import { PageLayout } from '@/components/layout';
import { trackEvent, trackError, trackEngagement } from '@/utils/analytics';
import { Lock } from 'lucide-react';

const ADMIN_ROLES = ['admin', 'content_manager'];

const AdminLoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const {
    adminLogin,
    logout,
    isAuthenticated,
    user,
    isLoading,
    error: authError,
    clearError,
  } = useAuthStore();
  const isAdminSession = useAuthStore((s) => s.isAdminSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const hasAdminRole = isAuthenticated && user && ADMIN_ROLES.includes(user.role);
  const navigatedRef = useRef(false);

  useEffect(() => {
    // 자동 리디렉션은 관리자 세션 플래그가 있을 때에만 수행
    if (hasAdminRole && isAdminSession && !navigatedRef.current) {
      navigatedRef.current = true;
      navigate('/admin/dashboard', { replace: true });
    } else if (isAuthenticated && user && !hasAdminRole) {
      setError('관리자 권한이 없습니다.');
    }
  }, [hasAdminRole, isAdminSession, isAuthenticated, navigate, user]);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    clearError();

    trackEvent('admin_login_attempt', {
      method: 'password',
      email,
      user_flow_step: 'admin_login_submitted',
    });
    trackEngagement('admin_login', 'login_attempt');

    try {
      await adminLogin(email, password);
      // Navigate immediately after successful login to avoid flicker/loops
      navigatedRef.current = true;
      navigate('/admin/dashboard', { replace: true });
      trackEvent('admin_login_success', {
        user_flow_step: 'admin_login_successful',
        role: useAuthStore.getState().user?.role || 'unknown',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '로그인에 실패했습니다. 다시 시도하세요.';
      trackError('admin_login_error', message, 'admin_login');
      trackEvent('admin_login_failed', {
        failure_reason: 'invalid_credentials',
        email,
        message,
      });
      setError(message);
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">관리자 로그인</h1>
            <p className="text-gray-600 mt-2">관리자 계정으로 로그인하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="이메일"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              fullWidth
            />

            <Input
              type="password"
              label="비밀번호"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              fullWidth
              error={error}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={!email || !password || isLoading}
              loading={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              접근 권한이 필요하면 시스템 관리자에게 문의하세요.
            </p>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default AdminLoginPage;
