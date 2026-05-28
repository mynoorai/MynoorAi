import type { JSX } from 'react';

interface CameraLoadingStateProps {
  visible: boolean;
  scaleFactor: number;
}

/**
 * Full-bleed dark overlay with a spinner shown while the camera stream is
 * starting up (no error, not yet initialized, no preview).
 */
const CameraLoadingState = ({
  visible,
  scaleFactor,
}: CameraLoadingStateProps): JSX.Element | null => {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        backgroundColor: '#1F2937',
        zIndex: 10,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: 'white',
        }}
      >
        <svg
          className="animate-spin"
          style={{
            width: `${32 * scaleFactor}px`,
            height: `${32 * scaleFactor}px`,
            margin: `0 auto ${16 * scaleFactor}px`,
          }}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p
          style={{
            fontSize: `${14 * scaleFactor}px`,
            margin: 0,
          }}
        >
          Starting camera...
        </p>
      </div>
    </div>
  );
};

export default CameraLoadingState;
