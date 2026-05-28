import type { JSX } from 'react';

interface CameraErrorStateProps {
  cameraError: string | null;
  scaleFactor: number;
  onUploadFallback: () => void;
}

/**
 * Dark error state shown when getUserMedia fails or is denied.
 * Falls back to a file input via the parent-provided handler.
 */
const CameraErrorState = ({
  cameraError,
  scaleFactor,
  onUploadFallback,
}: CameraErrorStateProps): JSX.Element | null => {
  if (!cameraError) {
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
          padding: `0 ${24 * scaleFactor}px`,
        }}
      >
        <svg
          style={{
            width: `${48 * scaleFactor}px`,
            height: `${48 * scaleFactor}px`,
            margin: `0 auto ${16 * scaleFactor}px`,
            color: '#9CA3AF',
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
        </svg>
        <h3
          style={{
            fontSize: `${18 * scaleFactor}px`,
            fontWeight: 600,
            marginBottom: `${8 * scaleFactor}px`,
          }}
        >
          Camera Not Available
        </h3>
        <p
          style={{
            fontSize: `${14 * scaleFactor}px`,
            color: '#D1D5DB',
            marginBottom: `${16 * scaleFactor}px`,
          }}
        >
          {cameraError.includes('denied')
            ? 'Camera access was blocked. Please allow camera in your browser settings (click the lock icon in the URL bar).'
            : cameraError}
        </p>
        <button
          onClick={onUploadFallback}
          style={{
            backgroundColor: 'white',
            color: '#1F2937',
            padding: `${8 * scaleFactor}px ${16 * scaleFactor}px`,
            borderRadius: `${8 * scaleFactor}px`,
            border: 'none',
            cursor: 'pointer',
            fontSize: `${14 * scaleFactor}px`,
            fontWeight: 500,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          Upload Photo Instead
        </button>
      </div>
    </div>
  );
};

export default CameraErrorState;
