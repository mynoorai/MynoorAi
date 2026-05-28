/**
 * In-App Browser Detection and Optimization
 * Detects and optimizes for Instagram, Facebook, and other in-app browsers
 *
 * Technical Architecture:
 * - iOS: WKWebView (Safari WebKit engine)
 * - Android: Android System WebView (Chrome-based)
 */

interface InAppBrowserInfo {
  isInAppBrowser: boolean;
  browserName:
    | 'instagram'
    | 'facebook'
    | 'messenger'
    | 'twitter'
    | 'linkedin'
    | 'tiktok'
    | 'kakaotalk'
    | 'line'
    | 'wechat'
    | 'snapchat'
    | 'unknown'
    | null;
  platform: 'ios' | 'android' | 'unknown';
  version?: string;
  deviceInfo?: {
    model?: string;
    osVersion?: string;
    screenResolution?: string;
  };
  limitations: {
    localStorage: boolean;
    indexedDB: boolean;
    webGL: boolean;
    camera: boolean;
    cookies: boolean;
    performance: boolean;
  };
}

/**
 * Parse Instagram User-Agent for detailed information
 * Example iOS: Instagram 250.0.0.21.109 (iPhone12,1; iOS 15_0; en_US; en-US; scale=2.00; 828x1792; 302553456)
 * Example Android: Instagram 250.0.0.21.109 Android (30/11; 420dpi; 1080x2220; samsung; SM-G991B)
 */
function parseInstagramUA(ua: string): Partial<InAppBrowserInfo['deviceInfo']> {
  const info: Partial<InAppBrowserInfo['deviceInfo']> = {};

  // Extract Instagram version
  const versionMatch = ua.match(/Instagram\s+([\d.]+)/);
  if (versionMatch) {
    info.osVersion = versionMatch[1];
  }

  // iOS specific parsing
  if (ua.includes('iPhone') || ua.includes('iPad')) {
    // Extract device model (e.g., iPhone12,1)
    const modelMatch = ua.match(/\((iPhone[\d,]+|iPad[\d,]+);/);
    if (modelMatch) {
      info.model = modelMatch[1];
    }

    // Extract iOS version
    const iosMatch = ua.match(/iOS\s+([\d_]+)/);
    if (iosMatch) {
      info.osVersion = `iOS ${iosMatch[1].replace(/_/g, '.')}`;
    }

    // Extract screen resolution
    const resMatch = ua.match(/(\d+x\d+)/);
    if (resMatch) {
      info.screenResolution = resMatch[1];
    }
  }

  // Android specific parsing
  if (ua.includes('Android')) {
    // Extract Android version
    const androidMatch = ua.match(/Android\s+\((\d+)/);
    if (androidMatch) {
      info.osVersion = `Android ${androidMatch[1]}`;
    }

    // Extract device model
    const modelMatch = ua.match(/;\s+([^;]+)\s*\)/);
    if (modelMatch) {
      info.model = modelMatch[1].trim();
    }

    // Extract screen resolution
    const resMatch = ua.match(/(\d+x\d+)/);
    if (resMatch) {
      info.screenResolution = resMatch[1];
    }
  }

  return info;
}

/**
 * Detect specific in-app browser
 */
export function detectInAppBrowser(): InAppBrowserInfo {
  const ua = navigator.userAgent;
  const platform = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'unknown';

  const info: InAppBrowserInfo = {
    isInAppBrowser: false,
    browserName: null,
    platform,
    limitations: {
      localStorage: false,
      indexedDB: false,
      webGL: false,
      camera: false,
      cookies: false,
      performance: false,
    },
  };

  // Instagram detection (most important for this app)
  if (ua.includes('Instagram')) {
    info.isInAppBrowser = true;
    info.browserName = 'instagram';
    info.deviceInfo = parseInstagramUA(ua);

    // Extract Instagram app version
    const versionMatch = ua.match(/Instagram\s+([\d.]+)/);
    if (versionMatch) {
      info.version = versionMatch[1];
    }

    // Instagram-specific limitations
    info.limitations = {
      localStorage: platform === 'ios', // iOS WKWebView has localStorage issues
      indexedDB: platform === 'ios',
      webGL: false, // Often unstable in Instagram
      camera: true, // Requires special handling
      cookies: true, // Isolated from external browser
      performance: true, // 10-20% slower than native browser
    };
  }
  // Facebook App Browser
  else if (ua.includes('FBAN') || ua.includes('FBAV')) {
    info.isInAppBrowser = true;
    info.browserName = 'facebook';

    const versionMatch = ua.match(/FBAV\/([\d.]+)/);
    if (versionMatch) {
      info.version = versionMatch[1];
    }

    info.limitations = {
      localStorage: platform === 'ios',
      indexedDB: platform === 'ios',
      webGL: false,
      camera: true,
      cookies: true,
      performance: true,
    };
  }
  // Facebook Messenger
  else if (ua.includes('MessengerForiOS') || ua.includes('Messenger') || ua.includes('MESSENGER')) {
    info.isInAppBrowser = true;
    info.browserName = 'messenger';

    info.limitations = {
      localStorage: platform === 'ios',
      indexedDB: platform === 'ios',
      webGL: false,
      camera: true,
      cookies: true,
      performance: true,
    };
  }
  // Twitter
  else if (ua.includes('Twitter')) {
    info.isInAppBrowser = true;
    info.browserName = 'twitter';

    info.limitations = {
      localStorage: false,
      indexedDB: false,
      webGL: false,
      camera: true,
      cookies: true,
      performance: false,
    };
  }
  // LinkedIn
  else if (ua.includes('LinkedInApp')) {
    info.isInAppBrowser = true;
    info.browserName = 'linkedin';

    info.limitations = {
      localStorage: false,
      indexedDB: false,
      webGL: false,
      camera: true,
      cookies: true,
      performance: false,
    };
  }
  // TikTok
  else if (ua.includes('TikTok') || ua.includes('Musical.ly')) {
    info.isInAppBrowser = true;
    info.browserName = 'tiktok';

    info.limitations = {
      localStorage: platform === 'ios',
      indexedDB: platform === 'ios',
      webGL: false,
      camera: true,
      cookies: true,
      performance: true,
    };
  }
  // KakaoTalk
  else if (ua.includes('KAKAOTALK')) {
    info.isInAppBrowser = true;
    info.browserName = 'kakaotalk';

    info.limitations = {
      localStorage: platform === 'ios',
      indexedDB: false,
      webGL: false,
      camera: true,
      cookies: true,
      performance: false,
    };
  }
  // LINE
  else if (ua.includes('Line/')) {
    info.isInAppBrowser = true;
    info.browserName = 'line';

    info.limitations = {
      localStorage: platform === 'ios',
      indexedDB: false,
      webGL: false,
      camera: true,
      cookies: true,
      performance: false,
    };
  }
  // WeChat
  else if (ua.includes('MicroMessenger')) {
    info.isInAppBrowser = true;
    info.browserName = 'wechat';

    info.limitations = {
      localStorage: true, // WeChat has serious storage issues
      indexedDB: true,
      webGL: false,
      camera: true,
      cookies: true,
      performance: true,
    };
  }
  // Snapchat
  else if (ua.includes('Snapchat')) {
    info.isInAppBrowser = true;
    info.browserName = 'snapchat';

    info.limitations = {
      localStorage: platform === 'ios',
      indexedDB: platform === 'ios',
      webGL: false,
      camera: true,
      cookies: true,
      performance: true,
    };
  }
  // Generic WebView detection (fallback)
  else if (platform === 'ios' && ua.includes('AppleWebKit') && !ua.includes('Safari')) {
    // iOS app using WKWebView but not Safari
    info.isInAppBrowser = true;
    info.browserName = 'unknown';

    info.limitations = {
      localStorage: true,
      indexedDB: true,
      webGL: false,
      camera: true,
      cookies: true,
      performance: false,
    };
  } else if (platform === 'android' && ua.includes('wv')) {
    // Android WebView indicator
    info.isInAppBrowser = true;
    info.browserName = 'unknown';

    info.limitations = {
      localStorage: false,
      indexedDB: false,
      webGL: true, // Depends on Android version
      camera: true,
      cookies: true,
      performance: false,
    };
  }

  // Log detection result
  console.log('🔍 [In-App Browser Detection]:', {
    detected: info.isInAppBrowser,
    browser: info.browserName,
    platform: info.platform,
    version: info.version,
    deviceInfo: info.deviceInfo,
    limitations: info.limitations,
    userAgent: ua,
  });

  return info;
}

/**
 * Get optimized settings for in-app browsers
 */
export interface InAppBrowserSettings {
  // Camera settings
  cameraResolution: { width: number; height: number };
  frameRate: number;

  // MediaPipe settings
  useMediaPipe: boolean;
  faceMeshBackend: 'webgl' | 'cpu';
  faceMeshMaxFaces: number;
  faceMeshRefineLandmarks: boolean;

  // Performance settings
  detectionInterval: number; // ms between face detections
  memoryLimit: number; // MB

  // Storage settings
  useLocalStorage: boolean;
  useIndexedDB: boolean;
  useSessionStorage: boolean;

  // UI settings
  showPerformanceWarning: boolean;
  showCompatibilityWarning: boolean;
  simplifiedUI: boolean;
}

export function getInAppBrowserSettings(info?: InAppBrowserInfo): InAppBrowserSettings {
  const browserInfo = info || detectInAppBrowser();

  // Default settings for regular browsers
  let settings: InAppBrowserSettings = {
    cameraResolution: { width: 1280, height: 720 },
    frameRate: 30,
    useMediaPipe: true,
    faceMeshBackend: 'webgl',
    faceMeshMaxFaces: 1,
    faceMeshRefineLandmarks: true,
    detectionInterval: 200,
    memoryLimit: 300,
    useLocalStorage: true,
    useIndexedDB: true,
    useSessionStorage: true,
    showPerformanceWarning: false,
    showCompatibilityWarning: false,
    simplifiedUI: false,
  };

  // Apply in-app browser specific optimizations
  if (browserInfo.isInAppBrowser) {
    console.log(`📱 [In-App Browser] Applying ${browserInfo.browserName} optimizations`);

    // Base optimizations for all in-app browsers
    settings = {
      ...settings,
      cameraResolution: { width: 640, height: 480 }, // Lower resolution
      frameRate: 20, // Lower frame rate
      faceMeshMaxFaces: 1,
      faceMeshRefineLandmarks: false, // Disable for performance
      detectionInterval: 300, // Less frequent detection
      memoryLimit: 150, // Lower memory limit
      showCompatibilityWarning: true,
    };

    // Instagram-specific optimizations (most restrictive)
    if (browserInfo.browserName === 'instagram') {
      settings = {
        ...settings,
        cameraResolution: { width: 480, height: 360 }, // Even lower for Instagram
        frameRate: 15,
        faceMeshBackend: 'cpu', // CPU more stable in Instagram
        detectionInterval: 400, // Even less frequent
        memoryLimit: 100, // Very conservative memory usage
        useLocalStorage: !browserInfo.limitations.localStorage,
        useIndexedDB: false, // Disable IndexedDB in Instagram
        useSessionStorage: true, // Use session storage as fallback
        simplifiedUI: true, // Simplified UI for better performance
      };

      // Extra restrictions for older Instagram versions
      if (browserInfo.version) {
        const majorVersion = parseInt(browserInfo.version.split('.')[0]);
        if (majorVersion < 200) {
          console.warn('⚠️ [Instagram] Old version detected, applying extra restrictions');
          settings.useMediaPipe = false; // Disable MediaPipe for very old versions
          settings.showPerformanceWarning = true;
        }
      }

      // iOS Instagram specific
      if (browserInfo.platform === 'ios') {
        settings.faceMeshBackend = 'cpu'; // Force CPU on iOS Instagram
        settings.memoryLimit = 80; // Even stricter on iOS
      }
    }

    // Facebook/Messenger optimizations
    else if (browserInfo.browserName === 'facebook' || browserInfo.browserName === 'messenger') {
      settings = {
        ...settings,
        cameraResolution: { width: 640, height: 480 },
        frameRate: 20,
        faceMeshBackend: browserInfo.platform === 'ios' ? 'cpu' : 'webgl',
        memoryLimit: 120,
        useIndexedDB: !browserInfo.limitations.indexedDB,
      };
    }

    // TikTok/Snapchat (video-heavy apps, need more conservative settings)
    else if (browserInfo.browserName === 'tiktok' || browserInfo.browserName === 'snapchat') {
      settings = {
        ...settings,
        cameraResolution: { width: 480, height: 360 },
        frameRate: 15,
        faceMeshBackend: 'cpu',
        detectionInterval: 500,
        memoryLimit: 80,
        simplifiedUI: true,
      };
    }

    // WeChat (most restrictive due to storage issues)
    else if (browserInfo.browserName === 'wechat') {
      settings = {
        ...settings,
        cameraResolution: { width: 480, height: 360 },
        frameRate: 15,
        faceMeshBackend: 'cpu',
        useMediaPipe: false, // Disable MediaPipe in WeChat
        useLocalStorage: false,
        useIndexedDB: false,
        useSessionStorage: true,
        showPerformanceWarning: true,
        simplifiedUI: true,
      };
    }
  }

  console.log('⚙️ [In-App Browser Settings]:', settings);

  return settings;
}

/**
 * Check if camera permission needs special handling
 */
export function needsCameraPermissionWorkaround(): boolean {
  const info = detectInAppBrowser();

  // Instagram and Facebook require special camera permission handling
  if (
    info.browserName === 'instagram' ||
    info.browserName === 'facebook' ||
    info.browserName === 'messenger'
  ) {
    // iOS 14.5+ requires additional permission
    if (info.platform === 'ios') {
      const iosMatch = navigator.userAgent.match(/OS (\d+)/);
      if (iosMatch) {
        const iosVersion = parseInt(iosMatch[1]);
        if (iosVersion >= 14) {
          console.log(
            '📸 [Camera] iOS 14.5+ Instagram/Facebook requires special permission handling',
          );
          return true;
        }
      }
    }

    // Android also requires special handling for these apps
    if (info.platform === 'android') {
      console.log('📸 [Camera] Android Instagram/Facebook requires permission workaround');
      return true;
    }
  }

  return false;
}

/**
 * Get camera constraints optimized for in-app browsers
 */
export function getInAppCameraConstraints(
  facingMode: 'user' | 'environment' = 'user',
): MediaTrackConstraints {
  const settings = getInAppBrowserSettings();

  const constraints: MediaTrackConstraints = {
    facingMode,
    width: { ideal: settings.cameraResolution.width },
    height: { ideal: settings.cameraResolution.height },
    frameRate: { max: settings.frameRate },
  };

  // Instagram specific constraints
  const info = detectInAppBrowser();
  if (info.browserName === 'instagram') {
    // Instagram works better with exact constraints on iOS
    if (info.platform === 'ios') {
      constraints.width = { exact: settings.cameraResolution.width };
      constraints.height = { exact: settings.cameraResolution.height };
    }

    // Disable advanced constraints that might fail
    delete (constraints as any).aspectRatio;
    delete (constraints as any).resizeMode;
  }

  console.log('📹 [In-App Camera] Constraints:', constraints);

  return constraints;
}

/**
 * Storage fallback for in-app browsers with localStorage/IndexedDB issues
 */
class InAppStorageFallback {
  private memoryStorage: Map<string, string> = new Map();
  private settings = getInAppBrowserSettings();

  async setItem(key: string, value: string): Promise<void> {
    // Try localStorage first
    if (this.settings.useLocalStorage) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn('localStorage failed, falling back:', e);
      }
    }

    // Try sessionStorage
    if (this.settings.useSessionStorage) {
      try {
        sessionStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn('sessionStorage failed, falling back:', e);
      }
    }

    // Fallback to memory
    this.memoryStorage.set(key, value);
    console.log('📦 [Storage] Using in-memory fallback for:', key);
  }

  async getItem(key: string): Promise<string | null> {
    // Try localStorage first
    if (this.settings.useLocalStorage) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) return value;
      } catch {
        // Continue to fallback
      }
    }

    // Try sessionStorage
    if (this.settings.useSessionStorage) {
      try {
        const value = sessionStorage.getItem(key);
        if (value !== null) return value;
      } catch {
        // Continue to fallback
      }
    }

    // Check memory storage
    return this.memoryStorage.get(key) || null;
  }

  async removeItem(key: string): Promise<void> {
    // Remove from all storages
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }

    try {
      sessionStorage.removeItem(key);
    } catch {
      /* noop */
    }

    this.memoryStorage.delete(key);
  }
}

export const inAppStorage = new InAppStorageFallback();

/**
 * Show warning message for in-app browser limitations
 */
export function getInAppBrowserWarning(): string | null {
  const info = detectInAppBrowser();

  if (!info.isInAppBrowser) return null;

  const browserName = info.browserName || 'in-app browser';
  const capitalizedName = browserName.charAt(0).toUpperCase() + browserName.slice(1);

  // Instagram-specific warning
  if (info.browserName === 'instagram') {
    if (info.platform === 'ios') {
      return `Using Instagram browser on iOS. For best experience, tap "..." menu and select "Open in Safari".`;
    } else {
      return `Using Instagram browser. For best experience, tap "..." menu and select "Open in Chrome".`;
    }
  }

  // Facebook/Messenger warning
  if (info.browserName === 'facebook' || info.browserName === 'messenger') {
    return `Using ${capitalizedName} browser. For better performance, open in your default browser.`;
  }

  // WeChat warning (most severe)
  if (info.browserName === 'wechat') {
    return `WeChat browser detected. Some features may not work. Please open in Safari or Chrome.`;
  }

  // Generic in-app browser warning
  if (info.limitations.performance || info.limitations.webGL) {
    return `Using ${capitalizedName} browser. Performance may be limited. Consider opening in your default browser.`;
  }

  return null;
}
