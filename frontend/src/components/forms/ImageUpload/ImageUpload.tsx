import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { createImagePreview, revokeImagePreview } from '@/utils/helpers';
import { validateImageFile } from '@/utils/validators';
import { VALIDATION_MESSAGES } from '@/utils/constants';
import { ImageProcessor } from '@/utils/imageProcessor';
import { CameraCapture } from '../CameraCapture';
import { isMediaStreamSupported } from '@/utils/camera';
import { trackEvent } from '@/utils/analytics';
import { validateImageClientSide, isClientValidationAvailable } from '@/utils/clientImageValidator';
import { getImageAnalysisErrorInfo } from '@/utils/imageAnalysisErrors';

interface ImageUploadProps {
  onUpload: (file: File, preview: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export const ImageUpload = ({
  onUpload,
  onError,
  disabled = false,
  className,
}: ImageUploadProps): JSX.Element => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [supportsMediaStream, setSupportsMediaStream] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsValidating(true);
      setValidationWarnings([]); // Clear previous warnings

      try {
        // Basic file validation first
        const validation = validateImageFile(file);

        if (!validation.isValid) {
          onError(VALIDATION_MESSAGES[validation.error as keyof typeof VALIDATION_MESSAGES]);
          return;
        }

        // Track validation start
        trackEvent('image_validation_start', {
          file_size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          file_type: file.type,
          validation_method: 'client_side',
        });

        // Client-side validation with face detection (if available)
        if (isClientValidationAvailable()) {
          try {
            console.log('Starting client-side image validation...');
            const clientValidation = await validateImageClientSide(file);
            console.log('Client validation result:', clientValidation);

            if (!clientValidation.isValid && clientValidation.errorType) {
              const errorInfo = getImageAnalysisErrorInfo(clientValidation.errorType);

              // Track validation failure
              trackEvent('image_validation_failed', {
                error_type: clientValidation.errorType,
                face_count: clientValidation.details.faceCount,
                validation_method: 'client_side',
              });

              onError(`${errorInfo.title}: ${errorInfo.message}`);
              return;
            }

            // Show warnings if any
            if (clientValidation.details.warnings.length > 0) {
              console.warn('Image validation warnings:', clientValidation.details.warnings);
              setValidationWarnings(clientValidation.details.warnings);
            }

            // Track successful validation
            trackEvent('image_validation_success', {
              face_count: clientValidation.details.faceCount,
              brightness: clientValidation.details.imageQuality.brightness,
              contrast: clientValidation.details.imageQuality.contrast,
              sharpness: clientValidation.details.imageQuality.sharpness,
              validation_method: 'client_side',
            });
          } catch (validationError) {
            console.warn('Client-side validation failed, continuing:', validationError);
            // Continue with processing even if client validation fails
          }
        }

        let processedFile = file;

        // Process image (HEIC conversion and compression)
        try {
          console.log('Processing image:', file.name, file.type, file.size);
          processedFile = await ImageProcessor.processImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.9,
            format: 'jpeg',
          });
          console.log(
            'Image processed:',
            processedFile.name,
            processedFile.type,
            processedFile.size,
          );
        } catch (processingError) {
          console.warn('Image processing failed, using original:', processingError);
          // Continue with original file if processing fails
        }

        // Create preview
        const previewUrl = createImagePreview(processedFile);

        setPreview(previewUrl);
        onUpload(processedFile, previewUrl);
      } catch (error) {
        console.error('File handling error:', error);
        onError('An error occurred while processing the image.');
      } finally {
        setIsValidating(false);
      }
    },
    [onUpload, onError],
  );

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    if (!disabled && !isValidating) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isValidating) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleButtonClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleRemove = (): void => {
    if (preview) {
      revokeImagePreview(preview);
      setPreview(null);
      setValidationWarnings([]); // Clear warnings when removing image
    }
  };

  const handleCameraClick = (e: React.MouseEvent): void => {
    e.stopPropagation();

    // Track camera button click
    trackEvent('button_click', {
      button_name: 'image_upload_camera',
      page: 'upload',
      action: 'open_camera',
      method: supportsMediaStream ? 'media_stream' : 'file_input',
      user_flow_step: 'camera_selection',
    });

    if (supportsMediaStream) {
      setShowCamera(true);
    } else {
      // Fallback to file input with camera capture
      cameraInputRef.current?.click();
    }
  };

  // Check MediaStream support on mount
  useEffect(() => {
    setSupportsMediaStream(isMediaStreamSupported());
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Hidden camera input for fallback */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {!preview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-3xl p-12 transition-all min-h-[280px]',
            'flex flex-col items-center justify-center text-center',
            'bg-gradient-to-b from-gray-50/50 to-gray-100/50',
            isDragging ? 'scale-105 shadow-2xl' : '',
            disabled || isValidating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          )}
          onClick={!disabled && !isValidating ? handleButtonClick : undefined}
        >
          {isValidating ? (
            /* Validation Loading State */
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-gradient-to-br from-primary-600 to-primary-700 shadow-xl">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-lg font-medium text-gray-800 mb-1">Validating image...</p>
              <p className="text-sm text-gray-500 mb-6">
                Checking image quality and detecting faces
              </p>
            </>
          ) : (
            /* Normal Upload State */
            <>
              {/* Camera Icon */}
              <div
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center mb-4',
                  'bg-gradient-to-br from-primary-600 to-primary-700',
                  'shadow-xl transform transition-transform',
                  isDragging ? 'scale-110' : '',
                )}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-white drop-shadow-md"
                >
                  <path
                    d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>

              <p className="text-lg font-medium text-gray-800 mb-1">
                {isDragging ? 'Drop your photo' : 'Add your photo'}
              </p>
              <p className="text-sm text-gray-500 mb-6">Tap to choose or drag here</p>
            </>
          )}

          {/* Simplified Mobile Buttons - Hidden during validation */}
          {!isValidating && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCameraClick}
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-full text-sm font-bold shadow-lg hover:shadow-xl hover:from-primary-700 hover:to-primary-800 transform hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
                disabled={disabled || isValidating}
              >
                📷 Camera
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();

                  // Track gallery button click
                  trackEvent('button_click', {
                    button_name: 'image_upload_gallery',
                    page: 'upload',
                    action: 'open_gallery',
                    user_flow_step: 'gallery_selection',
                  });

                  handleButtonClick();
                }}
                className="px-6 py-3 bg-gradient-to-r from-secondary-400 to-secondary-500 text-white rounded-full text-sm font-bold shadow-lg hover:shadow-xl hover:from-secondary-500 hover:to-secondary-600 transform hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
                disabled={disabled || isValidating}
              >
                🖼️ Gallery
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 shadow-xl">
          <img
            src={preview}
            alt="Your photo"
            className="w-full h-auto max-h-80 object-cover"
            onError={(e) => {
              // Fallback for failed image loads
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallbackDiv = document.createElement('div');
              fallbackDiv.className = 'flex items-center justify-center h-96 bg-gray-100';
              fallbackDiv.innerHTML = '<p class="text-gray-500">HEIC file preview</p>';
              target.parentElement?.appendChild(fallbackDiv);
            }}
          />
          <button
            type="button"
            onClick={() => {
              // Track remove image button click
              trackEvent('button_click', {
                button_name: 'image_upload_remove',
                page: 'upload',
                action: 'remove_image',
                user_flow_step: 'image_removed',
              });

              handleRemove();
            }}
            className="absolute top-3 right-3 w-10 h-10 bg-black/20 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-black/30 transition-colors"
            aria-label="Remove"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && preview && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                📸 Photo Quality Suggestions
              </h4>
              <ul className="space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-start space-x-2">
                    <span className="text-yellow-600 flex-shrink-0 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-yellow-600 mt-2">
                💡 For more accurate analysis, consider improving these aspects. Your current photo
                can still be analyzed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={(file) => {
            setShowCamera(false);
            handleFile(file);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};
