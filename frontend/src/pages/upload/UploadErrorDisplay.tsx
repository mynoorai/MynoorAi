import type { JSX } from 'react';

interface UploadErrorDisplayProps {
  error: string | null;
  scaleFactor: number;
}

/**
 * Renders an inline error message banner below the photo area.
 * Returns null when there is no error to display.
 */
const UploadErrorDisplay = ({
  error,
  scaleFactor,
}: UploadErrorDisplayProps): JSX.Element | null => {
  if (!error) {
    return null;
  }

  return (
    <div
      style={{
        marginBottom: `${16 * scaleFactor}px`,
        padding: `${12 * scaleFactor}px`,
        backgroundColor: '#FEF2F2',
        border: `${1 * scaleFactor}px solid #FECACA`,
        borderRadius: `${12 * scaleFactor}px`,
        maxWidth: `${320 * scaleFactor}px`,
        width: '90%',
      }}
    >
      <p
        style={{
          color: '#DC2626',
          fontSize: `${14 * scaleFactor}px`,
          textAlign: 'center',
          margin: 0,
        }}
      >
        {error}
      </p>
    </div>
  );
};

export default UploadErrorDisplay;
