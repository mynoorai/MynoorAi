import type { JSX } from 'react';

interface BrowserWarningBannerProps {
  warning: string | null;
  scaleFactor: number;
  onDismiss: () => void;
}

/**
 * Top fixed banner used to warn the user about in-app/unsupported browsers.
 * Renders nothing when there is no active warning message.
 */
const BrowserWarningBanner = ({
  warning,
  scaleFactor,
  onDismiss,
}: BrowserWarningBannerProps): JSX.Element | null => {
  if (!warning) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF3CD',
        borderBottom: '1px solid #FFE69C',
        padding: `${12 * scaleFactor}px ${16 * scaleFactor}px`,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${8 * scaleFactor}px`,
        fontSize: `${14 * scaleFactor}px`,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        color: '#664D03',
      }}
    >
      <span style={{ fontSize: `${16 * scaleFactor}px` }}>⚠️</span>
      <span style={{ flex: 1, textAlign: 'center' }}>{warning}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: `${18 * scaleFactor}px`,
          cursor: 'pointer',
          padding: `${4 * scaleFactor}px`,
          color: '#664D03',
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default BrowserWarningBanner;
