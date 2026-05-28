/**
 * TensorFlow.js initialization module
 * Ensures TensorFlow is properly loaded and initialized before use
 * Enhanced with Safari/iOS compatibility and WebGL context recovery
 */

// Import TensorFlow core and backend in correct order
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import { isSafari, isIOS, getBrowserOptimizationSettings } from './browserDetection';
import { detectInAppBrowser } from './inAppBrowserDetection';
import { devLog } from './devLog';

// Global initialization flag
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
let webglContextLostHandler: (() => void) | null = null;
let memoryMonitorInterval: NodeJS.Timeout | null = null;

// Memory limits for Instagram browser
const INSTAGRAM_MEMORY_LIMIT_MB = 60; // Conservative limit for Instagram
const DEFAULT_MEMORY_LIMIT_MB = 100;

/**
 * Initialize TensorFlow.js with WebGL backend
 * This must be called before any TensorFlow operations
 */
export async function initializeTensorFlow(): Promise<void> {
  if (isInitialized) {
    devLog.log('✅ [TensorFlow] Already initialized');
    return;
  }

  if (initializationPromise) {
    devLog.log('⏳ [TensorFlow] Initialization in progress, waiting...');
    return initializationPromise;
  }

  initializationPromise = performInitialization();
  await initializationPromise;
}

async function performInitialization(): Promise<void> {
  try {
    devLog.log('🔧 [TensorFlow] Starting initialization...');
    const startTime = performance.now();

    // Get browser optimization settings
    const browserSettings = getBrowserOptimizationSettings();
    const browserInfo = detectInAppBrowser();
    const isInstagram = browserInfo.isInAppBrowser && browserInfo.browserName === 'instagram';

    devLog.log('🌐 [TensorFlow] Browser detected:', {
      isSafari: isSafari(),
      isIOS: isIOS(),
      isInstagram,
      optimizationSettings: browserSettings,
    });

    // Set Instagram-specific memory optimizations
    if (isInstagram) {
      devLog.log('📱 [TensorFlow] Instagram browser detected, applying strict memory limits');
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0); // Immediate texture cleanup
      tf.env().set('WEBGL_PACK_DEPTHWISECONV', false); // Less memory usage
      tf.env().set('WEBGL_LAZILY_UNPACK', false); // Reduce memory footprint
      tf.engine().startScope(); // Start memory scope for better cleanup
    }

    // List available backends
    devLog.log('📊 [TensorFlow] Available backends before init:', tf.engine().backendNames());

    // Configure backend based on browser
    let backendInitialized = false;

    if (browserSettings.useWebGL) {
      try {
        // Safari/iOS specific WebGL configuration
        if (isSafari() || isIOS()) {
          devLog.log('🔧 [TensorFlow] Configuring WebGL for Safari/iOS...');

          // Set WebGL flags for better Safari compatibility
          tf.env().set('WEBGL_VERSION', 2);
          tf.env().set('WEBGL_FORCE_F16_TEXTURES', false); // Better Safari compatibility
          tf.env().set('WEBGL_PACK', !isIOS()); // Disable packing on iOS for stability

          if (browserSettings.enableMemoryOptimization) {
            tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0); // Aggressive texture cleanup
          }
        }

        await tf.setBackend('webgl');
        await tf.ready();
        devLog.log('✅ [TensorFlow] WebGL backend initialized');
        backendInitialized = true;

        // Setup WebGL context loss recovery for Safari
        if (isSafari()) {
          setupWebGLContextRecovery();
        }
      } catch (webglError) {
        console.warn('⚠️ [TensorFlow] WebGL backend failed:', webglError);
      }
    }

    // Fallback to CPU if WebGL failed or not recommended
    if (!backendInitialized) {
      devLog.log('🔧 [TensorFlow] Using CPU backend...');
      await tf.setBackend('cpu');
      await tf.ready();
      devLog.log('✅ [TensorFlow] CPU backend initialized');
    }

    // Verify current backend
    const currentBackend = tf.getBackend();
    devLog.log('📊 [TensorFlow] Current backend:', currentBackend);

    // Test TensorFlow functionality
    const testTensor = tf.tensor1d([1, 2, 3]);
    const result = await testTensor.data();
    testTensor.dispose();

    if (result[0] !== 1 || result[1] !== 2 || result[2] !== 3) {
      throw new Error('TensorFlow test failed: tensor values incorrect');
    }

    const initTime = performance.now() - startTime;
    devLog.log(`✅ [TensorFlow] Initialization completed in ${Math.round(initTime)}ms`);

    // Log memory status with Safari warning
    const memInfo = tf.memory();
    devLog.log('📊 [TensorFlow] Memory:', {
      numTensors: memInfo.numTensors,
      numBytes: memInfo.numBytes,
      numBytesFormatted: (memInfo.numBytes / 1024 / 1024).toFixed(2) + ' MB',
      ...(isSafari() && { warning: 'Safari has strict memory limits' }),
    });

    isInitialized = true;

    // Start memory monitoring for Instagram browser
    if (isInstagram) {
      startMemoryMonitor();
    }
  } catch (error) {
    console.error('❌ [TensorFlow] Initialization failed:', error);
    initializationPromise = null;
    throw error;
  }
}

/**
 * Setup WebGL context loss recovery for Safari
 */
function setupWebGLContextRecovery(): void {
  devLog.log('🛡️ [TensorFlow] Setting up WebGL context recovery for Safari...');

  // Monitor for context loss
  webglContextLostHandler = () => {
    console.warn('⚠️ [TensorFlow] WebGL context lost! Attempting recovery...');
    isInitialized = false;

    // Attempt to reinitialize after a delay
    setTimeout(() => {
      devLog.log('🔄 [TensorFlow] Attempting to restore WebGL context...');
      initializeTensorFlow().catch((error) => {
        console.error('❌ [TensorFlow] Failed to restore WebGL context:', error);
      });
    }, 1000);
  };

  // Listen for visibility changes (common trigger for context loss in Safari)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isInitialized) {
      devLog.log('🔄 [TensorFlow] Page visible, checking TensorFlow status...');

      // Check if TensorFlow is still working
      try {
        const testTensor = tf.tensor1d([1]);
        testTensor.dispose();
      } catch {
        // Context likely lost, reinitialize
        if (webglContextLostHandler) {
          webglContextLostHandler();
        }
      }
    }
  });
}

/**
 * Check if TensorFlow is initialized
 */
export function isTensorFlowInitialized(): boolean {
  return isInitialized;
}

/**
 * Get TensorFlow instance (ensures it's initialized)
 */
export async function getTensorFlow() {
  if (!isInitialized) {
    await initializeTensorFlow();
  }
  return tf;
}

/**
 * Memory monitoring for Instagram browser
 */
function startMemoryMonitor(): void {
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
  }

  const browserInfo = detectInAppBrowser();
  const isInstagram = browserInfo.isInAppBrowser && browserInfo.browserName === 'instagram';
  const memoryLimit = isInstagram ? INSTAGRAM_MEMORY_LIMIT_MB : DEFAULT_MEMORY_LIMIT_MB;

  devLog.log('📦 [TensorFlow] Starting memory monitor with limit:', memoryLimit, 'MB');

  memoryMonitorInterval = setInterval(() => {
    const memInfo = tf.memory();
    const memoryMB = memInfo.numBytes / 1024 / 1024;

    if (memoryMB > memoryLimit) {
      console.warn('⚠️ [TensorFlow] Memory usage exceeds limit:', {
        current: memoryMB.toFixed(2) + ' MB',
        limit: memoryLimit + ' MB',
        tensors: memInfo.numTensors,
      });

      // Force cleanup for Instagram
      if (isInstagram) {
        devLog.log('🧽 [TensorFlow] Forcing memory cleanup for Instagram...');
        tf.engine().endScope(); // End current scope
        tf.engine().startScope(); // Start new scope
        tf.tidy(() => {}); // Force cleanup

        // If still over limit, dispose all disposable tensors
        const newMemInfo = tf.memory();
        const newMemoryMB = newMemInfo.numBytes / 1024 / 1024;
        if (newMemoryMB > memoryLimit * 0.9) {
          console.warn('🚨 [TensorFlow] Critical memory pressure, disposing tensors...');
          tf.disposeVariables();
        }
      }
    }
  }, 5000); // Check every 5 seconds
}

/**
 * Stop memory monitoring
 */
export function stopMemoryMonitor(): void {
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
    memoryMonitorInterval = null;
    devLog.log('🛑 [TensorFlow] Memory monitor stopped');
  }
}

/**
 * Manual memory cleanup for Instagram browser
 */
export function cleanupTensorFlowMemory(): void {
  const browserInfo = detectInAppBrowser();
  if (browserInfo.isInAppBrowser && browserInfo.browserName === 'instagram') {
    devLog.log('🧽 [TensorFlow] Manual memory cleanup for Instagram...');
    tf.tidy(() => {});
    tf.engine().endScope();
    tf.engine().startScope();

    const memInfo = tf.memory();
    devLog.log('📦 [TensorFlow] Memory after cleanup:', {
      numTensors: memInfo.numTensors,
      memoryMB: (memInfo.numBytes / 1024 / 1024).toFixed(2) + ' MB',
    });
  }
}

/**
 * Optional helper to schedule TensorFlow pre-initialization.
 * Callers decide when (and if) TensorFlow should warm up.
 */
export function scheduleTensorFlowPreinit(delay = 100): void {
  if (typeof window === 'undefined') return;

  const shouldPreinitialize = !window.location.pathname.startsWith('/admin');
  devLog.log('🚀 [TensorFlow] Considering pre-initialization...', { shouldPreinitialize });

  if (!shouldPreinitialize) {
    devLog.log('🚫 [TensorFlow] Pre-initialization skipped for admin route');
    return;
  }

  setTimeout(() => {
    initializeTensorFlow().catch((error) => {
      console.error('❌ [TensorFlow] Pre-initialization failed:', error);
    });
  }, delay);
}
