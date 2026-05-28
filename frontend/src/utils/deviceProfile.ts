import { devLog } from '@/utils/devLog';
/**
 * Advanced Device Profiling System
 * Detects specific phone models and provides optimized settings
 * Based on real-world device capabilities and MediaPipe performance data
 */

interface DeviceProfile {
  model: string;
  category: 'flagship' | 'high' | 'mid' | 'low' | 'unknown';
  ram: number; // GB
  chipset?: string;
  gpu?: string;
  year?: number;
  maxTextureSize?: number;
  recommendedSettings: {
    cameraResolution: { width: number; height: number };
    faceMeshMaxFaces: number;
    faceMeshRefineLandmarks: boolean;
    useWebGL: boolean;
    frameRate: number;
    enableHeavyProcessing: boolean;
    memoryLimit: number; // MB
  };
}

// iPhone Model Database with RAM and performance characteristics
const IPHONE_MODELS: Record<string, Partial<DeviceProfile>> = {
  // 2014-2016 Models (1-2GB RAM) - LOW PERFORMANCE
  'iPhone 6': { ram: 1, category: 'low', chipset: 'A8', year: 2014 },
  'iPhone 6 Plus': { ram: 1, category: 'low', chipset: 'A8', year: 2014 },
  'iPhone 6s': { ram: 2, category: 'low', chipset: 'A9', year: 2015 },
  'iPhone 6s Plus': { ram: 2, category: 'low', chipset: 'A9', year: 2015 },
  'iPhone SE': { ram: 2, category: 'low', chipset: 'A9', year: 2016 },

  // 2016-2017 Models (2-3GB RAM) - MID PERFORMANCE
  'iPhone 7': { ram: 2, category: 'mid', chipset: 'A10', year: 2016 },
  'iPhone 7 Plus': { ram: 3, category: 'mid', chipset: 'A10', year: 2016 },
  'iPhone 8': { ram: 2, category: 'mid', chipset: 'A11', year: 2017 },
  'iPhone 8 Plus': { ram: 3, category: 'mid', chipset: 'A11', year: 2017 },

  // 2017-2019 Models (3-4GB RAM) - HIGH PERFORMANCE
  'iPhone X': { ram: 3, category: 'high', chipset: 'A11', year: 2017 },
  'iPhone XR': { ram: 3, category: 'high', chipset: 'A12', year: 2018 },
  'iPhone XS': { ram: 4, category: 'high', chipset: 'A12', year: 2018 },
  'iPhone XS Max': { ram: 4, category: 'high', chipset: 'A12', year: 2018 },
  'iPhone 11': { ram: 4, category: 'high', chipset: 'A13', year: 2019 },

  // 2019-2021 Models (4-6GB RAM) - HIGH/FLAGSHIP PERFORMANCE
  'iPhone 11 Pro': { ram: 4, category: 'flagship', chipset: 'A13', year: 2019 },
  'iPhone 11 Pro Max': { ram: 4, category: 'flagship', chipset: 'A13', year: 2019 },
  'iPhone SE (2nd generation)': { ram: 3, category: 'mid', chipset: 'A13', year: 2020 },
  'iPhone 12 mini': { ram: 4, category: 'high', chipset: 'A14', year: 2020 },
  'iPhone 12': { ram: 4, category: 'high', chipset: 'A14', year: 2020 },
  'iPhone 12 Pro': { ram: 6, category: 'flagship', chipset: 'A14', year: 2020 },
  'iPhone 12 Pro Max': { ram: 6, category: 'flagship', chipset: 'A14', year: 2020 },

  // 2021-2023 Models (4-6GB RAM) - FLAGSHIP PERFORMANCE
  'iPhone 13 mini': { ram: 4, category: 'high', chipset: 'A15', year: 2021 },
  'iPhone 13': { ram: 4, category: 'high', chipset: 'A15', year: 2021 },
  'iPhone 13 Pro': { ram: 6, category: 'flagship', chipset: 'A15', year: 2021 },
  'iPhone 13 Pro Max': { ram: 6, category: 'flagship', chipset: 'A15', year: 2021 },
  'iPhone SE (3rd generation)': { ram: 4, category: 'mid', chipset: 'A15', year: 2022 },
  'iPhone 14': { ram: 6, category: 'flagship', chipset: 'A15', year: 2022 },
  'iPhone 14 Plus': { ram: 6, category: 'flagship', chipset: 'A15', year: 2022 },
  'iPhone 14 Pro': { ram: 6, category: 'flagship', chipset: 'A16', year: 2022 },
  'iPhone 14 Pro Max': { ram: 6, category: 'flagship', chipset: 'A16', year: 2022 },

  // 2023+ Models (6-8GB RAM) - FLAGSHIP PERFORMANCE
  'iPhone 15': { ram: 6, category: 'flagship', chipset: 'A16', year: 2023 },
  'iPhone 15 Plus': { ram: 6, category: 'flagship', chipset: 'A16', year: 2023 },
  'iPhone 15 Pro': { ram: 8, category: 'flagship', chipset: 'A17 Pro', year: 2023 },
  'iPhone 15 Pro Max': { ram: 8, category: 'flagship', chipset: 'A17 Pro', year: 2023 },
};

// Android Device Patterns (more complex due to variety)
const ANDROID_PATTERNS: Array<{
  pattern: RegExp;
  profile: Partial<DeviceProfile>;
}> = [
  // Samsung Galaxy S Series (Flagship)
  {
    pattern: /Galaxy S2[3-4]/i,
    profile: { category: 'flagship', ram: 12, chipset: 'Snapdragon 8 Gen 2' },
  },
  {
    pattern: /Galaxy S2[1-2]/i,
    profile: { category: 'flagship', ram: 8, chipset: 'Snapdragon 888' },
  },
  { pattern: /Galaxy S20/i, profile: { category: 'flagship', ram: 8, chipset: 'Snapdragon 865' } },
  { pattern: /Galaxy S10/i, profile: { category: 'high', ram: 8, chipset: 'Snapdragon 855' } },
  { pattern: /Galaxy S9/i, profile: { category: 'high', ram: 4, chipset: 'Snapdragon 845' } },
  { pattern: /Galaxy S8/i, profile: { category: 'mid', ram: 4, chipset: 'Snapdragon 835' } },

  // Samsung Galaxy A Series (Mid-range)
  { pattern: /Galaxy A[5-7]\d/i, profile: { category: 'mid', ram: 6 } },
  { pattern: /Galaxy A[3-4]\d/i, profile: { category: 'mid', ram: 4 } },
  { pattern: /Galaxy A[0-2]\d/i, profile: { category: 'low', ram: 3 } },

  // Google Pixel
  { pattern: /Pixel [7-9]/i, profile: { category: 'flagship', ram: 12, chipset: 'Google Tensor' } },
  { pattern: /Pixel 6/i, profile: { category: 'flagship', ram: 8, chipset: 'Google Tensor' } },
  { pattern: /Pixel [4-5]/i, profile: { category: 'high', ram: 6 } },
  { pattern: /Pixel 3/i, profile: { category: 'high', ram: 4 } },
  { pattern: /Pixel [1-2]/i, profile: { category: 'mid', ram: 4 } },

  // Xiaomi/Redmi
  { pattern: /Mi 1[3-4]/i, profile: { category: 'flagship', ram: 12 } },
  { pattern: /Mi 1[1-2]/i, profile: { category: 'flagship', ram: 8 } },
  { pattern: /Redmi Note 1[1-3]/i, profile: { category: 'mid', ram: 6 } },
  { pattern: /Redmi Note [8-9]/i, profile: { category: 'mid', ram: 4 } },
  { pattern: /Redmi \d/i, profile: { category: 'low', ram: 3 } },
  { pattern: /POCO [FX][3-5]/i, profile: { category: 'high', ram: 8 } },

  // OnePlus
  { pattern: /OnePlus 1[0-2]/i, profile: { category: 'flagship', ram: 12 } },
  { pattern: /OnePlus [8-9]/i, profile: { category: 'flagship', ram: 8 } },
  { pattern: /OnePlus [6-7]/i, profile: { category: 'high', ram: 6 } },
  { pattern: /OnePlus Nord/i, profile: { category: 'mid', ram: 6 } },

  // OPPO/Vivo/Realme
  { pattern: /OPPO Find/i, profile: { category: 'flagship', ram: 8 } },
  { pattern: /OPPO Reno/i, profile: { category: 'high', ram: 6 } },
  { pattern: /OPPO A\d/i, profile: { category: 'mid', ram: 4 } },
  { pattern: /Vivo X\d/i, profile: { category: 'high', ram: 8 } },
  { pattern: /Vivo V\d/i, profile: { category: 'mid', ram: 6 } },
  { pattern: /Vivo Y\d/i, profile: { category: 'low', ram: 4 } },
  { pattern: /Realme \d/i, profile: { category: 'mid', ram: 4 } },
  { pattern: /Realme GT/i, profile: { category: 'high', ram: 8 } },
];

/**
 * Detect specific iPhone model from user agent
 */
function detectiPhoneModel(): string | null {
  const ua = navigator.userAgent;

  // First check for specific iPhone model strings
  // iOS 14.2+ includes model in UA
  const modelMatch = ua.match(/iPhone(\d+),(\d+)/);
  if (modelMatch) {
    // Map hardware identifiers to model names
    const hardwareMap: Record<string, string> = {
      '14,3': 'iPhone 13 Pro Max',
      '14,2': 'iPhone 13 Pro',
      '14,5': 'iPhone 13',
      '14,4': 'iPhone 13 mini',
      // iPhone SE (3rd generation) is iPhone14,6
      '14,6': 'iPhone SE (3rd generation)',
      '14,7': 'iPhone 14',
      '14,8': 'iPhone 14 Plus',
      '15,2': 'iPhone 14 Pro',
      '15,3': 'iPhone 14 Pro Max',
      '15,4': 'iPhone 15',
      '15,5': 'iPhone 15 Plus',
      '16,1': 'iPhone 15 Pro',
      '16,2': 'iPhone 15 Pro Max',
      '13,1': 'iPhone 12 mini',
      '13,2': 'iPhone 12',
      '13,3': 'iPhone 12 Pro',
      '13,4': 'iPhone 12 Pro Max',
      '12,8': 'iPhone SE (2nd generation)',
      '12,1': 'iPhone 11',
      '12,3': 'iPhone 11 Pro',
      '12,5': 'iPhone 11 Pro Max',
      '11,2': 'iPhone XS',
      '11,4': 'iPhone XS Max',
      '11,6': 'iPhone XS Max',
      '11,8': 'iPhone XR',
      '10,1': 'iPhone 8',
      '10,2': 'iPhone 8 Plus',
      '10,3': 'iPhone X',
      '10,4': 'iPhone 8',
      '10,5': 'iPhone 8 Plus',
      '10,6': 'iPhone X',
      '9,1': 'iPhone 7',
      '9,2': 'iPhone 7 Plus',
      '9,3': 'iPhone 7',
      '9,4': 'iPhone 7 Plus',
      '8,4': 'iPhone SE',
      '8,1': 'iPhone 6s',
      '8,2': 'iPhone 6s Plus',
      '7,1': 'iPhone 6 Plus',
      '7,2': 'iPhone 6',
    };

    const identifier = `${modelMatch[1]},${modelMatch[2]}`;
    if (hardwareMap[identifier]) {
      return hardwareMap[identifier];
    }
  }

  // Fallback to screen size and feature detection
  const w = window.screen.width;
  const h = window.screen.height;
  const dpr = window.devicePixelRatio;

  // Use screen dimensions to guess model (less accurate)
  if (dpr === 3) {
    if (w === 393 || w === 430) return 'iPhone 15 Pro Max'; // Latest Pro Max
    if (w === 390) return 'iPhone 14 Pro'; // 14/13/12 Pro
    if (w === 428) return 'iPhone 14 Pro Max'; // 14/13/12 Pro Max
    if (w === 375 && h === 812) return 'iPhone X'; // X/XS/11 Pro
    if (w === 414 && h === 896) return 'iPhone XS Max'; // XS Max/11 Pro Max
  }

  if (dpr === 2) {
    if (w === 375 && h === 667) return 'iPhone 8'; // 6/6s/7/8/SE2
    if (w === 414 && h === 736) return 'iPhone 8 Plus'; // 6+/7+/8+
    if (w === 390) return 'iPhone 14'; // 14/13/12
    if (w === 414 && h === 896) return 'iPhone XR'; // XR/11
    if (w === 320 && h === 568) return 'iPhone SE'; // SE/5s
  }

  return null;
}

/**
 * Detect Android device model
 */
function detectAndroidModel(): Partial<DeviceProfile> | null {
  const ua = navigator.userAgent;

  for (const { pattern, profile } of ANDROID_PATTERNS) {
    if (pattern.test(ua)) {
      return profile;
    }
  }

  // Generic Android detection based on common patterns
  if (/Android/i.test(ua)) {
    // Try to extract model from UA
    const modelMatch = ua.match(/Android[^;]*;\s*([^)]+)\)/);
    if (modelMatch) {
      const model = modelMatch[1].trim();
      devLog.log('Detected Android model:', model);

      // Check against patterns again with extracted model
      for (const { pattern, profile } of ANDROID_PATTERNS) {
        if (pattern.test(model)) {
          return profile;
        }
      }
    }

    // Default Android profile based on year
    const androidMatch = ua.match(/Android\s+(\d+)/);
    const androidVersion = androidMatch ? parseInt(androidMatch[1]) : 0;

    if (androidVersion >= 13) return { category: 'high', ram: 6 };
    if (androidVersion >= 11) return { category: 'mid', ram: 4 };
    if (androidVersion >= 9) return { category: 'mid', ram: 3 };
    return { category: 'low', ram: 2 };
  }

  return null;
}

/**
 * Estimate device performance using various metrics
 */
function estimateDevicePerformance(): 'flagship' | 'high' | 'mid' | 'low' {
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;

  // Check device memory (Chrome only)
  // @ts-expect-error navigator.deviceMemory is non-standard (Chrome only)
  const memory = navigator.deviceMemory || 0;

  // Check connection speed
  // @ts-expect-error navigator.connection is non-standard (NetworkInformation API)
  const connection = navigator.connection;
  const effectiveType = connection?.effectiveType || '4g';

  // WebGL performance test
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  let glScore = 0;

  if (gl) {
    // @ts-expect-error WebGL extension typing differs across contexts
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      // @ts-expect-error UNMASKED_RENDERER_WEBGL is from debug extension
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      devLog.log('GPU Renderer:', renderer);

      // Score based on GPU
      if (/Apple|M1|M2|A1[5-7]/i.test(renderer)) glScore = 4;
      else if (/Adreno [67]\d{2}|Mali-G[78]\d/i.test(renderer)) glScore = 3;
      else if (/Adreno [5-6]\d{2}|Mali-[GT]\d{2}/i.test(renderer)) glScore = 2;
      else glScore = 1;
    }

    // Check max texture size
    // @ts-expect-error gl context union narrowing limitation
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize >= 16384) glScore += 2;
    else if (maxTextureSize >= 8192) glScore += 1;
  }

  // Calculate overall score
  let score = 0;

  // CPU score
  if (cores >= 8) score += 3;
  else if (cores >= 6) score += 2;
  else if (cores >= 4) score += 1;

  // Memory score
  if (memory >= 8) score += 3;
  else if (memory >= 4) score += 2;
  else if (memory >= 2) score += 1;

  // Network score
  if (effectiveType === '4g') score += 1;

  // GPU score
  score += glScore;

  devLog.log('Performance score:', score, { cores, memory, effectiveType, glScore });

  // Determine category
  if (score >= 10) return 'flagship';
  if (score >= 7) return 'high';
  if (score >= 4) return 'mid';
  return 'low';
}

/**
 * Get optimal settings based on device profile
 */
function getOptimalSettings(profile: Partial<DeviceProfile>): DeviceProfile['recommendedSettings'] {
  const category = profile.category || 'unknown';

  switch (category) {
    case 'flagship':
      return {
        cameraResolution: { width: 1280, height: 720 },
        faceMeshMaxFaces: 1,
        faceMeshRefineLandmarks: true,
        useWebGL: true,
        frameRate: 30,
        enableHeavyProcessing: true,
        memoryLimit: 500,
      };

    case 'high':
      return {
        cameraResolution: { width: 960, height: 540 },
        faceMeshMaxFaces: 1,
        faceMeshRefineLandmarks: true,
        useWebGL: true,
        frameRate: 30,
        enableHeavyProcessing: true,
        memoryLimit: 300,
      };

    case 'mid':
      return {
        cameraResolution: { width: 640, height: 480 },
        faceMeshMaxFaces: 1,
        faceMeshRefineLandmarks: false,
        useWebGL: true,
        frameRate: 24,
        enableHeavyProcessing: false,
        memoryLimit: 200,
      };

    case 'low':
      return {
        cameraResolution: { width: 480, height: 360 },
        faceMeshMaxFaces: 1,
        faceMeshRefineLandmarks: false,
        useWebGL: false, // Use CPU backend
        frameRate: 15,
        enableHeavyProcessing: false,
        memoryLimit: 100,
      };

    default:
      // Unknown device - conservative settings
      return {
        cameraResolution: { width: 640, height: 480 },
        faceMeshMaxFaces: 1,
        faceMeshRefineLandmarks: false,
        useWebGL: true,
        frameRate: 24,
        enableHeavyProcessing: false,
        memoryLimit: 150,
      };
  }
}

/**
 * Main device profiling function
 */
export function getDeviceProfile(): DeviceProfile {
  const ua = navigator.userAgent;
  devLog.log('🔍 Device Profiling - User Agent:', ua);

  let profile: Partial<DeviceProfile> = {
    model: 'Unknown Device',
    category: 'unknown',
  };

  // Check if iOS
  if (/iPhone|iPad|iPod/.test(ua)) {
    const iPhoneModel = detectiPhoneModel();
    if (iPhoneModel && IPHONE_MODELS[iPhoneModel]) {
      profile = {
        model: iPhoneModel,
        ...IPHONE_MODELS[iPhoneModel],
      };
      devLog.log('📱 Detected iPhone:', profile);
    } else {
      // Unknown iPhone - estimate based on iOS version
      const iosMatch = ua.match(/OS (\d+)_/);
      const iosVersion = iosMatch ? parseInt(iosMatch[1]) : 12;

      if (iosVersion >= 16) {
        profile = { model: 'iPhone (Recent)', category: 'high', ram: 4 };
      } else if (iosVersion >= 14) {
        profile = { model: 'iPhone (Modern)', category: 'mid', ram: 3 };
      } else {
        profile = { model: 'iPhone (Older)', category: 'low', ram: 2 };
      }
    }
  }
  // Check if Android
  else if (/Android/i.test(ua)) {
    const androidProfile = detectAndroidModel();
    if (androidProfile) {
      profile = {
        model: 'Android Device',
        ...androidProfile,
      };
      devLog.log('🤖 Detected Android:', profile);
    }
  }
  // Desktop or other
  else {
    profile = {
      model: 'Desktop/Other',
      category: 'flagship',
      ram: 8,
    };
  }

  // If category still unknown, estimate performance
  if (profile.category === 'unknown') {
    profile.category = estimateDevicePerformance();
    devLog.log('🎯 Estimated performance category:', profile.category);
  }

  // Get optimal settings for this device
  const recommendedSettings = getOptimalSettings(profile);

  // Log final profile
  const finalProfile: DeviceProfile = {
    model: profile.model || 'Unknown',
    category: profile.category || 'unknown',
    ram: profile.ram || 2,
    chipset: profile.chipset,
    gpu: profile.gpu,
    year: profile.year,
    recommendedSettings,
  };

  devLog.log('📊 Final Device Profile:', finalProfile);

  // Additional real-time metrics
  devLog.log('📈 Real-time metrics:', {
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    devicePixelRatio: window.devicePixelRatio,
    colorDepth: window.screen.colorDepth,
    // @ts-expect-error navigator.deviceMemory is non-standard (Chrome only)
    deviceMemory: navigator.deviceMemory || 'N/A',
    hardwareConcurrency: navigator.hardwareConcurrency || 'N/A',
    // @ts-expect-error navigator.connection is non-standard (NetworkInformation API)
    connection: navigator.connection?.effectiveType || 'N/A',
    platform: navigator.platform,
    vendor: navigator.vendor,
  });

  return finalProfile;
}

/**
 * Check if device can handle MediaPipe smoothly
 */
export function canRunMediaPipe(profile?: DeviceProfile): boolean {
  const p = profile || getDeviceProfile();

  // Devices that definitely can't run MediaPipe well
  if (p.category === 'low' && p.ram < 3) {
    console.warn('⚠️ Device may struggle with MediaPipe:', p.model);
    return false;
  }

  // Check WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    console.warn('⚠️ No WebGL support detected');
    return false;
  }

  return true;
}

/**
 * Get camera constraints optimized for device
 */
export function getOptimalCameraConstraints(
  facingMode: 'user' | 'environment' = 'user',
): MediaTrackConstraints {
  const profile = getDeviceProfile();
  const settings = profile.recommendedSettings;

  const constraints: MediaTrackConstraints = {
    facingMode,
    width: { ideal: settings.cameraResolution.width },
    height: { ideal: settings.cameraResolution.height },
    frameRate: { max: settings.frameRate },
  };

  // Add iOS-specific constraints
  if (/iPhone|iPad/.test(navigator.userAgent)) {
    // iOS performs better with exact constraints
    constraints.width = { exact: settings.cameraResolution.width };
    constraints.height = { exact: settings.cameraResolution.height };
  }

  // Add Android-specific constraints
  if (/Android/i.test(navigator.userAgent)) {
    // Some Android devices need aspectRatio
    constraints.aspectRatio = { ideal: 16 / 9 };
  }

  devLog.log('📹 Optimal camera constraints for', profile.model, ':', constraints);

  return constraints;
}

/**
 * Monitor performance and suggest adjustments
 */
export class PerformanceMonitor {
  private frameTimestamps: number[] = [];
  private memoryReadings: number[] = [];
  private lastCheck = Date.now();

  recordFrame(): void {
    this.frameTimestamps.push(Date.now());
    // Keep only last 60 frames
    if (this.frameTimestamps.length > 60) {
      this.frameTimestamps.shift();
    }
  }

  getFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    const duration =
      this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
    return (this.frameTimestamps.length - 1) / (duration / 1000);
  }

  checkPerformance(): { fps: number; memory: number; suggestion?: string } {
    const fps = this.getFPS();
    // @ts-expect-error performance.memory is non-standard (Chrome only)
    const memory = performance.memory?.usedJSHeapSize || 0;

    this.memoryReadings.push(memory);
    if (this.memoryReadings.length > 10) {
      this.memoryReadings.shift();
    }

    const avgMemory = this.memoryReadings.reduce((a, b) => a + b, 0) / this.memoryReadings.length;
    const memoryMB = avgMemory / 1024 / 1024;

    let suggestion: string | undefined;

    if (fps < 10 && fps > 0) {
      suggestion =
        'Performance is very low. Consider reducing camera resolution or disabling face detection.';
    } else if (fps < 20 && fps > 0) {
      suggestion = 'Performance is below optimal. Try closing other apps.';
    }

    if (memoryMB > 300) {
      suggestion = (suggestion || '') + ' High memory usage detected. The app may crash soon.';
    }

    return { fps, memory: memoryMB, suggestion };
  }
}
