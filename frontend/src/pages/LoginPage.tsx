import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { trackEvent } from '@/utils/analytics';
import { LANDING_URL } from '@/utils/constants';
import {
  iosPage,
  iosCard,
  IOSLargeTitle,
  IOSField,
  IOSPrimaryButton,
  IOSSecondaryButton,
} from '@/components/ios';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<LoginFormData>();

  useEffect(() => {
    if (isAuthenticated) window.location.assign(LANDING_URL);
  }, [isAuthenticated]);

  useEffect(() => {
    trackEvent('login_page_view', { page: 'login', referrer: document.referrer });
  }, []);

  useEffect(() => () => { clearError(); }, [clearError]);
  useEffect(() => { setFocus('email'); }, [setFocus]);

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      trackEvent('login_attempt', { email: data.email, page: 'login' });
      await login(data.email, data.password);
      trackEvent('login_success', { email: data.email, page: 'login' });
      toast.success('Signed in');
      window.location.assign(LANDING_URL);
    } catch (e: unknown) {
      trackEvent('login_failed', {
        email: data.email,
        error: e instanceof Error ? e.message : String(e),
        page: 'login',
      });
      const msg =
        (typeof e === 'object' && e && 'response' in e &&
          (e as { response?: { data?: { message?: string } } }).response?.data?.message) ||
        (e instanceof Error ? e.message : undefined) ||
        'Failed to sign in.';
      toast.error(msg);
    }
  };

  return (
    <div className={iosPage + ' pb-10'}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <button
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
          className="flex items-center gap-1 text-[#007AFF] text-[17px] font-medium min-h-0"
          style={{ minHeight: 32 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <IOSLargeTitle title="Sign In" subtitle="Welcome back to MyNoor AI" />

      <div className="px-4 mt-2">
        <form onSubmit={handleSubmit(onSubmit)} className={`${iosCard} p-5 space-y-4`}>
          <IOSField
            type="email"
            label="Email"
            placeholder="your@email.com"
            autoComplete="username"
            icon={<Mail className="w-4 h-4" />}
            {...register('email', {
              required: 'Enter your email.',
              pattern: { value: /^\S+@\S+$/i, message: 'Invalid email.' },
            })}
            error={errors.email?.message}
          />

          <IOSField
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            icon={<Lock className="w-4 h-4" />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-[#8E8E93] min-h-0"
                style={{ minHeight: 24 }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register('password', {
              required: 'Enter your password.',
              minLength: { value: 6, message: 'Min 6 characters.' },
            })}
            error={errors.password?.message}
          />

          {error && (
            <div className="text-[13px] text-[#FF3B30] bg-[#FFE5E3] rounded-[12px] px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Link to="/find-account" className="text-[#007AFF] text-[14px] font-medium">Forgot email?</Link>
            <Link to="/forgot-password" className="text-[#007AFF] text-[14px] font-medium">Forgot password?</Link>
          </div>

          <IOSPrimaryButton tone="gradient" type="submit" loading={isLoading}>Sign In</IOSPrimaryButton>
        </form>
      </div>

      <div className="px-4 mt-4">
        <div className={`${iosCard} p-4 text-center`}>
          <p className="text-[14px] text-[#8E8E93] mb-3">New to MyNoor AI?</p>
          <Link to="/signup">
            <IOSSecondaryButton>Create Account</IOSSecondaryButton>
          </Link>
        </div>
      </div>

      <div className="px-4 mt-4">
        <Link to="/">
          <button
            className="w-full text-center text-[15px] text-[#8E8E93] py-3"
            style={{ minHeight: 36 }}
          >
            Continue without signing in
          </button>
        </Link>
        <p className="text-center text-[12px] text-[#C7C7CC] mt-1">
          Personal color analysis works without an account.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
