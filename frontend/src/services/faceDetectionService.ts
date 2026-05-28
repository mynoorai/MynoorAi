/**
 * Face Detection Service using MediaPipe
 * STRICT face detection - no fallbacks to weaker methods
 */

import * as faceDetection from '@tensorflow-models/face-detection';
import '@mediapipe/face_detection';
import { detectInAppBrowser, getInAppBrowserSettings } from '@/utils/inAppBrowserDetection';
import { devLog } from '@/utils/devLog';

interface FaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  keypoints?: any[]; // MediaPipe keypoints for facial landmarks
}

class FaceDetectionService {
  private static instance: FaceDetectionService | null = null;
  private detector: faceDetection.FaceDetector | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): FaceDetectionService {
    if (!FaceDetectionService.instance) {
      FaceDetectionService.instance = new FaceDetectionService();
    }
    return FaceDetectionService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (this.initPromise) {
      try {
        await this.initPromise;
        return this.initialized;
      } catch {
        return false;
      }
    }

    this.initPromise = this.initializeInternal();

    try {
      await this.initPromise;
      return this.initialized;
    } finally {
      this.initPromise = null;
    }
  }

  private async initializeInternal(): Promise<void> {
    devLog.log('🔧 [FaceDetectionService] Initializing MediaPipe face detection...');

    // Check if we're in Instagram browser and adjust settings
    const browserInfo = detectInAppBrowser();
    const isInstagram = browserInfo.isInAppBrowser && browserInfo.browserName === 'instagram';
    const inAppSettings = getInAppBrowserSettings(browserInfo);

    try {
      // Create MediaPipe face detector with Instagram optimizations
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;

      // Instagram browser: use more conservative settings
      const detectorConfig = {
        runtime: 'mediapipe' as const,
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
        modelType: 'short' as const, // short range model for selfies
        minDetectionConfidence: isInstagram ? 0.4 : 0.5, // Lower threshold for Instagram
      };

      if (isInstagram) {
        devLog.log(
          '📱 [FaceDetectionService] Instagram browser detected, using optimized settings',
        );
        devLog.log('⚙️ [FaceDetectionService] Instagram settings:', {
          backend: inAppSettings.faceMeshBackend,
          maxFaces: inAppSettings.faceMeshMaxFaces,
          refineLandmarks: inAppSettings.faceMeshRefineLandmarks,
          detectionInterval: inAppSettings.detectionInterval,
        });
      }

      this.detector = await faceDetection.createDetector(model, detectorConfig);

      this.initialized = true;
      devLog.log('✅ [FaceDetectionService] MediaPipe face detection initialized');
    } catch (error) {
      console.error('❌ [FaceDetectionService] Failed to initialize MediaPipe:', error);
      // NO FALLBACK - face detection is unavailable
      this.initialized = false;
      throw new Error('Face detection unavailable. Please use a modern browser.');
    }
  }

  async detectFaceInVideo(video: HTMLVideoElement): Promise<FaceRect | null> {
    if (!this.initialized) {
      console.warn('⚠️ [FaceDetectionService] Not initialized, initializing now...');
      const success = await this.initialize();
      if (!success) {
        console.error('❌ [FaceDetectionService] Initialization failed');
        return null;
      }
    }

    if (!video || video.readyState < 2) {
      console.warn('⚠️ [FaceDetectionService] Video not ready');
      return null;
    }

    if (!this.detector) {
      console.error('❌ [FaceDetectionService] No detector available');
      return null;
    }

    try {
      // Use MediaPipe to detect faces
      const predictions = await this.detector.estimateFaces(video);

      if (predictions.length === 0) {
        return null;
      }

      // Get the first (most prominent) face
      const face = predictions[0];

      // Filter out low confidence detections to avoid false positives
      // More lenient for mobile devices
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const minConfidence = isMobile ? 0.5 : 0.7;

      if (face.score && face.score < minConfidence) {
        devLog.log(
          '⚠️ [FaceDetection] Low confidence detection ignored:',
          (face.score * 100).toFixed(1) + '%',
        );
        return null;
      }

      const box = face.box;

      // Additional sanity check - face should be reasonable size
      // More generous range for mobile cameras
      const faceArea = (box.width * box.height) / (video.videoWidth * video.videoHeight);
      const minArea = isMobile ? 0.015 : 0.02;
      const maxArea = isMobile ? 0.85 : 0.8;

      if (faceArea < minArea || faceArea > maxArea) {
        devLog.log(
          '⚠️ [FaceDetection] Unrealistic face size ignored:',
          (faceArea * 100).toFixed(1) + '%',
        );
        return null;
      }

      // MediaPipe provides xMin, yMin, width, height
      const faceRect: FaceRect = {
        x: box.xMin,
        y: box.yMin,
        width: box.width,
        height: box.height,
        confidence: face.score || 0.5,
        // Store keypoints if available for landmark checking
        keypoints: face.keypoints,
      };

      devLog.log('🎯 [FaceDetection] MediaPipe detected face:', {
        confidence: (faceRect.confidence * 100).toFixed(1) + '%',
        area:
          (((box.width * box.height) / (video.videoWidth * video.videoHeight)) * 100).toFixed(1) +
          '%',
        hasKeypoints: !!face.keypoints,
      });

      return faceRect;
    } catch (error) {
      console.error('❌ [FaceDetectionService] Detection error:', error);
      return null;
    }
  }

  async detectFaceInImage(image: HTMLImageElement): Promise<FaceRect | null> {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        return null;
      }
    }

    if (!this.detector) {
      console.error('❌ [FaceDetectionService] No detector available');
      return null;
    }

    try {
      const predictions = await this.detector.estimateFaces(image);

      if (predictions.length === 0) {
        return null;
      }

      const face = predictions[0];
      const box = face.box;

      return {
        x: box.xMin,
        y: box.yMin,
        width: box.width,
        height: box.height,
        confidence: face.score || 0.5,
      };
    } catch (error) {
      console.error('❌ [FaceDetectionService] Image detection error:', error);
      return null;
    }
  }

  isFaceWellPositioned(
    face: FaceRect,
    frameWidth: number,
    frameHeight: number,
    ellipseBounds?: {
      centerX: number;
      centerY: number;
      radiusX: number;
      radiusY: number;
      videoBounds: DOMRect;
      videoWidth: number;
      videoHeight: number;
    },
  ): boolean {
    // If we have actual ellipse bounds from the screen, use them
    // Otherwise fall back to conservative estimates
    let ovalCenterX: number;
    let ovalCenterY: number;
    let ovalRadiusX: number;
    let ovalRadiusY: number;

    if (ellipseBounds) {
      // We have the actual ellipse position on screen!
      // Now we need to map screen coordinates to video frame coordinates
      const videoBounds = ellipseBounds.videoBounds;

      // Add mobile device debugging
      const deviceInfo = {
        pixelRatio: window.devicePixelRatio || 1,
        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        viewport: { width: window.innerWidth, height: window.innerHeight },
        screen: { width: screen.width, height: screen.height },
      };

      // Calculate how the video is displayed (object-fit: cover)
      // This determines which part of the video is visible
      const videoAspectRatio = frameWidth / frameHeight;
      const displayAspectRatio = videoBounds.width / videoBounds.height;

      let scale = 1;
      let cropX = 0; // How much is cropped from left in video coordinates
      let cropY = 0; // How much is cropped from top in video coordinates

      if (videoAspectRatio > displayAspectRatio) {
        // Video is wider than display - height fits, width is cropped
        scale = videoBounds.height / frameHeight;
        const displayedVideoWidth = videoBounds.width / scale;
        cropX = (frameWidth - displayedVideoWidth) / 2;
      } else {
        // Video is taller than display - width fits, height is cropped
        scale = videoBounds.width / frameWidth;
        const displayedVideoHeight = videoBounds.height / scale;
        cropY = (frameHeight - displayedVideoHeight) / 2;
      }

      // Convert ellipse screen coordinates to video frame coordinates
      // Screen position relative to video element, then unscale and add crop offset
      ovalCenterX = (ellipseBounds.centerX - videoBounds.left) / scale + cropX;
      ovalCenterY = (ellipseBounds.centerY - videoBounds.top) / scale + cropY;
      ovalRadiusX = ellipseBounds.radiusX / scale;
      ovalRadiusY = ellipseBounds.radiusY / scale;

      devLog.log('🎯 [FaceDetection] Ellipse mapping (mobile-aware):', {
        device: deviceInfo,
        screenEllipse: {
          cx: ellipseBounds.centerX.toFixed(1),
          cy: ellipseBounds.centerY.toFixed(1),
          rx: ellipseBounds.radiusX.toFixed(1),
          ry: ellipseBounds.radiusY.toFixed(1),
        },
        videoEllipse: {
          cx: ovalCenterX.toFixed(1),
          cy: ovalCenterY.toFixed(1),
          rx: ovalRadiusX.toFixed(1),
          ry: ovalRadiusY.toFixed(1),
        },
        videoFrame: { width: frameWidth, height: frameHeight },
        displayBounds: {
          width: videoBounds.width.toFixed(1),
          height: videoBounds.height.toFixed(1),
        },
        scale: scale.toFixed(3),
        crop: { x: cropX.toFixed(1), y: cropY.toFixed(1) },
        aspectRatios: {
          video: videoAspectRatio.toFixed(3),
          display: displayAspectRatio.toFixed(3),
        },
      });
    } else {
      // Fallback to conservative estimates
      ovalCenterX = frameWidth / 2;
      ovalCenterY = frameHeight / 2;
      ovalRadiusX = frameWidth * 0.43;
      ovalRadiusY = frameHeight * 0.3;
    }

    // Check face size - more generous for mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const faceAreaRatio = (face.width * face.height) / (frameWidth * frameHeight);
    const minSize = isMobile ? 0.03 : 0.04; // More lenient minimum for mobile
    const maxSize = isMobile ? 0.35 : 0.25; // More lenient maximum for mobile
    const isSizeGood = faceAreaRatio > minSize && faceAreaRatio < maxSize;

    // MediaPipe confidence check - more lenient for mobile
    const minConfidence = isMobile ? 0.4 : 0.5;
    const isConfident = face.confidence >= minConfidence;

    // Check if ALL key facial features (both eyes, nose, mouth) are within the oval
    // ALL FOUR features must be inside - if even one is outside, don't capture
    let areFeaturesInOval = false;
    const featureStatus = { rightEye: false, leftEye: false, nose: false, mouth: false };

    // Track feature span to ensure eyes, nose, mouth optimally FILL the ellipse
    const featureSpanData = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      widthFillRatio: 0,
      heightFillRatio: 0,
      isOptimalFill: false,
    };

    if (face.keypoints && face.keypoints.length >= 4) {
      // MediaPipe provides 6 keypoints:
      // 0: right eye, 1: left eye, 2: nose tip, 3: mouth center, 4: right ear, 5: left ear

      // STRICT CHECK: Ensure ALL critical keypoints exist
      if (!face.keypoints[0] || !face.keypoints[1] || !face.keypoints[2] || !face.keypoints[3]) {
        devLog.log(
          '⚠️ [FaceDetectionService] Missing critical keypoints - cannot verify face position',
        );
        return false;
      }

      const criticalKeypoints = [
        { name: 'rightEye', kp: face.keypoints[0] },
        { name: 'leftEye', kp: face.keypoints[1] },
        { name: 'nose', kp: face.keypoints[2] },
        { name: 'mouth', kp: face.keypoints[3] },
      ];

      // Debug logging
      devLog.log(`📐 [FaceDetectionService] Ellipse:`, {
        frameSize: `${frameWidth}x${frameHeight}`,
        ellipseRadii: `${ovalRadiusX.toFixed(0)}x${ovalRadiusY.toFixed(0)}`,
        center: `(${ovalCenterX.toFixed(0)}, ${ovalCenterY.toFixed(0)})`,
      });

      // Check each feature individually
      criticalKeypoints.forEach(({ name, kp }) => {
        if (kp) {
          // Keypoints are in video frame coordinates
          // Update feature span tracking
          featureSpanData.minX = Math.min(featureSpanData.minX, kp.x);
          featureSpanData.maxX = Math.max(featureSpanData.maxX, kp.x);
          featureSpanData.minY = Math.min(featureSpanData.minY, kp.y);
          featureSpanData.maxY = Math.max(featureSpanData.maxY, kp.y);

          // Check if within ellipse
          const distFromCenterX = kp.x - ovalCenterX;
          const distFromCenterY = kp.y - ovalCenterY;
          const normalizedX = distFromCenterX / ovalRadiusX;
          const normalizedY = distFromCenterY / ovalRadiusY;
          const distance = normalizedX * normalizedX + normalizedY * normalizedY;
          // More lenient boundary for mobile devices (1.15 vs 1.0)
          const maxDistance = isMobile ? 1.15 : 1.0;
          featureStatus[name] = distance <= maxDistance;

          // Enhanced debugging for mobile
          if (distance > 1.0) {
            devLog.log(`    🔴 ${name}: OUTSIDE ellipse`, {
              keypoint: { x: kp.x.toFixed(1), y: kp.y.toFixed(1) },
              ellipseCenter: { x: ovalCenterX.toFixed(1), y: ovalCenterY.toFixed(1) },
              offset: { x: distFromCenterX.toFixed(1), y: distFromCenterY.toFixed(1) },
              normalized: { x: normalizedX.toFixed(3), y: normalizedY.toFixed(3) },
              distance: distance.toFixed(3),
              ellipseRadii: { x: ovalRadiusX.toFixed(1), y: ovalRadiusY.toFixed(1) },
            });
          }
        } else {
          devLog.log(`    ⚠️ ${name}: keypoint missing`);
        }
      });

      // ALL features must be inside the oval - STRICT REQUIREMENT
      areFeaturesInOval =
        featureStatus.rightEye &&
        featureStatus.leftEye &&
        featureStatus.nose &&
        featureStatus.mouth;

      // Calculate feature span fill ratio if all features are inside
      if (areFeaturesInOval && featureSpanData.minX !== Infinity) {
        const featureWidth = featureSpanData.maxX - featureSpanData.minX;
        const featureHeight = featureSpanData.maxY - featureSpanData.minY;

        // Calculate fill ratios relative to the ellipse dimensions
        featureSpanData.widthFillRatio = featureWidth / (ovalRadiusX * 2);
        featureSpanData.heightFillRatio = featureHeight / (ovalRadiusY * 2);

        // Check if features optimally fill the ellipse - much more lenient for mobile
        const minFill = isMobile ? 0.2 : 0.3; // Reduced from 0.25 to 0.20 for mobile
        const maxFill = isMobile ? 0.8 : 0.7; // Increased from 0.75 to 0.80 for mobile

        featureSpanData.isOptimalFill =
          featureSpanData.widthFillRatio >= minFill &&
          featureSpanData.widthFillRatio <= maxFill &&
          featureSpanData.heightFillRatio >= minFill &&
          featureSpanData.heightFillRatio <= maxFill;

        devLog.log(
          `📏 [FaceDetectionService] Feature span: width=${(featureSpanData.widthFillRatio * 100).toFixed(1)}%, height=${(featureSpanData.heightFillRatio * 100).toFixed(1)}%`,
        );

        if (!featureSpanData.isOptimalFill) {
          if (
            featureSpanData.widthFillRatio < minFill ||
            featureSpanData.heightFillRatio < minFill
          ) {
            devLog.log(
              `📐 [FaceDetectionService] Move CLOSER - face features only fill ${(
                Math.min(featureSpanData.widthFillRatio, featureSpanData.heightFillRatio) * 100
              ).toFixed(
                1,
              )}% of ellipse (need ${(minFill * 100).toFixed(0)}-${(maxFill * 100).toFixed(0)}%)`,
            );
          } else if (
            featureSpanData.widthFillRatio > maxFill ||
            featureSpanData.heightFillRatio > maxFill
          ) {
            devLog.log(
              `📐 [FaceDetectionService] Move BACK - face features exceed ${(maxFill * 100).toFixed(0)}%`,
            );
          }
        } else {
          devLog.log(
            `✨ [FaceDetectionService] PERFECT! Face features optimally fill the ellipse (${
              isMobile ? 'Mobile' : 'Desktop'
            }: ${(minFill * 100).toFixed(0)}-${(maxFill * 100).toFixed(0)}%) - ready for capture!`,
          );
        }
      }

      if (!areFeaturesInOval) {
        const outsideFeatures = [];
        if (!featureStatus.rightEye) outsideFeatures.push('right eye');
        if (!featureStatus.leftEye) outsideFeatures.push('left eye');
        if (!featureStatus.nose) outsideFeatures.push('nose');
        if (!featureStatus.mouth) outsideFeatures.push('mouth');
        devLog.log(
          '🚫 [FaceDetectionService] CAPTURE BLOCKED - Features outside oval:',
          outsideFeatures.join(', '),
        );
      } else if (!featureSpanData.isOptimalFill) {
        devLog.log(
          '🚫 [FaceDetectionService] CAPTURE BLOCKED - Features do not optimally fill ellipse',
        );
      } else {
        devLog.log(
          '✅ [FaceDetectionService] ALL conditions met - features inside AND optimally fill ellipse',
        );
      }
    } else {
      // Fallback: if no keypoints, estimate facial feature positions based on face box
      const estimatedFeatures = [
        { name: 'leftEye', x: face.x + face.width * 0.3, y: face.y + face.height * 0.35 },
        { name: 'rightEye', x: face.x + face.width * 0.7, y: face.y + face.height * 0.35 },
        { name: 'nose', x: face.x + face.width * 0.5, y: face.y + face.height * 0.5 },
        { name: 'mouth', x: face.x + face.width * 0.5, y: face.y + face.height * 0.7 },
      ];

      // Check each estimated feature
      estimatedFeatures.forEach((feature) => {
        // Update feature span tracking
        featureSpanData.minX = Math.min(featureSpanData.minX, feature.x);
        featureSpanData.maxX = Math.max(featureSpanData.maxX, feature.x);
        featureSpanData.minY = Math.min(featureSpanData.minY, feature.y);
        featureSpanData.maxY = Math.max(featureSpanData.maxY, feature.y);

        // Check if within ellipse (using frame coordinates)
        const distFromCenterX = feature.x - ovalCenterX;
        const distFromCenterY = feature.y - ovalCenterY;
        const normalizedX = distFromCenterX / ovalRadiusX;
        const normalizedY = distFromCenterY / ovalRadiusY;
        const distance = normalizedX * normalizedX + normalizedY * normalizedY;
        // More lenient boundary for mobile devices (1.15 vs 1.0)
        const maxDistance = isMobile ? 1.15 : 1.0;
        featureStatus[feature.name] = distance <= maxDistance;

        // Log exact distances for debugging
        if (distance > 1.0) {
          devLog.log(
            `    🔴 ${feature.name} (estimated): distance=${distance.toFixed(3)} (>1.0) - OUTSIDE`,
          );
        }
      });

      // ALL features must be inside
      areFeaturesInOval =
        featureStatus.rightEye &&
        featureStatus.leftEye &&
        featureStatus.nose &&
        featureStatus.mouth;

      // Calculate fill ratio for estimated features
      if (areFeaturesInOval && featureSpanData.minX !== Infinity) {
        const featureWidth = featureSpanData.maxX - featureSpanData.minX;
        const featureHeight = featureSpanData.maxY - featureSpanData.minY;

        featureSpanData.widthFillRatio = featureWidth / (ovalRadiusX * 2);
        featureSpanData.heightFillRatio = featureHeight / (ovalRadiusY * 2);

        // Much more lenient thresholds for mobile devices
        const minFill = isMobile ? 0.2 : 0.3; // Reduced from 0.25 to 0.20 for mobile
        const maxFill = isMobile ? 0.8 : 0.7; // Increased from 0.75 to 0.80 for mobile

        featureSpanData.isOptimalFill =
          featureSpanData.widthFillRatio >= minFill &&
          featureSpanData.widthFillRatio <= maxFill &&
          featureSpanData.heightFillRatio >= minFill &&
          featureSpanData.heightFillRatio <= maxFill;

        devLog.log(
          `📏 [FaceDetectionService] Estimated feature span: width=${(featureSpanData.widthFillRatio * 100).toFixed(1)}%, height=${(featureSpanData.heightFillRatio * 100).toFixed(1)}%`,
        );
      }

      if (!areFeaturesInOval) {
        const outsideFeatures = [];
        if (!featureStatus.rightEye) outsideFeatures.push('right eye');
        if (!featureStatus.leftEye) outsideFeatures.push('left eye');
        if (!featureStatus.nose) outsideFeatures.push('nose');
        if (!featureStatus.mouth) outsideFeatures.push('mouth');
        devLog.log(
          '⚠️ [FaceDetectionService] CAPTURE BLOCKED - Estimated features outside oval:',
          outsideFeatures.join(', '),
        );
      }
    }

    // UPDATED: Result now requires features to be inside AND optimally fill the ellipse
    const result = areFeaturesInOval && featureSpanData.isOptimalFill && isSizeGood && isConfident;

    if (!result) {
      devLog.log('🚫 [FaceDetectionService] CAPTURE BLOCKED - Face position check failed:');
      if (!areFeaturesInOval) {
        devLog.log('  ❌ Critical: Eyes, nose, or mouth outside ellipse boundary');
        devLog.log('     Feature status:', {
          rightEye: featureStatus.rightEye ? '✓' : '✗',
          leftEye: featureStatus.leftEye ? '✓' : '✗',
          nose: featureStatus.nose ? '✓' : '✗',
          mouth: featureStatus.mouth ? '✓' : '✗',
        });
      }
      if (!featureSpanData.isOptimalFill) {
        const minFill = isMobile ? 0.2 : 0.3;
        const maxFill = isMobile ? 0.8 : 0.7;

        devLog.log('  ❌ Face features do not optimally fill ellipse');
        devLog.log(
          `     Width fill: ${(featureSpanData.widthFillRatio * 100).toFixed(1)}% (need ${(minFill * 100).toFixed(0)}-${(maxFill * 100).toFixed(0)}%)`,
        );
        devLog.log(
          `     Height fill: ${(featureSpanData.heightFillRatio * 100).toFixed(1)}% (need ${(minFill * 100).toFixed(0)}-${(maxFill * 100).toFixed(0)}%)`,
        );
        devLog.log(`     Device: ${isMobile ? 'Mobile' : 'Desktop'}`);

        if (featureSpanData.widthFillRatio < minFill || featureSpanData.heightFillRatio < minFill) {
          devLog.log('  💡 Suggestion: Move CLOSER to camera');
        } else if (
          featureSpanData.widthFillRatio > maxFill ||
          featureSpanData.heightFillRatio > maxFill
        ) {
          devLog.log('  💡 Suggestion: Move AWAY from camera');
        }
      }
      if (!isSizeGood)
        devLog.log(
          '  ⚠️ Size issue:',
          (faceAreaRatio * 100).toFixed(1) +
            `% (need: ${(minSize * 100).toFixed(0)}-${(maxSize * 100).toFixed(0)}%)`,
        );
      if (!isConfident) devLog.log('  ⚠️ Low confidence:', face.confidence.toFixed(2));
    } else {
      devLog.log(
        '✅ [FaceDetectionService] Face properly positioned - ALL features within ellipse AND optimally fill it',
      );
    }

    return result;
  }

  getFaceQualityScore(face: FaceRect, frameWidth: number, frameHeight: number): number {
    const centerX = face.x + face.width / 2;
    const centerY = face.y + face.height / 2;

    // Centering score
    const xOffset = Math.abs(centerX - frameWidth / 2) / (frameWidth / 2);
    const yOffset = Math.abs(centerY - frameHeight / 2) / (frameHeight / 2);
    const centeringScore = (1 - (xOffset + yOffset) / 2) * 40;

    // Size score
    const faceAreaRatio = (face.width * face.height) / (frameWidth * frameHeight);
    const sizeScore = Math.min(faceAreaRatio / 0.15, 1) * 30;

    // Confidence score
    const confidenceScore = face.confidence * 30;

    return Math.round(centeringScore + sizeScore + confidenceScore);
  }

  dispose(): void {
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const faceDetectionService = FaceDetectionService.getInstance();

// Export types
export type { FaceRect };
