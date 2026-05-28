/**
 * Browser Detection Utilities
 * Detect Safari, iOS, and specific browser versions for compatibility handling
 * Enhanced with device-specific profiling and in-app browser detection
 */

import { getDeviceProfile, canRunMediaPipe } from './deviceProfile';
import { detectInAppBrowser, getInAppBrowserSettings } from './inAppBrowserDetection';

/**
 * Detect if running on iOS
 */
export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ); // iPad Pro detection
}

/**
 * Detect if running on Safari
 */
export function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isSafariBrowser = /safari/.test(ua) && !/chrome/.test(ua) && !/android/.test(ua);
  return isSafariBrowser;
}

/**
 * Get iOS version
 */
export function getIOSVersion(): number | null {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get Safari version
 */
export function getSafariVersion(): number | null {
  const match = navigator.userAgent.match(/Version\/(\d+)\.(\d+)/);
  if (match && isSafari()) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Check if Canvas.toBlob is supported
 */
export function hasCanvasToBlobSupport(): boolean {
  const canvas = document.createElement('canvas');
  return typeof canvas.toBlob === 'function';
}

/**
 * Check if WebGL is available and stable
 */
export function isWebGLStable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * Detect if device has low memory (iOS specific)
 */
export function isLowMemoryDevice(): boolean {
  // @ts-expect-error - navigator.deviceMemory is not in standard types
  const deviceMemory = navigator.deviceMemory;

  if (deviceMemory && deviceMemory < 4) {
    return true;
  }

  // For iOS devices without deviceMemory API
  if (isIOS()) {
    const ua = navigator.userAgent;
    // Older iPhone models with less memory
    if (/iPhone (6|7|8|SE)/.test(ua) && !/Plus/.test(ua)) {
      return true;
    }
  }

  return false;
}

/**
 * Get recommended settings for current browser/device
 */
export interface BrowserOptimizationSettings {
  useWebGL: boolean;
  maxFaces: number;
  refineLandmarks: boolean;
  enableMemoryOptimization: boolean;
  requireHTTPS: boolean;
  showCompatibilityWarning: boolean;
}

export function getBrowserOptimizationSettings(): BrowserOptimizationSettings {
  // First check if we're in an in-app browser
  const inAppInfo = detectInAppBrowser();

  if (inAppInfo.isInAppBrowser) {
    const inAppSettings = getInAppBrowserSettings(inAppInfo);

    console.log('📱 In-app browser detected, applying special optimizations:', {
      browser: inAppInfo.browserName,
      platform: inAppInfo.platform,
      version: inAppInfo.version,
      limitations: inAppInfo.limitations,
    });

    // Convert in-app browser settings to our format
    return {
      useWebGL: inAppSettings.faceMeshBackend === 'webgl',
      maxFaces: inAppSettings.faceMeshMaxFaces,
      refineLandmarks: inAppSettings.faceMeshRefineLandmarks,
      enableMemoryOptimization: true, // Always optimize memory in in-app browsers
      requireHTTPS: true, // In-app browsers often require HTTPS
      showCompatibilityWarning: inAppSettings.showCompatibilityWarning,
    };
  }

  // Get device-specific profile for regular browsers
  const deviceProfile = getDeviceProfile();
  const deviceSettings = deviceProfile.recommendedSettings;

  console.log('🎯 Device-specific optimization:', {
    device: deviceProfile.model,
    category: deviceProfile.category,
    ram: `${deviceProfile.ram}GB`,
    settings: deviceSettings,
  });

  const settings: BrowserOptimizationSettings = {
    useWebGL: deviceSettings.useWebGL,
    maxFaces: deviceSettings.faceMeshMaxFaces,
    refineLandmarks: deviceSettings.faceMeshRefineLandmarks,
    enableMemoryOptimization: deviceProfile.category === 'low' || deviceProfile.category === 'mid',
    requireHTTPS: false,
    showCompatibilityWarning: false,
  };

  // iOS Safari specific requirements
  if (isIOS() && isSafari()) {
    settings.requireHTTPS = true;

    const iosVersion = getIOSVersion();
    if (iosVersion && iosVersion < 14) {
      settings.showCompatibilityWarning = true;
    }

    // Extra memory optimization for older iPhones
    if (deviceProfile.ram <= 2) {
      settings.enableMemoryOptimization = true;
      settings.refineLandmarks = false;
    }
  }

  // Safari desktop optimizations
  if (isSafari() && !isIOS()) {
    const safariVersion = getSafariVersion();
    if (safariVersion && safariVersion < 15) {
      settings.enableMemoryOptimization = true;
    }
  }

  // Override WebGL if not stable
  if (!isWebGLStable()) {
    settings.useWebGL = false;
    console.warn('⚠️ WebGL not stable, falling back to CPU');
  }

  // Check if device can run MediaPipe at all
  if (!canRunMediaPipe(deviceProfile)) {
    console.warn('⚠️ Device may struggle with MediaPipe:', deviceProfile.model);
    settings.showCompatibilityWarning = true;
  }

  return settings;
}

/**
 * Canvas.toBlob polyfill for Safari
 */
export function installCanvasToBlobPolyfill(): void {
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function (
        callback: (blob: Blob | null) => void,
        type = 'image/png',
        quality?: number,
      ) {
        const canvas = this as HTMLCanvasElement;
        setTimeout(() => {
          const dataURL = canvas.toDataURL(type, quality);
          const data = dataURL.split(',')[1];
          const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];

          // Convert base64 to binary
          const byteString = atob(data);
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const uint8Array = new Uint8Array(arrayBuffer);

          for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
          }

          const blob = new Blob([uint8Array], { type: mimeString });
          callback(blob);
        });
      },
    });
  }
}

// Auto-install polyfill on module load
if (typeof window !== 'undefined') {
  installCanvasToBlobPolyfill();
}
