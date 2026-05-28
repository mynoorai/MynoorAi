import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUpload } from '../ImageUpload';

// Mock dependencies
vi.mock('@/utils/camera', () => ({
  isMediaStreamSupported: vi.fn(() => true),
}));

vi.mock('@/utils/imageConverter', () => ({
  isHEICSupported: vi.fn(() => false),
  convertHEICToJPEG: vi.fn((file) => Promise.resolve(file)),
  createHEICFallbackPreview: vi.fn(() => 'data:image/svg+xml;base64,test'),
}));

vi.mock('@/utils/helpers', () => ({
  createImagePreview: vi.fn((file) => `preview-${file.name}`),
  revokeImagePreview: vi.fn(),
}));

// Mock validators so we can drive validation outcomes deterministically
vi.mock('@/utils/validators', () => ({
  validateImageFile: vi.fn((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: 'FILE_TOO_LARGE' };
    }
    return { isValid: true };
  }),
}));

vi.mock('@/utils/constants', () => ({
  VALIDATION_MESSAGES: {
    FILE_TOO_LARGE: 'File size must be less than 5MB',
    FILE_INVALID_TYPE: 'Invalid file type',
    FILE_REQUIRED: 'File is required',
  },
}));

// ImageProcessor pulls in heavy dependencies; stub it to pass the file through.
// For HEIC files we route through convertHEICToJPEG mock so that the test
// for HEIC handling can observe the converter being called.
vi.mock('@/utils/imageProcessor', () => ({
  ImageProcessor: {
    processImage: vi.fn(async (file: File) => {
      const isHEIC = /heic|heif/i.test(file.type) || /\.heic|\.heif$/i.test(file.name);
      if (isHEIC) {
        const { convertHEICToJPEG } = await import('@/utils/imageConverter');
        return convertHEICToJPEG(file);
      }
      return file;
    }),
  },
}));

vi.mock('@/utils/clientImageValidator', () => ({
  isClientValidationAvailable: vi.fn(() => false),
  validateImageClientSide: vi.fn(),
}));

vi.mock('@/utils/imageAnalysisErrors', () => ({
  getImageAnalysisErrorInfo: vi.fn(() => ({ title: 'Error', message: 'msg' })),
}));

vi.mock('@/utils/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Simple mock for CameraCapture to avoid MediaStream errors.
// Note: the path must match ImageUpload.tsx's `'../CameraCapture'` import,
// which resolves to `forms/CameraCapture` from this test file -> '../../CameraCapture'.
// The factory must be self-contained because vi.mock is hoisted above imports.
vi.mock('../../CameraCapture', () => ({
  CameraCapture: ({
    onCapture,
    onClose,
  }: {
    onCapture: (file: File) => void;
    onClose: () => void;
  }) => (
    <div data-testid="camera-capture">
      <button onClick={() => onCapture(new File([''], 'camera.jpg', { type: 'image/jpeg' }))}>
        Capture
      </button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('ImageUpload', () => {
  const mockOnUpload = vi.fn();
  const mockOnError = vi.fn();

  // Suppress console errors from MediaStream in tests
  const originalError = console.error;

  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      if (
        args[0]?.includes?.('Camera access error') ||
        args[0]?.includes?.('Not available in test environment')
      ) {
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
  });

  describe('rendering', () => {
    it('should render upload area', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      expect(screen.getByText('Add your photo')).toBeInTheDocument();
      expect(screen.getByText('Tap to choose or drag here')).toBeInTheDocument();
    });

    it('should render gallery and camera buttons', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      expect(screen.getByRole('button', { name: /Gallery/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Camera/ })).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <ImageUpload onUpload={mockOnUpload} onError={mockOnError} className="custom-class" />,
      );

      const container = screen.getByText('Add your photo').closest('.w-full');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('file selection', () => {
    it('should handle file selection via input', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      // Find the file input by its accept attribute
      const input = document.querySelector(
        'input[accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"]',
      ) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(
          file,
          expect.stringContaining('preview-test.jpg'),
        );
      });
    });

    it('should validate file before upload', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      // Create a large file (over 5MB)
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const input = document.querySelector(
        'input[accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"]',
      ) as HTMLInputElement;

      await user.upload(input, largeFile);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
        expect(mockOnUpload).not.toHaveBeenCalled();
      });
    });

    it('should handle HEIC files', async () => {
      const { convertHEICToJPEG } = await import('@/utils/imageConverter');
      const mockConvert = convertHEICToJPEG as ReturnType<typeof vi.fn>;
      const convertedFile = new File(['converted'], 'test.jpg', { type: 'image/jpeg' });
      mockConvert.mockResolvedValueOnce(convertedFile);

      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const heicFile = new File(['heic'], 'test.heic', { type: 'image/heic' });
      const input = document.querySelector(
        'input[accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"]',
      ) as HTMLInputElement;

      await user.upload(input, heicFile);

      await waitFor(() => {
        expect(mockConvert).toHaveBeenCalledWith(heicFile);
        expect(mockOnUpload).toHaveBeenCalledWith(convertedFile, expect.any(String));
      });
    });
  });

  describe('drag and drop', () => {
    it('should handle drag over', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const dropZone = screen.getByText('Add your photo').closest('div')!;

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [] },
      });

      // Current implementation marks drag-over state via scale/shadow classes.
      expect(dropZone.className).toMatch(/scale-105/);
    });

    it('should handle drag leave', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const dropZone = screen.getByText('Add your photo').closest('div')!;

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [] },
      });

      fireEvent.dragLeave(dropZone);

      expect(dropZone).not.toHaveClass('border-primary');
    });

    it('should handle file drop', async () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dropZone = screen.getByText('Add your photo').closest('div')!;

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(file, expect.any(String));
      });
    });

    it('should not handle drop when disabled', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} disabled />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dropZone = screen.getByText('Add your photo').closest('div')!;

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(mockOnUpload).not.toHaveBeenCalled();
    });
  });

  describe('preview', () => {
    it('should show preview after file selection', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector(
        'input[accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"]',
      ) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByAltText('Your photo')).toBeInTheDocument();
      });
    });

    it('should allow removing preview', async () => {
      const { revokeImagePreview } = await import('@/utils/helpers');
      const user = userEvent.setup();

      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector(
        'input[accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"]',
      ) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByAltText('Your photo')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      await user.click(removeButton);

      expect(revokeImagePreview).toHaveBeenCalled();
      expect(screen.queryByAltText('Your photo')).not.toBeInTheDocument();
    });
  });

  describe('camera mode', () => {
    it('should open camera when camera button is clicked', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const cameraButton = screen.getByRole('button', { name: /Camera/ });
      await user.click(cameraButton);

      expect(screen.getByTestId('camera-capture')).toBeInTheDocument();
    });

    it('should handle camera capture', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const cameraButton = screen.getByRole('button', { name: /Camera/ });
      await user.click(cameraButton);

      const captureButton = screen.getByText('Capture');
      await user.click(captureButton);

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'camera.jpg' }),
          expect.any(String),
        );
      });
    });

    it('should close camera on cancel', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const cameraButton = screen.getByRole('button', { name: /Camera/ });
      await user.click(cameraButton);

      expect(screen.getByTestId('camera-capture')).toBeInTheDocument();

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(screen.queryByTestId('camera-capture')).not.toBeInTheDocument();
    });

    it('should fallback to file input when MediaStream not supported', async () => {
      const { isMediaStreamSupported } = await import('@/utils/camera');
      (isMediaStreamSupported as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

      const user = userEvent.setup();
      const { rerender } = render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      // Force re-render to pick up the mock change
      rerender(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const cameraButton = screen.getByRole('button', { name: /Camera/ });

      // Click should trigger the hidden camera input
      await user.click(cameraButton);

      // Camera capture component should not be shown
      expect(screen.queryByTestId('camera-capture')).not.toBeInTheDocument();
    });
  });

  describe('state management', () => {
    it('should disable interactions when disabled prop is true', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} disabled />);

      const galleryButton = screen.getByRole('button', { name: /Gallery/ });
      const cameraButton = screen.getByRole('button', { name: /Camera/ });

      expect(galleryButton).toBeDisabled();
      expect(cameraButton).toBeDisabled();
    });

    it('should show correct text during drag over', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const dropZone = screen.getByText('Add your photo').closest('div')!;

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [] },
      });

      expect(screen.getByText('Drop your photo')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper file input attributes', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = document.querySelector(
        'input[accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
    });

    it('should have proper camera input attributes', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const cameraInput = document.querySelector('input[capture="user"]') as HTMLInputElement;

      expect(cameraInput).toBeInTheDocument();
      expect(cameraInput).toHaveAttribute('accept', 'image/*');
      expect(cameraInput).toHaveAttribute('type', 'file');
    });
  });
});
