// Removed unused imports - constants are used in validators.ts now

/**
 * Compresses and resizes image with progressive compression
 * @param file - Image file to compress
 * @param maxWidth - Maximum width (default: 800 for better performance)
 * @param maxHeight - Maximum height (default: 800 for better performance)
 * @param quality - Compression quality (0-1, default: 0.7 for smaller files)
 * @returns Promise<File> - Compressed image file
 */
export const compressImage = async (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7,
): Promise<File> => {
  // Skip compression for HEIC files (they should be converted first)
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    // HEIC file passed to compress function - should be converted first
    return file;
  }

  // Progressive compression based on file size
  const fileSizeMB = file.size / (1024 * 1024);

  // Adjust compression parameters based on file size
  if (fileSizeMB > 5) {
    maxWidth = 600;
    maxHeight = 600;
    quality = 0.6;
  } else if (fileSizeMB > 3) {
    maxWidth = 700;
    maxHeight = 700;
    quality = 0.65;
  } else if (fileSizeMB > 2) {
    maxWidth = 800;
    maxHeight = 800;
    quality = 0.7;
  }

  console.log(
    `Compressing image: ${file.name} (${fileSizeMB.toFixed(2)}MB) to ${maxWidth}x${maxHeight} @ ${quality} quality`,
  );

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const compressedSizeMB = compressedFile.size / (1024 * 1024);
            console.log(
              `Compression complete: ${fileSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`,
            );

            resolve(compressedFile);
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
  });
};

/**
 * Creates image preview URL
 * @param file - Image file
 * @returns Preview URL
 */
export const createImagePreview = (file: File): string => {
  try {
    return URL.createObjectURL(file);
  } catch (error) {
    // Return a fallback for unsupported formats
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (fileExtension === 'heic' || fileExtension === 'heif') {
      // Return a placeholder for HEIC files
      return `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" fill="#6b7280">HEIC</text></svg>')}`;
    }
    throw error;
  }
};

/**
 * Cleans up image preview URL
 * @param url - Preview URL to revoke
 */
export const revokeImagePreview = (url: string): void => {
  URL.revokeObjectURL(url);
};

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Debounce function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Generates a unique session ID
 * @returns Unique session ID
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Checks if the device is mobile
 * @returns boolean indicating if device is mobile
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Handles native share or fallback to clipboard
 * @param data - Share data
 * @returns Promise<void>
 */
export const shareOrCopy = async (data: {
  title: string;
  text: string;
  url: string;
}): Promise<void> => {
  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch (error) {
      // User cancelled share
      if (error instanceof Error && error.name !== 'AbortError') {
        throw error;
      }
    }
  } else {
    // Fallback to clipboard
    await navigator.clipboard.writeText(data.url);
  }
};
