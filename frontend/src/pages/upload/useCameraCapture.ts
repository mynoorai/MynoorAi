import { useEffect, useRef, useState } from 'react';
import { faceDetectionService } from '@/services/faceDetectionService';
import { trackError, trackEvent } from '@/utils/analytics';
import {
  PerformanceMonitor,
  getDeviceProfile,
  getOptimalCameraConstraints,
} from '@/utils/deviceProfile';
import {
  detectInAppBrowser,
  getInAppCameraConstraints,
  needsCameraPermissionWorkaround,
} from '@/utils/inAppBrowserDetection';
import { devLog } from '@/utils/devLog';

type FaceDistance = 'too_far' | 'too_close' | 'good' | null;
type FacePosition = 'left' | 'right' | 'up' | 'down' | 'centered' | null;
type FacingMode = 'user' | 'environment';

export interface UseCameraCaptureOptions {
  sessionId: string | null;
  onPhotoCaptured: (file: File, preview: string) => Promise<void> | void;
  onImageError: (message: string) => void;
}

export interface UseCameraCaptureReturn {
  // refs
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  ellipseRef: React.RefObject<SVGEllipseElement>;
  // state
  stream: MediaStream | null;
  isCameraActive: boolean;
  facingMode: FacingMode;
  cameraError: string | null;
  cameraInitialized: boolean;
  faceDetected: boolean;
  faceWellPositioned: boolean;
  faceDistance: FaceDistance;
  facePosition: FacePosition;
  captureCountdown: number | null;
  // actions
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => void;
  startFaceDetection: () => void;
  testCameraAPI: () => void;
}

/**
 * Encapsulates all camera + face-detection state, refs, effects, and handlers.
 * Behavior is preserved from the previous inline implementation in UploadPage.
 */
export const useCameraCapture = ({
  sessionId,
  onPhotoCaptured,
  onImageError,
}: UseCameraCaptureOptions): UseCameraCaptureReturn => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ellipseRef = useRef<SVGEllipseElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCameraActiveRef = useRef(false);
  const faceDetectedRef = useRef(false);
  const isWellPositionedRef = useRef(false);
  const countdownValueRef = useRef<number | null>(null);
  const isProcessingFaceRef = useRef(false);
  const faceDetectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const performanceMonitor = useRef<PerformanceMonitor>(new PerformanceMonitor());

  // Latest callbacks held in refs so async handlers always see the current value
  // without forcing effect re-runs.
  const onPhotoCapturedRef = useRef(onPhotoCaptured);
  const onImageErrorRef = useRef(onImageError);
  useEffect(() => {
    onPhotoCapturedRef.current = onPhotoCaptured;
  }, [onPhotoCaptured]);
  useEffect(() => {
    onImageErrorRef.current = onImageError;
  }, [onImageError]);

  // State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);

  const [faceDetected, setFaceDetected] = useState(false);
  const [faceWellPositioned, setFaceWellPositioned] = useState(false);
  const [faceQuality, setFaceQuality] = useState(0);
  const [faceDistance, setFaceDistance] = useState<FaceDistance>(null);
  const [facePosition, setFacePosition] = useState<FacePosition>(null);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [isProcessingFace, setIsProcessingFace] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // Camera + face detection handlers
  // ──────────────────────────────────────────────────────────────────────────

  const startCamera = async (): Promise<void> => {
    devLog.log('🎥 [Camera API] Starting camera initialization...');
    devLog.log('🎥 [Camera API] Requested facing mode:', facingMode);
    devLog.log('🌐 [Camera API] Environment details:', {
      url: window.location.href,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isSecureContext: window.isSecureContext,
      isLocalhost:
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      isProduction:
        window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('pca-hijab'),
    });

    if (!videoRef.current || !canvasRef.current) {
      console.error('🚨 [Camera API] Video or canvas ref is null at start!', {
        videoRef: !!videoRef.current,
        canvasRef: !!canvasRef.current,
      });
      setCameraError('Camera elements not ready');
      setIsCameraActive(false);
      return;
    }

    devLog.log('🔍 [Camera API] Checking MediaDevices API:', {
      'navigator.mediaDevices': !!navigator.mediaDevices,
      'navigator.mediaDevices.getUserMedia': !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ),
      'window.MediaStream': !!window.MediaStream,
      'window.RTCPeerConnection': !!window.RTCPeerConnection,
    });

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('🚨 [Camera API] getUserMedia not supported in this browser');
      console.error('🚨 [Camera API] MediaDevices details:', {
        mediaDevices: navigator.mediaDevices,
        getUserMedia: navigator.mediaDevices?.getUserMedia,
      });
      setCameraError('Camera not supported in this browser');
      setIsCameraActive(false);
      isCameraActiveRef.current = false;
      return;
    }

    devLog.log('✅ [Camera API] getUserMedia is available');
    devLog.log('🎯 [Camera API] Attempting direct camera access without permission pre-check...');
    devLog.log('📝 [Camera API] Note: Browser permission API may incorrectly report denied status');

    try {
      setCameraError(null);
      devLog.log('🎥 [Camera API] Requesting media stream with constraints:', {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const startTime = performance.now();
      devLog.log('🎬 [Camera API] Calling getUserMedia at:', new Date().toISOString());

      const inAppInfo = detectInAppBrowser();
      let videoConstraints: MediaTrackConstraints;

      if (inAppInfo.isInAppBrowser) {
        videoConstraints = getInAppCameraConstraints(facingMode);
        devLog.log('📱 [Camera API] Using in-app browser constraints:', {
          browser: inAppInfo.browserName,
          constraints: videoConstraints,
        });

        if (needsCameraPermissionWorkaround()) {
          devLog.log(
            '📸 [Camera API] Applying camera permission workaround for',
            inAppInfo.browserName,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } else {
        videoConstraints = getOptimalCameraConstraints(facingMode);
        devLog.log('📹 [Camera API] Device-optimized video constraints:', videoConstraints);
      }

      const deviceProfile = getDeviceProfile();
      devLog.log('📊 [Camera API] Complete profile:', {
        inAppBrowser: inAppInfo.isInAppBrowser ? inAppInfo.browserName : 'none',
        device: {
          model: deviceProfile.model,
          category: deviceProfile.category,
          ram: `${deviceProfile.ram}GB`,
          chipset: deviceProfile.chipset,
        },
        recommendedResolution:
          videoConstraints.width && videoConstraints.height
            ? `${
                (videoConstraints.width as { ideal?: number; exact?: number }).ideal ??
                (videoConstraints.width as { ideal?: number; exact?: number }).exact
              }x${
                (videoConstraints.height as { ideal?: number; exact?: number }).ideal ??
                (videoConstraints.height as { ideal?: number; exact?: number }).exact
              }`
            : 'default',
        canRunMediaPipe: !inAppInfo.limitations?.webGL,
      });

      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      const initTime = performance.now() - startTime;

      devLog.log('✅ [Camera API] Media stream obtained successfully');
      devLog.log('⏱️ [Camera API] Initialization time:', Math.round(initTime), 'ms');
      devLog.log('🎥 [Camera API] Media stream details:', {
        id: mediaStream.id,
        active: mediaStream.active,
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
      });

      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        const settings = videoTrack.getSettings();
        devLog.log('📹 [Camera API] Video track settings:', {
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          facingMode: settings.facingMode,
          deviceId: settings.deviceId,
          label: videoTrack.label,
        });
      }

      if (videoRef.current) {
        devLog.log('🎥 [Camera API] Setting video element source...');
        const video = videoRef.current;

        const videoReadyPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video loading timeout'));
          }, 10000);

          const onLoadedMetadata = () => {
            devLog.log('📺 [Camera API] Video metadata loaded');
            devLog.log('📺 [Camera API] Video dimensions:', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
            });
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              clearTimeout(timeout);
              resolve();
            }
          };

          const onPlay = () => {
            devLog.log('▶️ [Camera API] Video started playing');
          };

          const onError = (e: Event) => {
            console.error('🚨 [Camera API] Video element error:', e);
            clearTimeout(timeout);
            reject(new Error('Video element error'));
          };

          video.onloadedmetadata = onLoadedMetadata;
          video.onplay = onPlay;
          video.onerror = onError;
        });

        video.srcObject = mediaStream;

        try {
          await video.play();
          devLog.log('✅ [Camera API] Video element play() called successfully');
          await videoReadyPromise;
          devLog.log('✅ [Camera API] Video is fully ready for capture');
        } catch (playError) {
          console.error('🚨 [Camera API] Video play error:', playError);
          if (playError instanceof Error && playError.name === 'AbortError') {
            devLog.log(
              '⚠️ [Camera API] Play was interrupted (likely component re-mount), ignoring...',
            );
            setStream(mediaStream);
            streamRef.current = mediaStream;
            setIsCameraActive(true);
            isCameraActiveRef.current = true;
            setCameraInitialized(true);
            setCameraError(null);
            return;
          }
          throw playError;
        }
      } else {
        console.error('🚨 [Camera API] Video ref is null!');
        throw new Error('Video element not available');
      }

      setStream(mediaStream);
      streamRef.current = mediaStream;
      setIsCameraActive(true);
      isCameraActiveRef.current = true;
      setCameraInitialized(true);
      setCameraError(null);

      devLog.log('🎉 [Camera API] Camera initialization completed successfully');

      devLog.log('⏱️ [Camera API] Waiting 2 seconds before starting face detection...');
      setTimeout(() => {
        startFaceDetection();
        devLog.log('👤 [Camera API] Face detection started after 2 second delay');
      }, 2000);

      trackEvent('camera_access', {
        facing_mode: facingMode,
        status: 'granted',
        page: 'upload',
        init_time_ms: Math.round(initTime),
        video_width: mediaStream.getVideoTracks()[0]?.getSettings().width,
        video_height: mediaStream.getVideoTracks()[0]?.getSettings().height,
      });
    } catch (error) {
      console.error('🚨 [Camera API] Camera access error:', error);
      console.error('🚨 [Camera API] Error occurred at:', new Date().toISOString());
      console.error(
        '🚨 [Camera API] Full error object:',
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      );

      if (error instanceof Error) {
        console.error('🚨 [Camera API] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          toString: error.toString(),
        });

        if (error.name === 'NotAllowedError') {
          console.error('❌ [Camera API] NotAllowedError - Permission denied by user or system');
          console.error('❌ [Camera API] Possible causes:', [
            '1. User explicitly denied permission',
            '2. Browser security policy blocks camera',
            '3. Missing HTTPS in production',
            '4. Missing Permissions-Policy headers',
            '5. Browser settings block camera for this site',
          ]);

          if (navigator.permissions && navigator.permissions.query) {
            try {
              const permStatus = await navigator.permissions.query({
                name: 'camera' as PermissionName,
              });
              devLog.log('📷 [Camera API] Permission status after error:', permStatus.state);

              if (permStatus.state === 'prompt') {
                devLog.log(
                  '💡 [Camera API] Permission is actually "prompt" - user may have dismissed dialog',
                );
                devLog.log('💡 [Camera API] User needs to click camera icon in address bar');
              } else if (permStatus.state === 'denied') {
                devLog.log('⛔ [Camera API] Permission is truly denied in browser settings');
                devLog.log(
                  '💡 [Camera API] Go to chrome://settings/content/camera to check site settings',
                );
              }
            } catch {
              devLog.log('⚠️ [Camera API] Could not check permission status after error');
            }
          }
        } else if (error.name === 'NotFoundError') {
          console.error('❌ [Camera API] NotFoundError - No camera device found');
        } else if (error.name === 'NotReadableError') {
          console.error(
            '❌ [Camera API] NotReadableError - Camera is being used by another application',
          );
        } else if (error.name === 'OverconstrainedError') {
          console.error('❌ [Camera API] OverconstrainedError - Constraints cannot be satisfied');
        } else if (error.name === 'SecurityError') {
          console.error(
            '❌ [Camera API] SecurityError - Page not served over HTTPS or other security issue',
          );
        } else if (error.name === 'TypeError') {
          console.error('❌ [Camera API] TypeError - Invalid constraints or API usage');
        }

        let errorMessage = 'Camera access denied or not available';

        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const isSafariBrowser =
          /Safari/.test(navigator.userAgent) &&
          /Apple Computer/.test(navigator.vendor) &&
          !/Chrome/.test(navigator.userAgent);
        const isFirefox = /Firefox/.test(navigator.userAgent);

        devLog.log('🌐 [Camera API] Browser detection:', {
          isChrome,
          isSafari: isSafariBrowser,
          isFirefox,
          userAgent: navigator.userAgent,
          vendor: navigator.vendor,
        });

        switch (error.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            console.error('🚨 [Camera API] User denied camera permission');
            if (isChrome) {
              errorMessage =
                'Camera access was blocked. To fix: Click the camera icon 📷 in the address bar and select "Allow".';
            } else if (isSafariBrowser) {
              errorMessage =
                'Camera access was blocked. To fix: Go to Safari > Settings > Websites > Camera and allow access for this site.';
            } else if (isFirefox) {
              errorMessage =
                'Camera access was blocked. To fix: Click the lock icon 🔒 in the address bar, then "Clear permissions and reload".';
            } else {
              errorMessage =
                'Camera access was blocked. Please allow camera in your browser settings (click the lock icon in the URL bar).';
            }
            break;
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            console.error('🚨 [Camera API] No camera device found');
            errorMessage = 'No camera found. Please check if your camera is connected and enabled.';
            break;
          case 'NotReadableError':
          case 'TrackStartError':
            console.error('🚨 [Camera API] Camera is already in use by another application');
            errorMessage =
              'Camera is being used by another app (Zoom, Teams, etc.). Please close other apps and try again.';
            break;
          case 'OverconstrainedError':
          case 'ConstraintNotSatisfiedError':
            console.error('🚨 [Camera API] Camera constraints cannot be satisfied');
            errorMessage = 'Camera settings not supported. Please try again.';
            break;
          case 'SecurityError':
            console.error('🚨 [Camera API] Security error - HTTPS or permissions issue');
            errorMessage =
              'Camera blocked for security reasons. Please check browser permissions or use HTTPS.';
            break;
          case 'AbortError':
            console.error('🚨 [Camera API] Camera initialization was aborted');
            errorMessage = 'Camera startup was interrupted. Please try again.';
            break;
          default:
            console.error('🚨 [Camera API] Unknown camera error type:', error.name);
        }

        setCameraError(errorMessage);
      } else {
        setCameraError('Camera access denied or not available');
      }

      setIsCameraActive(false);
      isCameraActiveRef.current = false;

      trackError(
        'camera_access_denied',
        error instanceof Error ? error.message : 'Camera not available',
        'upload_page',
      );
    }
  };

  const startFaceDetection = (): void => {
    devLog.log('🎯 [FACE DETECTION] startFaceDetection called');
    devLog.log('🎯 [FACE DETECTION] Current state:', {
      videoRef: !!videoRef.current,
      isCameraActive: isCameraActiveRef.current,
      isProcessingFace,
      captureCountdown,
    });

    if (faceDetectionIntervalRef.current) {
      devLog.log('🔄 [FACE DETECTION] Clearing existing interval');
      clearInterval(faceDetectionIntervalRef.current);
    }

    const browserInfo = detectInAppBrowser();
    const detectionInterval =
      browserInfo.isInAppBrowser && browserInfo.browserName === 'instagram' ? 800 : 200;

    devLog.log('👤 [FACE DETECTION] Starting face detection interval...');
    if (browserInfo.isInAppBrowser) {
      devLog.log(
        '📱 [FACE DETECTION] Instagram browser detected, using interval:',
        detectionInterval,
        'ms',
      );
    }

    faceDetectionIntervalRef.current = setInterval(async () => {
      performanceMonitor.current.recordFrame();

      if (!videoRef.current || !isCameraActiveRef.current) {
        devLog.log(`⏭️ [FACE DETECTION] Skipping detection - no video:`, {
          hasVideo: !!videoRef.current,
          isCameraActive: isCameraActiveRef.current,
        });
        isWellPositionedRef.current = false;
        return;
      }

      if (isProcessingFaceRef.current) {
        devLog.log(`⏭️ [FACE DETECTION] Still processing previous detection`);
        return;
      }

      devLog.log(`🔍 [FACE DETECTION] Running detection`);
      setIsProcessingFace(true);
      isProcessingFaceRef.current = true;

      try {
        devLog.log(`📷 [FACE DETECTION] Calling detectFaceInVideo...`);
        const face = await faceDetectionService.detectFaceInVideo(videoRef.current);
        devLog.log(`📊 [FACE DETECTION] Detection result:`, face);

        if (face) {
          let ellipseBounds = null;
          if (ellipseRef.current && videoRef.current) {
            const videoBounds = videoRef.current.getBoundingClientRect();
            const svgElement = ellipseRef.current.ownerSVGElement;
            if (svgElement) {
              const svgBounds = svgElement.getBoundingClientRect();
              const cx = 174.1725;
              const cy = 333.5;
              const rx = 149.5;
              const ry = 199.5;
              const viewBoxWidth = 348.345;
              const viewBoxHeight = 667;

              const scaleX = svgBounds.width / viewBoxWidth;
              const scaleY = svgBounds.height / viewBoxHeight;

              ellipseBounds = {
                centerX: svgBounds.left + cx * scaleX,
                centerY: svgBounds.top + cy * scaleY,
                radiusX: rx * scaleX,
                radiusY: ry * scaleY,
                videoBounds,
                videoWidth: videoRef.current.videoWidth,
                videoHeight: videoRef.current.videoHeight,
              };
            }
          }

          const isWellPositioned = faceDetectionService.isFaceWellPositioned(
            face,
            videoRef.current.videoWidth,
            videoRef.current.videoHeight,
            ellipseBounds,
          );

          const quality = faceDetectionService.getFaceQualityScore(
            face,
            videoRef.current.videoWidth,
            videoRef.current.videoHeight,
          );

          const faceAreaRatio =
            (face.width * face.height) /
            (videoRef.current.videoWidth * videoRef.current.videoHeight);
          let distance: 'too_far' | 'too_close' | 'good' = 'good';
          if (faceAreaRatio < 0.07) {
            distance = 'too_far';
          } else if (faceAreaRatio > 0.1) {
            distance = 'too_close';
          }

          const faceCenterX = face.x + face.width / 2;
          const faceCenterY = face.y + face.height / 2;
          const videoCenterX = videoRef.current.videoWidth / 2;
          const videoCenterY = videoRef.current.videoHeight / 2;

          let position: 'left' | 'right' | 'up' | 'down' | 'centered' = 'centered';
          const xOffset = faceCenterX - videoCenterX;
          const yOffset = faceCenterY - videoCenterY;
          const threshold = videoRef.current.videoWidth * 0.15;

          if (Math.abs(xOffset) < threshold && Math.abs(yOffset) < threshold) {
            position = 'centered';
          } else if (Math.abs(xOffset) > Math.abs(yOffset)) {
            position = xOffset < 0 ? 'left' : 'right';
          } else {
            position = yOffset < 0 ? 'up' : 'down';
          }

          devLog.log(`✨ [FACE DETECTION] Face found:`, {
            isWellPositioned,
            quality,
            distance,
            position,
            faceAreaRatio,
            face,
          });

          setFaceDetected(true);
          setFaceWellPositioned(isWellPositioned);
          setFaceDistance(distance);
          setFacePosition(position);
          faceDetectedRef.current = true;
          isWellPositionedRef.current = isWellPositioned;
          setFaceQuality(isWellPositioned ? quality : 0);

          if (isWellPositioned) {
            if (countdownValueRef.current !== null || captureTimeoutRef.current !== null) {
              devLog.log(
                `📸 [FACE DETECTION] Face well positioned during countdown: ${countdownValueRef.current}s`,
              );
            } else {
              devLog.log(
                '✅ [FACE DETECTION] Face entered oval - starting countdown immediately...',
              );
              startCaptureCountdown();
            }
          } else {
            devLog.log(
              '⚠️ [FACE DETECTION] Face detected but not well positioned within the oval guide',
            );

            if (countdownValueRef.current !== null || captureTimeoutRef.current !== null) {
              devLog.log('🚫 [FACE DETECTION] Canceling countdown - face not well positioned!');
              devLog.log('   Countdown ref value:', countdownValueRef.current);
              devLog.log('   Timer ref status:', captureTimeoutRef.current ? 'active' : 'null');
              cancelCaptureCountdown();
            }
          }
        } else {
          devLog.log(`❌ [FACE DETECTION] No face detected`);
          setFaceDetected(false);
          setFaceWellPositioned(false);
          setFaceDistance(null);
          setFacePosition(null);
          faceDetectedRef.current = false;
          isWellPositionedRef.current = false;
          setFaceQuality(0);

          if (countdownValueRef.current !== null || captureTimeoutRef.current !== null) {
            devLog.log('🚫 [FACE DETECTION] Canceling countdown - face lost during countdown!');
            devLog.log('   Countdown ref value:', countdownValueRef.current);
            devLog.log('   Timer ref status:', captureTimeoutRef.current ? 'active' : 'null');
            cancelCaptureCountdown();
          }
        }
      } catch (error) {
        console.error(`❌ [FACE DETECTION] Error in detection:`, error);
        console.error(
          `❌ [FACE DETECTION] Error stack:`,
          error instanceof Error ? error.stack : 'No stack',
        );
      } finally {
        setIsProcessingFace(false);
        isProcessingFaceRef.current = false;
      }
    }, detectionInterval);

    devLog.log('✅ [FACE DETECTION] Interval started');
  };

  const stopFaceDetection = (): void => {
    devLog.log('🛑 [FACE DETECTION] Stopping face detection...');

    isCameraActiveRef.current = false;

    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
      faceDetectionIntervalRef.current = null;
      devLog.log('✅ [FACE DETECTION] Face detection interval cleared');
    } else {
      devLog.log('ℹ️ [FACE DETECTION] No active interval to stop');
    }

    cancelCaptureCountdown();

    setFaceDetected(false);
    setFaceWellPositioned(false);
    setFaceDistance(null);
    setFacePosition(null);
    faceDetectedRef.current = false;
    isWellPositionedRef.current = false;
    setFaceQuality(0);
  };

  const startCaptureCountdown = (): void => {
    if (countdownValueRef.current !== null || captureTimeoutRef.current !== null) {
      devLog.log('⏰ [FACE DETECTION] Countdown already in progress, skipping...');
      devLog.log('   Current countdown ref value:', countdownValueRef.current);
      devLog.log('   Current countdown state:', captureCountdown);
      devLog.log('   Timer ref status:', captureTimeoutRef.current ? 'active' : 'null');
      return;
    }

    if (!isWellPositionedRef.current) {
      devLog.log('⚠️ [FACE DETECTION] Face not in position, aborting countdown start');
      return;
    }

    devLog.log('🎬 [FACE DETECTION] Starting NEW countdown sequence...');
    devLog.log('   Face is well positioned: ', isWellPositionedRef.current);

    let countdown = 3;
    setCaptureCountdown(countdown);
    countdownValueRef.current = countdown;

    const countdownInterval = setInterval(() => {
      countdown--;
      countdownValueRef.current = countdown;

      const faceStillInPosition = isWellPositionedRef.current;
      devLog.log(
        `🔍 [COUNTDOWN] Face position check: ${faceStillInPosition ? 'IN' : 'OUT'} (from ref)`,
      );

      if (!faceStillInPosition) {
        devLog.log(`🚫 [COUNTDOWN] Face lost at ${countdown}s - cancelling!`);
        clearInterval(countdownInterval);
        setCaptureCountdown(null);
        countdownValueRef.current = null;
        isWellPositionedRef.current = false;
        if (captureTimeoutRef.current === countdownInterval) {
          captureTimeoutRef.current = null;
        }
        return;
      }

      if (countdown > 0) {
        setCaptureCountdown(countdown);
        devLog.log(`⏰ [COUNTDOWN] ${countdown}s remaining (face in position)`);
      } else {
        clearInterval(countdownInterval);
        setCaptureCountdown(null);
        countdownValueRef.current = null;
        captureTimeoutRef.current = null;

        const canCapture = isWellPositionedRef.current;
        devLog.log(
          `🎯 [COUNTDOWN] Final face check: ${canCapture ? 'READY' : 'NOT READY'} (from ref)`,
        );

        if (canCapture) {
          devLog.log('📸 Capturing photo NOW - face confirmed in position');
          capturePhoto();

          trackEvent('auto_capture', {
            face_quality: faceQuality,
            page: 'upload',
          });
        } else {
          devLog.log('⚠️ [COUNTDOWN] Capture aborted - face not in position');
        }
      }
    }, 1000);

    captureTimeoutRef.current = countdownInterval;
    devLog.log('📸 [FACE DETECTION] Countdown started: 3 seconds...');
  };

  const cancelCaptureCountdown = (): void => {
    devLog.log('🛑 [FACE DETECTION] Cancelling countdown...');
    devLog.log('   Current countdown ref value:', countdownValueRef.current);
    devLog.log('   Current countdown state:', captureCountdown);
    devLog.log('   Timer ref status:', captureTimeoutRef.current ? 'active' : 'null');

    if (captureTimeoutRef.current) {
      clearInterval(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
      devLog.log('   ✅ Timer cleared');
    }
    setCaptureCountdown(null);
    countdownValueRef.current = null;
    devLog.log('   ✅ Countdown state and ref reset to null');
  };

  const stopCamera = (): void => {
    devLog.log('🛑 [Camera API] Stopping camera...');

    setIsCameraActive(false);
    isCameraActiveRef.current = false;

    stopFaceDetection();

    if (stream) {
      const tracks = stream.getTracks();
      devLog.log('🛑 [Camera API] Stopping', tracks.length, 'media tracks');

      tracks.forEach((track, index) => {
        devLog.log(`🛑 [Camera API] Stopping track ${index + 1}:`, {
          kind: track.kind,
          label: track.label,
          readyState: track.readyState,
        });
        track.stop();
      });

      setStream(null);
      streamRef.current = null;
      devLog.log('✅ [Camera API] All tracks stopped and stream cleared');
    } else {
      devLog.log('ℹ️ [Camera API] No active stream to stop');
    }

    devLog.log('✅ [Camera API] Camera stopped successfully');
  };

  const capturePhoto = async (): Promise<void> => {
    devLog.log('📸 [Camera API] Starting photo capture...');
    devLog.log('📸 [Camera API] Current camera state:', {
      isCameraActive: isCameraActiveRef.current,
      hasStream: !!streamRef.current,
      videoRef: !!videoRef.current,
      canvasRef: !!canvasRef.current,
    });

    if (!videoRef.current) {
      console.error('🚨 [Camera API] Video ref is null - cannot capture');
      onImageErrorRef.current('Camera not ready for capture');
      return;
    }
    if (!canvasRef.current) {
      console.error('🚨 [Camera API] Canvas ref is null - cannot capture');
      onImageErrorRef.current('Canvas not available for capture');
      return;
    }
    if (!streamRef.current) {
      console.error('🚨 [Camera API] No stream available - cannot capture');
      onImageErrorRef.current('Camera stream not available');
      return;
    }

    devLog.log('✅ [Camera API] Pre-capture validation passed');

    const flashOverlay = document.createElement('div');
    flashOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: white;
      z-index: 9999;
      pointer-events: none;
      animation: cameraFlash 0.3s ease-out;
    `;

    if (!document.querySelector('#camera-flash-animation')) {
      const style = document.createElement('style');
      style.id = 'camera-flash-animation';
      style.textContent = `
        @keyframes cameraFlash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(flashOverlay);
    setTimeout(() => flashOverlay.remove(), 300);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        console.error('🚨 [Camera API] Cannot get 2D context from canvas');
        onImageErrorRef.current('Canvas context not available');
        return;
      }

      if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
        devLog.log('⏳ [Camera API] Waiting for video to be ready...');

        const waitForVideo = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video not ready within timeout'));
          }, 3000);

          const checkReady = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
              clearTimeout(timeout);
              devLog.log('✅ [Camera API] Video is now ready');
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };

          checkReady();
        });

        try {
          await waitForVideo;
        } catch (waitError) {
          console.error('🚨 [Camera API] Video not ready for capture:', waitError);
          onImageErrorRef.current('Camera video not ready');
          return;
        }
      }

      devLog.log('📸 [Camera API] Video element state:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: video.currentTime,
        paused: video.paused,
      });

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('🚨 [Camera API] Invalid video dimensions');
        onImageErrorRef.current('Invalid camera video dimensions');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      devLog.log('📸 [Camera API] Canvas dimensions set:', {
        width: canvas.width,
        height: canvas.height,
      });

      const drawStartTime = performance.now();

      if (facingMode === 'user') {
        context.scale(-1, 1);
        context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        context.scale(-1, 1);
      } else {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const drawTime = performance.now() - drawStartTime;

      devLog.log('✅ [Camera API] Video frame drawn to canvas in', Math.round(drawTime), 'ms');

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((pixel) => pixel !== 0);

      if (!hasContent) {
        console.error('🚨 [Camera API] Canvas appears to be empty');
        onImageErrorRef.current('Failed to capture image - empty frame');
        return;
      }

      const blobStartTime = performance.now();
      const blobPromise = new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      const blob = await blobPromise;
      const blobTime = performance.now() - blobStartTime;
      devLog.log('⏱️ [Camera API] Canvas to blob conversion time:', Math.round(blobTime), 'ms');

      if (blob && blob.size > 0) {
        devLog.log('📸 [Camera API] Photo blob created:', {
          size: blob.size,
          type: blob.type,
          sizeKB: Math.round(blob.size / 1024),
        });

        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        const preview = URL.createObjectURL(file);

        devLog.log('📸 [Camera API] Photo file created:', {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        });

        await onPhotoCapturedRef.current(file, preview);

        devLog.log('✅ [Camera API] Photo uploaded successfully');

        stopCamera();
      } else {
        console.error('🚨 [Camera API] Failed to create blob from canvas or blob is empty');
        onImageErrorRef.current('Failed to capture photo - image processing failed');
        return;
      }

      trackEvent('photo_capture', {
        method: 'camera',
        facing_mode: facingMode,
        page: 'upload',
        canvas_width: canvas.width,
        canvas_height: canvas.height,
        draw_time_ms: Math.round(drawTime),
        blob_size_kb: blob ? Math.round(blob.size / 1024) : 0,
      });

      devLog.log('🎉 [Camera API] Photo capture process completed successfully');

      captureTimeoutRef.current = null;
    } catch (error) {
      console.error('🚨 [Camera API] Photo capture error:', error);

      if (error instanceof Error) {
        console.error('🚨 [Camera API] Capture error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      onImageErrorRef.current('Failed to capture photo');
    }
  };

  const switchCamera = (): void => {
    const newFacingMode: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    devLog.log('🔄 [Camera API] Switching camera from', facingMode, 'to', newFacingMode);

    setFacingMode(newFacingMode);

    trackEvent('camera_switch', {
      from_facing_mode: facingMode,
      to_facing_mode: newFacingMode,
      page: 'upload',
    });
  };

  const testCameraAPI = (): void => {
    devLog.log('\n🧪 [Camera API Test] Starting comprehensive camera API test...');
    devLog.log('='.repeat(50));

    devLog.log('🧪 [Test 1] Browser support check:');
    devLog.log('   - navigator.mediaDevices:', !!navigator.mediaDevices);
    devLog.log('   - getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
    devLog.log('   - enumerateDevices:', !!navigator.mediaDevices?.enumerateDevices);

    devLog.log('🧪 [Test 2] Current camera state:');
    devLog.log('   - isCameraActive:', isCameraActive);
    devLog.log('   - facingMode:', facingMode);
    devLog.log('   - cameraError:', cameraError);
    devLog.log('   - stream:', stream ? 'Active' : 'None');
    devLog.log('   - videoRef.current:', !!videoRef.current);
    devLog.log('   - canvasRef.current:', !!canvasRef.current);

    if (videoRef.current) {
      const video = videoRef.current;
      devLog.log('🧪 [Test 3] Video element details:');
      devLog.log('   - videoWidth:', video.videoWidth);
      devLog.log('   - videoHeight:', video.videoHeight);
      devLog.log('   - readyState:', video.readyState);
      devLog.log('   - currentTime:', video.currentTime);
      devLog.log('   - paused:', video.paused);
      devLog.log('   - srcObject:', !!video.srcObject);
    }

    if (stream) {
      devLog.log('🧪 [Test 4] Media stream details:');
      devLog.log('   - id:', stream.id);
      devLog.log('   - active:', stream.active);
      devLog.log('   - videoTracks:', stream.getVideoTracks().length);

      stream.getVideoTracks().forEach((track, index) => {
        const settings = track.getSettings();
        devLog.log(`   - Track ${index + 1}:`, {
          label: track.label,
          readyState: track.readyState,
          width: settings.width,
          height: settings.height,
          facingMode: settings.facingMode,
        });
      });
    }

    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          devLog.log('🧪 [Test 5] Available video devices:');
          devLog.log('   - Total devices:', devices.length);
          devLog.log('   - Video devices:', videoDevices.length);
          videoDevices.forEach((device, index) => {
            devLog.log(`   - Device ${index + 1}:`, {
              deviceId: device.deviceId.substring(0, 20) + '...',
              label: device.label || 'Unknown Camera',
            });
          });
        })
        .catch((err) => console.error('   - Device enumeration failed:', err));
    }

    devLog.log('='.repeat(50));
    devLog.log('🧪 [Camera API Test] Test completed. Check logs above for details.\n');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────────────────────────────────

  // Start camera on mount (and when sessionId becomes available).
  useEffect(() => {
    devLog.log('🚀 [Camera API] Component mounted, starting camera...');
    devLog.log('🚀 [Camera API] Current URL:', window.location.href);
    devLog.log('🚀 [Camera API] Session ID:', sessionId);
    devLog.log('🚀 [Camera API] Browser info:', {
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      platform: navigator.platform,
      vendor: navigator.vendor,
    });

    devLog.log('📄 [Camera API] Document state:', {
      readyState: document.readyState,
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
    });

    devLog.log('🔒 [Camera API] Security context:', {
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      origin: window.location.origin,
    });

    if (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('pca-hijab')
    ) {
      devLog.log('💡 [DEBUG] To show camera debug panel, run this in console:');
      devLog.log('     document.getElementById("camera-debug-panel").style.display = "block"');

      (window as unknown as { debugCamera: unknown }).debugCamera = {
        showPanel: () => {
          const panel = document.getElementById('camera-debug-panel');
          if (panel) panel.style.display = 'block';
        },
        hidePanel: () => {
          const panel = document.getElementById('camera-debug-panel');
          if (panel) panel.style.display = 'none';
        },
        getState: () => ({
          sessionId,
          isCameraActive,
          cameraInitialized,
          cameraError,
          stream: !!stream,
          videoRef: !!videoRef.current,
          canvasRef: !!canvasRef.current,
        }),
      };
      devLog.log(
        '💡 [DEBUG] Also available: window.debugCamera.showPanel(), window.debugCamera.getState()',
      );
    }

    if (navigator.mediaDevices) {
      devLog.log('✅ [Camera API] MediaDevices API exists');
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((device) => device.kind === 'videoinput');
          devLog.log('📹 [Camera API] Available video devices:', videoDevices.length);
          videoDevices.forEach((device, index) => {
            devLog.log(`📹 [Camera API] Video device ${index + 1}:`, {
              deviceId: device.deviceId,
              label: device.label || 'Unknown Camera',
              kind: device.kind,
              groupId: device.groupId,
            });
          });

          if (videoDevices.length === 0) {
            console.error('❌ [Camera API] No video input devices found!');
          }
        })
        .catch((err) => {
          console.error('🚨 [Camera API] Error enumerating devices:', err);
          console.error('🚨 [Camera API] Enumerate error details:', {
            name: (err as Error).name,
            message: (err as Error).message,
            stack: (err as Error).stack,
          });
        });
    } else {
      console.error('❌ [Camera API] MediaDevices API not available!');
    }

    if (!sessionId) {
      devLog.log('⏸️ [Camera API] Skipping camera init - no session, will redirect');
      return;
    }

    let isMounted = true;

    const initTimeout = setTimeout(() => {
      const startCameraWhenReady = () => {
        if (!isMounted) {
          devLog.log('🛑 [Camera API] Component unmounted, stopping initialization loop');
          return;
        }

        devLog.log('🔍 [Camera API] Checking refs availability...', {
          videoRef: !!videoRef.current,
          canvasRef: !!canvasRef.current,
          isMounted,
        });

        if (videoRef.current && canvasRef.current) {
          devLog.log('✅ [Camera API] Refs are ready, starting camera');
          startCamera();
        } else if (isMounted) {
          devLog.log('⏳ [Camera API] Refs not ready yet, waiting...');
          setTimeout(startCameraWhenReady, 100);
        }
      };

      startCameraWhenReady();
    }, 100);

    return () => {
      devLog.log('🔚 [Camera API] Component unmounting, cleaning up...');
      isMounted = false;
      clearTimeout(initTimeout);
      stopCamera();
      stopFaceDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Restart camera when facing mode changes.
  useEffect(() => {
    devLog.log('🔄 [Camera API] Facing mode changed to:', facingMode);

    if (!sessionId) {
      devLog.log('⏸️ [Camera API] Skipping camera restart - no session');
      return;
    }

    if (isCameraActive) {
      devLog.log('🔄 [Camera API] Restarting camera with new facing mode...');
      stopCamera();

      let isMounted = true;

      const restartCameraWhenReady = () => {
        if (!isMounted) {
          devLog.log('🛑 [Camera API] Effect cleaned up, stopping restart loop');
          return;
        }

        devLog.log('🔍 [Camera API] Checking refs for restart...', {
          videoRef: !!videoRef.current,
          canvasRef: !!canvasRef.current,
          isMounted,
        });

        if (videoRef.current && canvasRef.current) {
          devLog.log('✅ [Camera API] Refs ready for restart, starting camera');
          startCamera();
        } else if (isMounted) {
          devLog.log('⏳ [Camera API] Refs not ready for restart, waiting...');
          setTimeout(restartCameraWhenReady, 100);
        }
      };

      restartCameraWhenReady();

      return () => {
        isMounted = false;
      };
    } else {
      devLog.log('ℹ️ [Camera API] Camera not active, skipping restart');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, sessionId]);

  // Initialize face detector service on mount.
  useEffect(() => {
    devLog.log('🚀 [FACE DETECTION] Initializing face detector...');
    faceDetectionService
      .initialize()
      .then((result) => {
        devLog.log('✅ [FACE DETECTION] Face detector initialized, result:', result);
      })
      .catch((err) => {
        console.error('❌ [FACE DETECTION] Failed to initialize face detector:', err);
      });
  }, []);

  return {
    videoRef,
    canvasRef,
    ellipseRef,
    stream,
    isCameraActive,
    facingMode,
    cameraError,
    cameraInitialized,
    faceDetected,
    faceWellPositioned,
    faceDistance,
    facePosition,
    captureCountdown,
    startCamera,
    stopCamera,
    switchCamera,
    startFaceDetection,
    testCameraAPI,
  };
};
