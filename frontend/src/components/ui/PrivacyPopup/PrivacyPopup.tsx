import { cn } from '@/utils/cn';
import { trackEvent } from '@/utils/analytics';

interface PrivacyPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPopup = ({ isOpen, onClose }: PrivacyPopupProps): JSX.Element | null => {
  if (!isOpen) return null;

  return (
    <>
      {/* Glassmorphism Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Minimal Apple-style Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full animate-slide-up',
            'border border-white/20 transform transition-all duration-300',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glass morphism effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/20 rounded-3xl" />

          {/* Content */}
          <div className="relative p-8">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary-light/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path
                  d="M12 2L4 7V11C4 16 7.5 20.3 12 21C16.5 20.3 20 16 20 11V7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12L11 14L15 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-3">
              Your Privacy Matters
            </h2>

            {/* Minimal Description */}
            <p className="text-gray-600 text-center text-sm mb-8 leading-relaxed">
              Photos are analyzed instantly and deleted immediately. We never store your images.
            </p>

            {/* Visual Process - Simplified */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-base">📸</span>
                </div>
                <span className="text-xs text-gray-500">Upload</span>
              </div>

              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                <path
                  d="M9 5L15 12L9 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-base">🎨</span>
                </div>
                <span className="text-xs text-gray-500">Analyze</span>
              </div>

              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                <path
                  d="M9 5L15 12L9 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-base">🗑️</span>
                </div>
                <span className="text-xs text-gray-500">Delete</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => {
                trackEvent('button_click', {
                  button_name: 'privacy_popup_got_it',
                  page: 'privacy_popup',
                  action: 'acknowledge_privacy',
                  user_flow_step: 'privacy_acknowledged',
                });
                onClose();
              }}
              className="w-full bg-gradient-to-r from-primary to-primary-light text-white py-3.5 px-6 rounded-2xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Got it
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              trackEvent('button_click', {
                button_name: 'privacy_popup_close_x',
                page: 'privacy_popup',
                action: 'close_popup',
                user_flow_step: 'privacy_popup_closed',
              });
              onClose();
            }}
            className="absolute top-4 right-4 w-8 h-8 bg-white/50 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/70 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};
