/**
 * FaceMesh Singleton Service
 * Shares a single MediaPipe FaceMesh instance across components
 * This optimizes memory usage while maintaining all functionality
 * Enhanced with Safari/iOS compatibility
 */

import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { initializeTensorFlow, getTensorFlow } from '@/utils/tensorflowInit';
import { getBrowserOptimizationSettings, isIOS, isSafari } from '@/utils/browserDetection';
import { devLog } from '@/utils/devLog';

class FaceMeshService {
  private static instance: FaceMeshService | null = null;
  private detector: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private referenceCount = 0; // Track how many components are using the service

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): FaceMeshService {
    if (!FaceMeshService.instance) {
      FaceMeshService.instance = new FaceMeshService();
    }
    return FaceMeshService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.initialized && this.detector) {
      devLog.log('✅ [FaceMesh Service] Already initialized, reusing existing instance');
      this.referenceCount++;
      return true;
    }

    if (this.initPromise) {
      devLog.log('⏳ [FaceMesh Service] Initialization in progress, waiting...');
      try {
        await this.initPromise;
        this.referenceCount++;
        return this.initialized;
      } catch {
        return false;
      }
    }

    this.initPromise = this.initializeInternal();

    try {
      await this.initPromise;
      this.referenceCount++;
      return this.initialized;
    } finally {
      this.initPromise = null;
    }
  }

  private async initializeInternal(): Promise<void> {
    devLog.log('🔧 [FaceMesh Service] Starting FaceMesh initialization...');
    const startTime = performance.now();

    try {
      // Get browser-specific optimization settings
      const browserSettings = getBrowserOptimizationSettings();
      devLog.log('🌐 [FaceMesh Service] Browser optimization settings:', {
        isSafari: isSafari(),
        isIOS: isIOS(),
        settings: browserSettings,
      });

      // Ensure TensorFlow is initialized first
      devLog.log('🔧 [FaceMesh Service] Ensuring TensorFlow is ready...');
      await initializeTensorFlow();

      const tf = await getTensorFlow();
      devLog.log('✅ [FaceMesh Service] TensorFlow ready, backend:', tf.getBackend());

      // Safari/iOS memory optimization
      if (browserSettings.enableMemoryOptimization) {
        devLog.log('🧹 [FaceMesh Service] Applying Safari/iOS memory optimizations...');

        // Force garbage collection before loading model
        if (typeof (globalThis as any).gc === 'function') {
          (globalThis as any).gc();
        }

        // Clear any existing tensors
        const memBefore = tf.memory();
        if (memBefore.numTensors > 0) {
          devLog.log(
            `🧹 [FaceMesh Service] Cleaning ${memBefore.numTensors} tensors before model load`,
          );
          tf.disposeVariables();
        }
      }

      // Create MediaPipe FaceMesh detector with browser-specific config
      devLog.log('🔧 [FaceMesh Service] Loading MediaPipe FaceMesh model...');
      const modelStart = performance.now();

      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;

      // Adjust config based on browser capabilities
      const detectorConfig: any = {
        runtime: 'tfjs' as const,
        refineLandmarks: browserSettings.refineLandmarks,
        maxFaces: browserSettings.maxFaces,
      };

      // Safari-specific adjustments
      if (isSafari() || isIOS()) {
        devLog.log('📱 [FaceMesh Service] Applying Safari/iOS specific configurations');

        // For iOS, use lower resolution for better performance
        if (isIOS()) {
          detectorConfig.solutionPath = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh';
          devLog.log('📱 [FaceMesh Service] Using CDN path for iOS');
        }
      }

      this.detector = await faceLandmarksDetection.createDetector(model, detectorConfig);

      const modelTime = performance.now() - modelStart;
      const totalTime = performance.now() - startTime;

      this.initialized = true;

      // Log memory usage with Safari warning
      const memInfo = tf.memory();
      devLog.log(`✅ [FaceMesh Service] Model loaded in ${Math.round(modelTime)}ms`);
      devLog.log(`🎯 [FaceMesh Service] Total initialization in ${Math.round(totalTime)}ms`);
      devLog.log(`📊 [FaceMesh Service] Memory usage:`, {
        tensors: memInfo.numTensors,
        memory: `${(memInfo.numBytes / 1024 / 1024).toFixed(2)} MB`,
        ...(isSafari() && { warning: 'Safari has strict memory limits (~200-300MB)' }),
      });

      // Setup memory monitoring for Safari
      if (isSafari() || isIOS()) {
        this.setupMemoryMonitoring();
      }
    } catch (error) {
      console.error('❌ [FaceMesh Service] Failed to initialize:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Monitor memory usage on Safari/iOS and dispose if needed
   */
  private setupMemoryMonitoring(): void {
    devLog.log('📊 [FaceMesh Service] Setting up memory monitoring for Safari/iOS');

    // Check memory every 30 seconds
    setInterval(async () => {
      if (this.detector && this.referenceCount === 0) {
        const tf = await getTensorFlow();
        const memInfo = tf.memory();
        const memoryMB = memInfo.numBytes / 1024 / 1024;

        // If memory usage is high and no components are using the service
        if (memoryMB > 150) {
          console.warn(
            `⚠️ [FaceMesh Service] High memory usage (${memoryMB.toFixed(2)}MB) with no active references`,
          );
          devLog.log('🧹 [FaceMesh Service] Auto-disposing to free memory');
          this.dispose();
        }
      }
    }, 30000);
  }

  async getDetector(): Promise<faceLandmarksDetection.FaceLandmarksDetector | null> {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        return null;
      }
    }
    return this.detector;
  }

  /**
   * Estimate faces from an image or video element
   * This method maintains the exact same interface as before
   */
  async estimateFaces(source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    const detector = await this.getDetector();
    if (!detector) {
      throw new Error('FaceMesh detector not available');
    }
    return detector.estimateFaces(source);
  }

  /**
   * Release reference to the service
   * When reference count reaches 0, optionally dispose the model
   */
  release(): void {
    this.referenceCount = Math.max(0, this.referenceCount - 1);
    devLog.log(`📊 [FaceMesh Service] Released, reference count: ${this.referenceCount}`);

    // Optional: Auto-dispose when no components are using it
    // For now, we keep it loaded for better performance
    /*
    if (this.referenceCount === 0) {
      devLog.log('🧹 [FaceMesh Service] No references, scheduling disposal...');
      setTimeout(() => {
        if (this.referenceCount === 0) {
          this.dispose();
        }
      }, 60000); // Wait 1 minute before disposing
    }
    */
  }

  /**
   * Force dispose the detector
   * Should only be called when completely done with face detection
   */
  dispose(): void {
    if (this.detector) {
      try {
        this.detector.dispose();
        devLog.log('✅ [FaceMesh Service] Detector disposed');
      } catch (error) {
        console.warn('⚠️ [FaceMesh Service] Failed to dispose detector:', error);
      }
      this.detector = null;
    }
    this.initialized = false;
    this.referenceCount = 0;
  }

  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasDetector: !!this.detector,
      referenceCount: this.referenceCount,
      isInitializing: !!this.initPromise,
    };
  }
}

// Export singleton instance
export const faceMeshService = FaceMeshService.getInstance();
