import type { JSX } from 'react';

interface UploadDebugPanelProps {
  sessionId: string | null;
  isCameraActive: boolean;
  cameraInitialized: boolean;
  cameraError: string | null;
  stream: MediaStream | null;
  onRetryCamera: () => void;
}

/**
 * Debug Panel - Shown in production for diagnosing camera issues.
 * Visible only on vercel.app or pca-hijab hostnames.
 * Initially hidden via display:none; toggled by console command:
 *   document.getElementById('camera-debug-panel').style.display = 'block'
 */
const UploadDebugPanel = ({
  sessionId,
  isCameraActive,
  cameraInitialized,
  cameraError,
  stream,
  onRetryCamera,
}: UploadDebugPanelProps): JSX.Element | null => {
  const isVisibleHostname =
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('pca-hijab');

  if (!isVisibleHostname) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '10px',
        fontFamily: 'monospace',
        maxWidth: '300px',
        maxHeight: '400px',
        overflow: 'auto',
        zIndex: 9999,
        display: 'none', // Initially hidden, will be shown via console command
      }}
      id="camera-debug-panel"
    >
      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>🔍 Camera Debug Info</div>
      <div>
        <strong>URL:</strong> {window.location.href}
      </div>
      <div>
        <strong>Protocol:</strong> {window.location.protocol}
      </div>
      <div>
        <strong>Secure Context:</strong> {String(window.isSecureContext)}
      </div>
      <div>
        <strong>Session ID:</strong> {sessionId || 'None'}
      </div>
      <div>
        <strong>Camera Active:</strong> {String(isCameraActive)}
      </div>
      <div>
        <strong>Camera Initialized:</strong> {String(cameraInitialized)}
      </div>
      <div>
        <strong>Camera Error:</strong> {cameraError || 'None'}
      </div>
      <div>
        <strong>Stream:</strong> {stream ? 'Active' : 'None'}
      </div>
      <div>
        <strong>MediaDevices:</strong> {navigator.mediaDevices ? 'Available' : 'Not Available'}
      </div>
      <div>
        <strong>getUserMedia:</strong>{' '}
        {navigator.mediaDevices?.getUserMedia ? 'Available' : 'Not Available'}
      </div>
      <div>
        <strong>Browser:</strong> {navigator.userAgent.slice(0, 50)}...
      </div>
      <div style={{ marginTop: '10px' }}>
        <button
          onClick={onRetryCamera}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Retry Camera
        </button>
        <button
          onClick={() => {
            const panel = document.getElementById('camera-debug-panel');
            if (panel) panel.style.display = 'none';
          }}
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginLeft: '5px',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default UploadDebugPanel;
