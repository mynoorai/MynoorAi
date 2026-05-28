import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, User, Check, ArrowLeft } from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { ConfirmModal } from '@/components/ui';
import { trackEvent } from '@/utils/analytics';
import { ROUTES, LANDING_URL } from '@/utils/constants';
import {
  iosPage,
  iosCard,
  IOSLargeTitle,
  IOSField,
  IOSPrimaryButton,
  IOSSecondaryButton,
} from '@/components/ios';

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const PasswordStrengthIndicator = ({ password }: { password: string }): JSX.Element | null => {
  if (!password) return null;
  const score = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) s++;
    if (password.match(/[0-9]/)) s++;
    if (password.match(/[^a-zA-Z0-9]/)) s++;
    return s;
  })();
  const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759'];
  const labels = ['Weak', 'Moderate', 'Strong', 'Very strong'];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ background: i < score ? colors[score - 1] : '#E5E5EA' }}
          />
        ))}
      </div>
      <p className="text-[12px] text-[#8E8E93] mt-1">
        Strength: <span className="font-medium text-[#1C1C1E]">{labels[score - 1] ?? '—'}</span>
      </p>
    </div>
  );
};

const SignupPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAccountExistsModal, setShowAccountExistsModal] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setFocus,
  } = useForm<SignupFormData>();

  const password = watch('password');

  useEffect(() => {
    if (isAuthenticated) window.location.assign(LANDING_URL);
  }, [isAuthenticated]);

  useEffect(() => {
    trackEvent('signup_page_view', { page: 'signup', referrer: document.referrer });
  }, []);

  useEffect(() => () => { clearError(); }, [clearError]);
  useEffect(() => { setFocus('fullName'); }, [setFocus]);

  const onSubmit = async (data: SignupFormData): Promise<void> => {
    try {
      trackEvent('signup_attempt', { email: data.email, page: 'signup' });
      await signup(data.email, data.password, data.fullName);
      trackEvent('signup_success', { email: data.email, page: 'signup' });
      toast.success('Account created');
      window.location.assign(LANDING_URL);
    } catch (e: unknown) {
      trackEvent('signup_failed', {
        email: data.email,
        error: e instanceof Error ? e.message : String(e),
        page: 'signup',
      });
      const msg =
        (typeof e === 'object' && e && 'response' in e &&
          (e as { response?: { data?: { message?: string } } }).response?.data?.message) ||
        (e instanceof Error ? e.message : undefined) ||
        'Failed to sign up.';
      toast.error(msg);
      const status =
        typeof e === 'object' && e && 'response' in e &&
        (e as { response?: { status?: number } }).response?.status;
      if (status === 409) setShowAccountExistsModal(true);
    }
  };

  return (
    <div className={iosPage + ' pb-10'}>
      <div className="px-4 pt-3 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[#007AFF] text-[17px] font-medium min-h-0"
          style={{ minHeight: 32 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <IOSLargeTitle title="Create Account" subtitle="Join MyNoor AI" />

      <div className="px-4 mt-2">
        <form onSubmit={handleSubmit(onSubmit)} className={`${iosCard} p-5 space-y-4`}>
          <IOSField
            type="text"
            label="Full name"
            placeholder="Jane Doe"
            autoComplete="name"
            icon={<User className="w-4 h-4" />}
            {...register('fullName', {
              required: 'Enter your name.',
              minLength: { value: 2, message: 'Min 2 characters.' },
            })}
            error={errors.fullName?.message}
          />
          <IOSField
            type="email"
            label="Email"
            placeholder="your@email.com"
            autoComplete="email"
            icon={<Mail className="w-4 h-4" />}
            {...register('email', {
              required: 'Enter your email.',
              pattern: { value: /^\S+@\S+$/i, message: 'Invalid email.' },
            })}
            error={errors.email?.message}
          />
          <div>
            <IOSField
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="••••••••"
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-[#8E8E93] min-h-0"
                  style={{ minHeight: 24 }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register('password', {
                required: 'Enter a password.',
                minLength: { value: 8, message: 'Min 8 characters.' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                  message: 'Need upper + lower + number + special.',
                },
              })}
              error={errors.password?.message}
            />
            <PasswordStrengthIndicator password={password || ''} />
          </div>
          <IOSField
            type={showConfirmPassword ? 'text' : 'password'}
            label="Confirm password"
            placeholder="••••••••"
            autoComplete="new-password"
            icon={<Lock className="w-4 h-4" />}
            suffix={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="text-[#8E8E93] min-h-0"
                style={{ minHeight: 24 }}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register('confirmPassword', {
              required: 'Re-enter your password.',
              validate: (v) => v === password || 'Passwords do not match.',
            })}
            error={errors.confirmPassword?.message}
          />

          <label className="flex items-start gap-2 text-[13px] text-[#1C1C1E]">
            <input
              type="checkbox"
              className="mt-[3px] rounded border-[#C7C7CC]"
              {...register('agreeToTerms', { required: 'Please agree to the terms.' })}
            />
            <span>
              I agree to the{' '}
              <Link to={ROUTES.TERMS_OF_SERVICE} className="text-[#007AFF]">Terms</Link>
              {' '}and{' '}
              <Link to={ROUTES.PRIVACY_POLICY} className="text-[#007AFF]">Privacy</Link>.
            </span>
          </label>
          {errors.agreeToTerms && (
            <p className="text-[13px] text-[#FF3B30] -mt-2">{errors.agreeToTerms.message}</p>
          )}

          {error && (
            <div className="text-[13px] text-[#FF3B30] bg-[#FFE5E3] rounded-[12px] px-3 py-2">
              {error}
            </div>
          )}

          <IOSPrimaryButton tone="gradient" type="submit" loading={isLoading}>
            Create Account
          </IOSPrimaryButton>
        </form>
      </div>

      <div className="px-4 mt-4">
        <div className={`${iosCard} p-4 text-center`}>
          <p className="text-[14px] text-[#8E8E93] mb-3">Already have an account?</p>
          <Link to="/login">
            <IOSSecondaryButton>Sign In</IOSSecondaryButton>
          </Link>
        </div>
      </div>

      <ul className="px-6 mt-4 space-y-1.5">
        {['Encrypted password', 'Privacy-first', 'Cancel anytime'].map((t) => (
          <li key={t} className="flex items-center gap-2 text-[13px] text-[#8E8E93]">
            <Check className="w-3.5 h-3.5 text-[#34C759]" /> {t}
          </li>
        ))}
      </ul>

      <ConfirmModal
        isOpen={showAccountExistsModal}
        type="info"
        title="Account already exists"
        message="An account with this email already exists. Please sign in instead."
        extra={
          <div className="text-[13px] text-[#8E8E93]">
            Forgot password?{' '}
            <Link
              to="/forgot-password"
              className="text-[#007AFF]"
              onClick={() => setShowAccountExistsModal(false)}
            >
              Reset
            </Link>
          </div>
        }
        confirmText="Go to Sign In"
        cancelText="Close"
        onConfirm={() => {
          setShowAccountExistsModal(false);
          navigate('/login');
        }}
        onCancel={() => setShowAccountExistsModal(false)}
      />
    </div>
  );
};

export default SignupPage;
