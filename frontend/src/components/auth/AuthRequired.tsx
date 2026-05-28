import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Sparkles, ShieldCheck, Heart } from 'lucide-react';
import { IOSModal, IOSPrimaryButton, IOSSecondaryButton } from '@/components/ios';
import { trackEvent } from '@/utils/analytics';

interface AuthRequiredProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export const AuthRequired: React.FC<AuthRequiredProps> = ({
  isOpen,
  onClose,
  feature = 'this feature',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (): void => {
    trackEvent('auth_required_action', {
      action: 'navigate_to_login',
      feature,
      from_path: location.pathname,
    });
    navigate('/login', { state: { from: location } });
    onClose();
  };

  const handleSignup = (): void => {
    trackEvent('auth_required_action', {
      action: 'navigate_to_signup',
      feature,
      from_path: location.pathname,
    });
    navigate('/signup', { state: { from: location } });
    onClose();
  };

  return (
    <IOSModal open={isOpen} onClose={onClose}>
      <div className="px-6 pt-5 pb-6">
        <div
          className="mx-auto w-14 h-14 rounded-[16px] flex items-center justify-center text-white mb-4"
          style={{ background: 'linear-gradient(135deg,#FF8FA3,#7FA1FF)' }}
        >
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-center text-[22px] leading-[28px] font-bold text-[#1C1C1E]">
          Sign in to continue
        </h3>
        <p className="text-center text-[15px] text-[#8E8E93] mt-1.5">
          Please sign in to use {feature}.
        </p>

        <ul className="bg-[#F2F2F7] rounded-[14px] p-4 mt-5 space-y-2.5">
          {[
            { icon: <Sparkles className="w-4 h-4 text-[#FF9500]" />, text: 'Save your personal color result' },
            { icon: <Heart className="w-4 h-4 text-[#FF3B30]" />, text: 'Save & curate favorite items' },
            { icon: <ShieldCheck className="w-4 h-4 text-[#34C759]" />, text: 'Private & secure cloud sync' },
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-[2px]">{b.icon}</span>
              <span className="text-[14px] text-[#1C1C1E]">{b.text}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-2.5 mt-5">
          <IOSPrimaryButton tone="gradient" onClick={handleLogin}>Sign In</IOSPrimaryButton>
          <IOSSecondaryButton onClick={handleSignup}>Create Account</IOSSecondaryButton>
          <button
            onClick={onClose}
            className="w-full text-center text-[15px] text-[#8E8E93] py-2 min-h-0"
            style={{ minHeight: 32 }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </IOSModal>
  );
};
