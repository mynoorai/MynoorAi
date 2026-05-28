import type { JSX } from 'react';

interface DevCameraTestButtonProps {
  scaleFactor: number;
  onTest: () => void;
}

/**
 * Dev-only floating button (top-left) that runs the camera API test helper.
 * Visible only when `import.meta.env.DEV` is true.
 */
const DevCameraTestButton = ({
  scaleFactor,
  onTest,
}: DevCameraTestButtonProps): JSX.Element | null => {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: `${16 * scaleFactor}px`,
        left: `${16 * scaleFactor}px`,
        zIndex: 50,
      }}
    >
      <button
        onClick={onTest}
        style={{
          backgroundColor: '#2563EB',
          color: 'white',
          padding: `${4 * scaleFactor}px ${12 * scaleFactor}px`,
          borderRadius: `${4 * scaleFactor}px`,
          fontSize: `${12 * scaleFactor}px`,
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1D4ED8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2563EB';
        }}
      >
        🧪 Test Camera API
      </button>
    </div>
  );
};

export default DevCameraTestButton;
