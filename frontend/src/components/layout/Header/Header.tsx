import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';
import { trackEvent } from '@/utils/analytics';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui';
import { User, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';

import logoSignature from '@/assets/My Noor_시그니처.png';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode[];
  className?: string;
}

export const Header = ({
  title,
  showBack = false,
  onBack,
  actions,
  className,
}: HeaderProps): JSX.Element => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleBack = (): void => {
    // Track back button click
    trackEvent('button_click', {
      button_name: 'back',
      page: 'header',
    });

    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      trackEvent('logout_click', {
        page: 'header',
        user_email: user?.email,
      });

      await logout();
      toast.success('Signed out successfully');
      navigate('/');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm safe-top border-b border-gray-100',
        className,
      )}
    >
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 tablet:h-16">
          {/* Left section */}
          <div className="flex items-center">
            {showBack && (
              <button
                onClick={handleBack}
                className="mr-3 p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Go back"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gray-700"
                >
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            {/* 기본적으로 텍스트 대신 브랜드 로고를 노출하여 일관성을 유지 */}
            {title ? (
              <h1 className="text-h4 tablet:text-h3 font-bold text-primary">{title}</h1>
            ) : (
              <img
                src={logoSignature}
                alt="MyNoor 시그니처 로고"
                className="h-9 tablet:h-10 w-auto object-contain"
              />
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-2">
            {actions && actions.length > 0 && actions}

            {/* Auth buttons */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  to={ROUTES.MYPAGE}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <User className="w-5 h-5 text-gray-700" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="secondary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
