import type { JSX } from 'react';

interface FaceValidationOverlayProps {
  visible: boolean;
  scaleFactor: number;
}

/**
 * Modal overlay shown while validating that the captured photo contains a face.
 * Sits above the preview image with a blurred background and spinner.
 */
const FaceValidationOverlay = ({
  visible,
  scaleFactor,
}: FaceValidationOverlayProps): JSX.Element | null => {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        borderRadius: `${10 * scaleFactor}px`,
        zIndex: 40,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: `${12 * scaleFactor}px`,
          padding: `${16 * scaleFactor}px`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${12 * scaleFactor}px`,
          }}
        >
          <div
            className="animate-spin"
            style={{
              width: `${32 * scaleFactor}px`,
              height: `${32 * scaleFactor}px`,
              border: `${2 * scaleFactor}px solid #9333EA`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
            }}
          ></div>
          <div>
            <p
              style={{
                fontSize: `${14 * scaleFactor}px`,
                fontWeight: 600,
                color: '#1F2937',
                margin: 0,
              }}
            >
              Looking for your face
            </p>
            <p
              style={{
                fontSize: `${12 * scaleFactor}px`,
                color: '#6B7280',
                margin: 0,
              }}
            >
              Just a moment...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceValidationOverlay;
