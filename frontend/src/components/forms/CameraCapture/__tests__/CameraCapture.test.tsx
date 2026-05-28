import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraCapture } from '../CameraCapture';

// Mock MediaStream and related APIs
const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn(), kind: 'video' }]),
  getVideoTracks: vi.fn(() => [{ stop: vi.fn(), kind: 'video' }]),
};

const mockGetUserMedia = vi.fn();

describe('CameraCapture', () => {
  const mockOnCapture = vi.fn();
  const mockOnClose = vi.fn();

  // Suppress console errors
  const originalError = console.error;

  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      if (args[0]?.includes?.('Camera access error')) {
        return;
      }
      originalError(...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock canvas methods
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(new Blob(['mock-image'], { type: 'image/jpeg' }));
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

    // Mock video element play
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    // happy-dom doesn't implement HTMLMediaElement.srcObject; assigning
    // throws and the component's try/catch falls into the error branch.
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      get: vi.fn(),
      set: vi.fn(),
    });

    // Set up getUserMedia mock
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    // Clean up mocks
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render camera interface', () => {
      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      // Check for loading text
      expect(screen.getByText('Preparing camera...')).toBeInTheDocument();
    });
  });

  describe('camera permission', () => {
    it('should request camera permission on mount', async () => {
      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      });
    });

    it('should handle camera permission denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Camera access permission is required.')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      });
    });

    it('should retry camera access when retry button clicked', async () => {
      const user = userEvent.setup();
      mockGetUserMedia
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(mockMediaStream);

      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Camera access permission is required.')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: 'Try Again' });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('camera capture', () => {
    it('should capture photo when capture button clicked', async () => {
      const user = userEvent.setup();

      // Mock successful camera initialization
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);

      await act(async () => {
        render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);
      });

      // Wait for camera to initialize and capture button to appear
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      // Since the camera permission was granted, wait for capture button
      await waitFor(
        () => {
          const captureButton = screen.queryByRole('button', { name: 'Capture' });
          expect(captureButton).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Find and click capture button
      const captureButton = screen.getByRole('button', { name: 'Capture' });

      await act(async () => {
        await user.click(captureButton);
      });

      await waitFor(() => {
        expect(mockOnCapture).toHaveBeenCalledWith(expect.any(File));
      });

      const capturedFile = mockOnCapture.mock.calls[0][0];
      expect(capturedFile.name).toMatch(/photo_\d+\.jpg/);
      expect(capturedFile.type).toBe('image/jpeg');
    });

    it('should show capture controls when camera is ready', async () => {
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);

      await act(async () => {
        render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Capture' })).toBeInTheDocument();
      });
    });
  });

  describe('interface controls', () => {
    it('should close when close button clicked', async () => {
      const user = userEvent.setup();

      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should stop camera stream when closing', async () => {
      const user = userEvent.setup();
      const mockStop = vi.fn();
      const mockStreamWithStop = {
        ...mockMediaStream,
        getTracks: vi.fn(() => [{ stop: mockStop }]),
      };

      mockGetUserMedia.mockResolvedValue(mockStreamWithStop);

      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      // Wait for camera to start
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      // Close the camera
      const closeButton = screen.getByRole('button', { name: 'Close' });
      await user.click(closeButton);

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-label', 'Close');
    });

    it('should have proper video attributes', () => {
      render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      // Find video element by tag name
      const video = document.querySelector('video') as HTMLVideoElement;
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('muted');
      expect(video).toHaveAttribute('playsInline');
    });
  });

  describe('cleanup', () => {
    it('should stop camera stream on unmount', async () => {
      const mockStop = vi.fn();
      const mockStreamWithStop = {
        ...mockMediaStream,
        getTracks: vi.fn(() => [{ stop: mockStop }]),
      };

      mockGetUserMedia.mockResolvedValue(mockStreamWithStop);

      const { unmount } = render(<CameraCapture onCapture={mockOnCapture} onClose={mockOnClose} />);

      // Wait for camera to start
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      // Unmount component
      unmount();

      expect(mockStop).toHaveBeenCalled();
    });
  });
});
