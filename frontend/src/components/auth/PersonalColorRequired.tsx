import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Sparkles, Camera, Check } from 'lucide-react';
import { IOSModal, IOSPrimaryButton, IOSSecondaryButton } from '@/components/ios';
import { ROUTES } from '@/utils/constants';
import { trackEvent } from '@/utils/analytics';
import { useAppStore } from '@/store';
import { SessionAPI } from '@/services/api/session';

interface PersonalColorRequiredProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export const PersonalColorRequired: React.FC<PersonalColorRequiredProps> = ({
  isOpen,
  onClose,
  feature = 'this feature',
}) => {
  const navigate = useNavigate();
  const { sessionId, setSessionData } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleStart = async (): Promise<void> => {
    trackEvent('personal_color_required_action', {
      action: 'start_diagnosis',
      feature,
      from_feature: feature,
    });
    setLoading(true);
    try {
      if (!sessionId) {
        const response = await SessionAPI.createSession();
        setSessionData(response.data.sessionId);
      }
      navigate(ROUTES.DIAGNOSIS);
      onClose();
    } catch (error) {
      console.error('Failed to create session:', error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <IOSModal open={isOpen} onClose={onClose}>
      <div className="px-6 pt-5 pb-6">
        <div
          className="mx-auto w-14 h-14 rounded-[16px] flex items-center justify-center text-white mb-4"
          style={{ background: 'linear-gradient(135deg,#FF8FA3,#FFB199,#7FA1FF)' }}
        >
          <Palette className="w-7 h-7" />
        </div>

        <h3 className="text-center text-[22px] leading-[28px] font-bold text-[#1C1C1E]">
          Personal color first
        </h3>
        <p className="text-center text-[15px] text-[#8E8E93] mt-1.5">
          Complete your personal color analysis to unlock {feature}.
        </p>

        <div className="bg-[#F2F2F7] rounded-[14px] p-4 mt-5">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-4 h-4 text-[#AF52DE]" />
            <span className="text-[14px] font-semibold text-[#1C1C1E]">AI personal color analysis</span>
          </div>
          <ul className="space-y-2">
            {[
              'Results in about 30 seconds',
              'Spring · Summer · Autumn · Winter',
              'Personalized hijab & beauty picks',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] text-[#1C1C1E]">
                <Check className="w-4 h-4 text-[#34C759] mt-[2px]" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2.5 mt-5">
          <IOSPrimaryButton tone="gradient" onClick={handleStart} loading={loading}>
            <span className="inline-flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {loading ? 'Preparing…' : 'Start analysis'}
            </span>
          </IOSPrimaryButton>
          <IOSSecondaryButton onClick={onClose}>Later</IOSSecondaryButton>
        </div>
      </div>
    </IOSModal>
  );
};
