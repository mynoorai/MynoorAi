import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { compressImage } from '@/utils/helpers';
import { useAppStore } from '@/store';
import {
  trackDropOff,
  trackEngagement,
  trackError,
  trackEvent,
  trackImageUpload,
} from '@/utils/analytics';
import { faceDetectionService } from '@/services/faceDetectionService';
import { getBrowserOptimizationSettings, isIOS, isSafari } from '@/utils/browserDetection';
import { PerformanceMonitor, getDeviceProfile } from '@/utils/deviceProfile';
import { detectInAppBrowser, getInAppBrowserWarning } from '@/utils/inAppBrowserDetection';
import { sessionRecoveryHelpers } from '@/store/instagramPersistence';
import { devLog } from '@/utils/devLog';
import arrowBack from '@/assets/arrow_back.png';
import xIcon from '@/assets/X.png';
import checkIcon from '@/assets/check.png';
import UploadDebugPanel from './upload/UploadDebugPanel';
import BrowserWarningBanner from './upload/BrowserWarningBanner';
import UploadErrorDisplay from './upload/UploadErrorDisplay';
import DevCameraTestButton from './upload/DevCameraTestButton';
import FaceValidationOverlay from './upload/FaceValidationOverlay';
import CameraLoadingState from './upload/CameraLoadingState';
import CameraErrorState from './upload/CameraErrorState';
import { useCameraCapture } from './upload/useCameraCapture';

const UploadPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { sessionId, instagramId, setSessionData, setUploadedImage, setLoading, setError, error } =
    useAppStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isValidatingFace, setIsValidatingFace] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [browserWarning, setBrowserWarning] = useState<string | null>(null);
  const performanceMonitor = useRef<PerformanceMonitor>(new PerformanceMonitor());

  // Camera + face detection state is owned by the custom hook.
  const camera = useCameraCapture({
    sessionId,
    onPhotoCaptured: async (file, preview) => {
      await handleImageUpload(file, preview);
    },
    onImageError: (message) => handleImageError(message),
  });

  // Image-validation FaceDetector instance (separate from live camera detection).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let faceDetector: any = null;

  // Calculate responsive scale factor
  useEffect(() => {
    const calculateScale = () => {
      const BASE_W = 402;
      const BASE_H = 874;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const scaleX = vw / BASE_W;
      const scaleY = vh / BASE_H;

      const scale = Math.min(scaleX, scaleY) * 0.95;

      setScaleFactor(scale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);

    return () => {
      window.removeEventListener('resize', calculateScale);
    };
  }, []);

  // Check session with recovery attempts for Instagram browser
  useEffect(() => {
    devLog.log('🔍 [UploadPage] Checking session, sessionId:', sessionId);
    devLog.log('🔍 [UploadPage] Page load time:', new Date().toISOString());

    const checkAndRecoverSession = async () => {
      if (!sessionId) {
        devLog.log('⚠️ [UploadPage] No session in store, attempting recovery...');

        const recoveredSession = await sessionRecoveryHelpers.recoverSessionFromAnywhere();

        if (recoveredSession) {
          devLog.log('✅ [UploadPage] Session recovered:', recoveredSession);
          setSessionData(recoveredSession, instagramId || undefined);

          trackEvent('session_recovered', {
            page: 'upload',
            recovery_source: 'instagram_browser',
            timestamp: new Date().toISOString(),
          });
        } else {
          const browserInfo = detectInAppBrowser();
          if (browserInfo.isInAppBrowser && browserInfo.browserName === 'instagram') {
            console.warn('📱 [UploadPage] Instagram browser detected, showing recovery prompt');

            setError(
              'Session lost in Instagram browser. Please tap "..." menu and "Open in Safari/Chrome" for better experience.',
            );

            setTimeout(() => {
              devLog.log('❌ [UploadPage] No session recovered, redirecting to start...');
              trackDropOff('upload_page', 'no_session_instagram');
              navigate(ROUTES.LANDING);
            }, 2000);
          } else {
            devLog.log('❌ [UploadPage] No session found, redirecting to home...');
            trackDropOff('upload_page', 'no_session');
            navigate(ROUTES.HOME);
          }
        }
      } else {
        devLog.log('✅ [UploadPage] Session found:', sessionId);
        await sessionRecoveryHelpers.saveSessionEverywhere(sessionId);

        trackEvent('page_enter', {
          page: 'upload',
          user_flow_step: 'upload_page_entered',
          has_session: true,
          timestamp: new Date().toISOString(),
        });
      }
    };

    checkAndRecoverSession();
  }, [sessionId, instagramId, navigate, setSessionData, setError]);

  // Check browser compatibility and show warnings
  useEffect(() => {
    const browserSettings = getBrowserOptimizationSettings();
    const deviceProfile = getDeviceProfile();
    const inAppInfo = detectInAppBrowser();

    const inAppWarning = getInAppBrowserWarning();
    if (inAppWarning) {
      setBrowserWarning(inAppWarning);
      console.warn('📱 [In-App Browser] Warning shown:', inAppWarning);

      trackEvent('in_app_browser_detected', {
        browser: inAppInfo.browserName,
        platform: inAppInfo.platform,
        version: inAppInfo.version,
        limitations: JSON.stringify(inAppInfo.limitations),
      });
    } else if (deviceProfile.category === 'low') {
      setBrowserWarning(
        `Your device (${deviceProfile.model}) may experience performance issues. For best experience, try using a newer device.`,
      );
      console.warn('⚠️ [Device Compatibility] Low-end device detected:', deviceProfile);
    } else if (browserSettings.showCompatibilityWarning) {
      const iosVersion = isIOS() ? (navigator.userAgent.match(/OS (\d+)_/) || [])[1] : null;
      if (iosVersion && parseInt(iosVersion) < 14) {
        setBrowserWarning(
          'Your iOS version may have limited support. For best experience, please update to iOS 14 or later.',
        );
        console.warn('⚠️ [Browser Compatibility] Old iOS version detected:', iosVersion);
      }
    }

    if (
      browserSettings.requireHTTPS &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost'
    ) {
      setBrowserWarning('Camera requires HTTPS connection. Please use a secure connection.');
      console.error('🚨 [Browser Compatibility] HTTPS required for camera');
    }

    devLog.log('📊 [System Profile] Complete environment analysis:', {
      inAppBrowser: {
        detected: inAppInfo.isInAppBrowser,
        name: inAppInfo.browserName,
        platform: inAppInfo.platform,
        version: inAppInfo.version,
        deviceInfo: inAppInfo.deviceInfo,
        limitations: inAppInfo.limitations,
      },
      device: {
        model: deviceProfile.model,
        category: deviceProfile.category,
        ram: `${deviceProfile.ram}GB`,
        chipset: deviceProfile.chipset,
        year: deviceProfile.year,
      },
      browser: {
        isSafari: isSafari(),
        isIOS: isIOS(),
        settings: browserSettings,
      },
      recommendations: deviceProfile.recommendedSettings,
      network: {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
      },
    });

    const perfCheckInterval = setInterval(() => {
      const perfData = performanceMonitor.current.checkPerformance();
      if (perfData.suggestion) {
        console.warn('⚠️ [Performance]', perfData.suggestion);
      }
    }, 5000);

    return () => clearInterval(perfCheckInterval);
  }, []);

  // Pre-warm API on component mount (production only)
  useEffect(() => {
    if (import.meta.env.PROD) {
      // Skip health check for now to avoid 404 errors
      // PersonalColorAPI.healthCheck().catch(err => {
      //   devLog.log('API pre-warming failed:', err);
      // });
    }
  }, []);

  const handleImageUpload = async (file: File, preview: string): Promise<void> => {
    setSelectedFile(file);
    setPreviewUrl(preview);
    setError(null);
    setIsValidatingFace(true);

    try {
      if (!faceDetector && 'FaceDetector' in window) {
        try {
          // @ts-expect-error - FaceDetector is experimental
          faceDetector = new window.FaceDetector();
          devLog.log('✅ [Face Validation] FaceDetector initialized for image validation');
        } catch (error) {
          console.warn('⚠️ [Face Validation] Could not initialize FaceDetector:', error);
        }
      }

      const img = new Image();
      img.src = preview;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }
      ctx.drawImage(img, 0, 0);

      let faceDetected = false;
      if (faceDetector) {
        try {
          const faces = await faceDetector.detect(canvas);
          faceDetected = faces && faces.length > 0;
          devLog.log('🔍 [Face Validation] Detected faces in uploaded image:', faces.length);

          if (!faceDetected) {
            setError(
              "Oops! I can't find your face. Let's try another photo with your face clearly visible!",
            );
            setSelectedFile(null);
            setPreviewUrl(null);
            trackImageUpload(false, file.size, file.type, 'no_face_detected');
            trackError('no_face_in_upload', 'No face detected in uploaded image', 'upload_page');
            return;
          }
        } catch (error) {
          console.warn(
            '⚠️ [Face Validation] FaceDetector failed, using faceDetectionService:',
            error,
          );
          try {
            const detectedFace = await faceDetectionService.detectFaceInImage(img);
            faceDetected = detectedFace !== null;

            if (!faceDetected) {
              devLog.log('❌ [Face Validation] No face detected by fallback service');
              setError(
                "Oops! I can't find your face. Let's try another photo with your face clearly visible!",
              );
              setSelectedFile(null);
              setPreviewUrl(null);
              trackImageUpload(false, file.size, file.type, 'no_face_detected');
              return;
            }
          } catch (fallbackError) {
            console.error('❌ [Face Validation] Fallback detection also failed:', fallbackError);
            setError("Hmm, something went wrong. Let's try that again!");
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
          }
        }
      } else {
        devLog.log('🔄 [Face Validation] Using faceDetectionService for validation...');
        try {
          const detectedFace = await faceDetectionService.detectFaceInImage(img);
          faceDetected = detectedFace !== null;

          if (!faceDetected) {
            devLog.log('❌ [Face Validation] No face detected by faceDetectionService');
            setError(
              "Oops! I can't find your face. Let's try another photo with your face clearly visible!",
            );
            setSelectedFile(null);
            setPreviewUrl(null);
            trackImageUpload(false, file.size, file.type, 'no_face_detected');
            trackError('no_face_in_upload', 'No face detected in uploaded image', 'upload_page');
            return;
          } else {
            devLog.log('✅ [Face Validation] Face detected by faceDetectionService');
          }
        } catch (error) {
          console.error('❌ [Face Validation] faceDetectionService failed:', error);
          setError('Face detection failed. Please try again with a clearer photo.');
          setSelectedFile(null);
          setPreviewUrl(null);
          return;
        }
      }

      trackImageUpload(true, file.size, file.type);

      if (preview.includes('blob:') && file.name === 'camera-photo.jpg') {
        devLog.log(
          '📸 [Auto Navigation] Photo from auto-capture detected, proceeding to analysis...',
        );
        setTimeout(() => {
          handleAnalyze();
        }, 500);
      }
    } catch (error) {
      console.error('❌ [Face Validation] Error validating face:', error);
      trackImageUpload(true, file.size, file.type, 'face_validation_error');
    } finally {
      setIsValidatingFace(false);
    }
  };

  const handleImageError = (error: string): void => {
    setError(error);

    trackImageUpload(false, undefined, undefined, error);
    trackError('image_upload_error', error, 'upload_page');
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!selectedFile || !previewUrl) return;

    try {
      setIsCompressing(true);
      setLoading(true);

      trackEvent('button_click', {
        button_name: 'analyze_my_colors',
        page: 'upload',
        file_size_mb: Math.round((selectedFile.size / (1024 * 1024)) * 100) / 100,
        file_type: selectedFile.type,
        user_flow_step: 'analysis_button_clicked',
      });

      trackEngagement('button_click', 'analyze_my_colors_button');

      const compressedFile = await compressImage(selectedFile);

      setUploadedImage(previewUrl, compressedFile);

      navigate(ROUTES.ANALYZING);
    } catch (error) {
      const errorMessage = 'An error occurred while processing the image. Please try again.';
      setError(errorMessage);
      trackError(
        'image_compression_error',
        error instanceof Error ? error.message : 'Unknown error',
        'upload_page',
      );
    } finally {
      setIsCompressing(false);
      setLoading(false);
    }
  };

  // Disable body scroll on mount - more comprehensive like DontWorry page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.touchAction = 'none';

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.position = 'fixed';
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';

      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
    };
  }, []);

  // Prevent touch move events for scroll
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden flex flex-col"
      style={{
        backgroundColor: '#FFF',
        width: '100vw',
        height: '100dvh',
        touchAction: 'none',
        overscrollBehavior: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Browser Warning Banner */}
      <BrowserWarningBanner
        warning={browserWarning}
        scaleFactor={scaleFactor}
        onDismiss={() => setBrowserWarning(null)}
      />

      {/* Header - at the very top */}
      <div
        style={{
          display: 'flex',
          width: `${402 * scaleFactor}px`,
          height: `${88 * scaleFactor}px`,
          padding: `${16 * scaleFactor}px ${4 * scaleFactor}px`,
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: `${4 * scaleFactor}px`,
          background: 'var(--black_white-color-white, #FFF)',
          margin: '0 auto 0 auto',
          marginTop: browserWarning ? `${48 * scaleFactor}px` : 0,
        }}
      >
        {/* Container with arrow positioned absolutely and title centered */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Arrow back icon - positioned absolutely */}
          <img
            src={arrowBack}
            alt="Back"
            style={{
              position: 'absolute',
              left: '0',
              width: `${40 * scaleFactor}px`,
              height: `${40 * scaleFactor}px`,
              cursor: 'pointer',
            }}
            onClick={() => navigate(ROUTES.DONTWORRY)}
          />

          {/* Upload Your Photo title - centered */}
          <h1
            style={{
              color: 'var(--black_white-color-black, #000)',
              textAlign: 'center',
              fontFamily: '"Plus Jakarta Sans"',
              fontSize: `${24 * scaleFactor}px`,
              fontStyle: 'normal',
              fontWeight: 800,
              lineHeight: '140%' /* 33.6px */,
              margin: 0,
            }}
          >
            Upload Your Photo
          </h1>
        </div>
      </div>

      {/* Main Photo Area */}
      <div
        style={{
          width: `${348.345 * scaleFactor}px`,
          height: `${667 * scaleFactor}px`,
          flexShrink: 0,
          borderRadius: `${10 * scaleFactor}px`,
          margin: `${20 * scaleFactor}px auto`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Photo Preview/Camera Area */}
        <div
          className="relative"
          style={{
            width: `${348.345 * scaleFactor}px`,
            height: `${667 * scaleFactor}px`,
          }}
        >
          {/* Always render video and canvas elements outside conditional rendering for refs */}
          <video
            ref={camera.videoRef}
            className={`absolute inset-0 w-full h-full object-cover ${
              !previewUrl && camera.isCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } ${camera.facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            style={{
              borderRadius: `${10 * scaleFactor}px`,
              zIndex: 1,
            }}
            autoPlay
            playsInline
            muted
          />
          <canvas ref={camera.canvasRef} className="absolute opacity-0 pointer-events-none" />

          {/* Face detection guide overlay - Always show when no preview */}
          {!previewUrl && (
            <>
              {/* Masking overlay with elliptical cutout using SVG */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: `${348.345 * scaleFactor}px`,
                  height: `${667 * scaleFactor}px`,
                  zIndex: 10,
                }}
                viewBox={`0 0 348.345 667`}
                preserveAspectRatio="none"
              >
                <defs>
                  <mask id="ellipse-mask">
                    {/* White background = visible */}
                    <rect x="0" y="0" width="348.345" height="667" fill="white" />
                    {/* Black ellipse = transparent (cutout) */}
                    {/* Position: exact center - container height 667, center Y = 667/2 = 333.5 */}
                    <ellipse
                      ref={camera.ellipseRef}
                      cx="174.1725"
                      cy="333.5"
                      rx="149.5"
                      ry="199.5"
                      fill="black"
                    />
                  </mask>
                </defs>

                {/* Apply mask to colored rectangle */}
                <rect
                  x="0"
                  y="0"
                  width="348.345"
                  height="667"
                  mask="url(#ellipse-mask)"
                  fill={
                    !camera.faceDetected
                      ? 'rgba(176, 176, 175, 0.6)' // No face detected - gray
                      : camera.captureCountdown !== null || camera.faceWellPositioned
                        ? 'rgba(209, 227, 219, 0.6)' // Ready to capture - green
                        : 'rgba(230, 176, 175, 0.6)' // Face not in position - red
                  }
                  rx={10}
                />
              </svg>

              {/* Ellipse guide with dynamic color */}
              <div
                className="absolute pointer-events-none"
                style={{
                  zIndex: 11,
                  top: `${134 * scaleFactor}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                <div
                  style={{
                    width: `${299 * scaleFactor}px`,
                    height: `${399 * scaleFactor}px`,
                    borderRadius: '50%',
                    border: `${5 * scaleFactor}px dashed`,
                    borderColor:
                      camera.captureCountdown !== null
                        ? '#97EFD0' // Countdown
                        : camera.faceDetected && !camera.faceWellPositioned
                          ? '#FF0000' // Face detected but not in position
                          : '#FFFFFF', // Default white
                    boxSizing: 'border-box',
                  }}
                  className={`${!camera.faceDetected ? 'animate-pulse' : ''}`}
                />
              </div>
            </>
          )}

          {/* Auto capture countdown - centered semi-transparent number */}
          {!previewUrl && camera.isCameraActive && camera.captureCountdown !== null && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ zIndex: 20 }}
            >
              <div
                className="text-white animate-pulse"
                style={{
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  fontSize: `${120 * scaleFactor}px`,
                  fontWeight: 800,
                  textShadow: '0 0 20px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)',
                  opacity: 0.9,
                }}
              >
                {camera.captureCountdown}
              </div>
            </div>
          )}

          {/* Bottom instruction container - hide during capture countdown to prevent Safari delay issues */}
          {!previewUrl && camera.isCameraActive && camera.captureCountdown === null && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${558 * scaleFactor}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 15,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: `${266 * scaleFactor}px`,
                  minHeight: `${44 * scaleFactor}px`,
                  padding: `${15 * scaleFactor}px`,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: `${10 * scaleFactor}px`,
                  borderRadius: `${10 * scaleFactor}px`,
                  border:
                    camera.faceDetected &&
                    !camera.faceWellPositioned &&
                    camera.captureCountdown === null
                      ? `${2 * scaleFactor}px solid var(--Color-9, #F00)`
                      : 'none',
                  background: camera.faceWellPositioned ? '#97EFD0' : 'var(--Color-7, #FFF)',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                {/* X icon - only show when red border is visible */}
                {camera.faceDetected &&
                  !camera.faceWellPositioned &&
                  camera.captureCountdown === null && (
                    <img
                      src={xIcon}
                      alt=""
                      style={{
                        width: `${24 * scaleFactor}px`,
                        height: `${24 * scaleFactor}px`,
                        flexShrink: 0,
                      }}
                    />
                  )}
                {/* Check icon - only show when face is well positioned */}
                {camera.faceWellPositioned && (
                  <img
                    src={checkIcon}
                    alt=""
                    style={{
                      width: `${24 * scaleFactor}px`,
                      height: `${24 * scaleFactor}px`,
                      flexShrink: 0,
                    }}
                  />
                )}
                {camera.faceWellPositioned ? (
                  <span
                    style={{
                      color: 'var(--Color-5, #000)',
                      textAlign: 'center',
                      fontFamily: 'Pretendard',
                      fontSize: `${15 * scaleFactor}px`,
                      fontStyle: 'normal',
                      fontWeight: 700,
                      lineHeight: '140%' /* 21px */,
                      margin: 0,
                    }}
                  >
                    Perfect! You look amazing!
                    <br />
                    Capturing in 3 seconds...
                  </span>
                ) : (
                  <span
                    style={{
                      color: '#000',
                      textAlign: 'center',
                      fontFamily: 'Pretendard',
                      fontSize: `${15 * scaleFactor}px`,
                      fontWeight: 700,
                      lineHeight: '140%' /* 21px */,
                      wordBreak: 'keep-all',
                      whiteSpace: 'pre-line',
                      maxWidth: '100%',
                      margin: 0,
                    }}
                  >
                    {!camera.faceDetected ? (
                      <>Say cheese!</>
                    ) : camera.faceDistance === 'too_far' ? (
                      <>
                        Come a bit closer,
                        <br />I can barely see you!
                      </>
                    ) : camera.faceDistance === 'too_close' ? (
                      <>
                        Whoa, too close!
                        <br />
                        Back up a little
                      </>
                    ) : camera.facePosition === 'left' ? (
                      <>
                        Scoot a bit
                        <br />
                        to your left
                      </>
                    ) : camera.facePosition === 'right' ? (
                      <>
                        Scoot a bit
                        <br />
                        to your right
                      </>
                    ) : camera.facePosition === 'up' ? (
                      <>
                        Move down
                        <br />
                        just a touch
                      </>
                    ) : camera.facePosition === 'down' ? (
                      <>
                        Lift your chin
                        <br />
                        up a bit
                      </>
                    ) : (
                      <>
                        Center yourself
                        <br />
                        in the frame
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
          {previewUrl ? (
            // Show captured photo - NO guides or overlays after capture
            <div
              className="relative w-full h-full overflow-hidden bg-white"
              style={{
                borderRadius: `${10 * scaleFactor}px`,
              }}
            >
              <img
                src={previewUrl}
                alt="Captured photo"
                className="w-full h-full object-cover"
                style={{
                  borderRadius: `${10 * scaleFactor}px`,
                }}
              />
              {/* Face validation loading overlay */}
              <FaceValidationOverlay visible={isValidatingFace} scaleFactor={scaleFactor} />
            </div>
          ) : (
            // Show live camera feed
            <div
              className="relative w-full h-full overflow-hidden"
              style={{
                borderRadius: `${10 * scaleFactor}px`,
                backgroundColor: 'transparent',
              }}
            >
              {/* Show error only if there's an actual camera error */}
              <CameraErrorState
                cameraError={camera.cameraError}
                scaleFactor={scaleFactor}
                onUploadFallback={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';

                  const browserInfo = detectInAppBrowser();
                  if (browserInfo.isInAppBrowser && browserInfo.browserName === 'instagram') {
                    input.setAttribute('capture', 'environment');
                    devLog.log('📱 [Upload] Instagram browser detected, added capture attribute');
                  }

                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      try {
                        const preview = URL.createObjectURL(file);
                        await handleImageUpload(file, preview);
                      } catch {
                        handleImageError('Failed to process image');
                      }
                    }
                  };
                  input.click();
                }}
              />

              {/* Show loading only when camera is not initialized and no error */}
              <CameraLoadingState
                visible={!camera.cameraInitialized && !camera.cameraError && !previewUrl}
                scaleFactor={scaleFactor}
              />
            </div>
          )}
        </div>

        {/* Error Display */}
        <UploadErrorDisplay error={error} scaleFactor={scaleFactor} />
      </div>

      {/* Debug Controls (Development only) */}
      <DevCameraTestButton scaleFactor={scaleFactor} onTest={camera.testCameraAPI} />

      {/* Bottom Controls */}
      <div
        style={{
          paddingBottom: `max(${80 * scaleFactor}px, env(safe-area-inset-bottom))`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${16 * scaleFactor}px`,
            padding: `0 ${32 * scaleFactor}px`,
          }}
        >
          {/* Gallery/Upload Button */}
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';

              const browserInfo = detectInAppBrowser();
              if (browserInfo.isInAppBrowser && browserInfo.browserName === 'instagram') {
                input.setAttribute('capture', 'environment');
                devLog.log('📱 [Upload] Instagram browser file input optimized');
              }

              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  try {
                    const preview = URL.createObjectURL(file);
                    await handleImageUpload(file, preview);
                  } catch {
                    handleImageError('Failed to process image');
                  }
                }
              };
              input.click();
            }}
            disabled={isCompressing}
            style={{
              width: `${48 * scaleFactor}px`,
              height: `${48 * scaleFactor}px`,
              flexShrink: 0,
              borderRadius: '50%',
              backgroundColor: '#606060',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: isCompressing ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isCompressing) {
                e.currentTarget.style.backgroundColor = '#505050';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#606060';
            }}
          >
            <svg
              style={{ width: `${24 * scaleFactor}px`, height: `${24 * scaleFactor}px` }}
              fill="none"
              stroke="white"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>

          {/* Analyze Button - Always visible, disabled when no photo */}
          <button
            onClick={previewUrl ? handleAnalyze : undefined}
            disabled={!previewUrl || isCompressing}
            style={{
              display: 'flex',
              width: `${198 * scaleFactor}px`,
              height: `${57 * scaleFactor}px`,
              padding: `${10 * scaleFactor}px ${16 * scaleFactor}px`,
              justifyContent: 'center',
              alignItems: 'center',
              gap: `${10 * scaleFactor}px`,
              flexShrink: 0,
              borderRadius: `${10 * scaleFactor}px`,
              background: !previewUrl ? '#E0E0E0' : isCompressing ? '#E0E0E0' : '#FFF3A1',
              border: 'none',
              transition: 'all 0.2s ease',
              opacity: !previewUrl ? 0.5 : isCompressing ? 0.7 : 1,
              cursor: !previewUrl ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (previewUrl && !isCompressing) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 19, 137, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onTouchStart={(e) => {
              if (previewUrl && !isCompressing) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isCompressing ? (
              <div className="flex items-center gap-2">
                <svg
                  className="animate-spin"
                  style={{ width: `${20 * scaleFactor}px`, height: `${20 * scaleFactor}px` }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#3B1389"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="#3B1389"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span
                  style={{
                    color: '#3B1389',
                    textAlign: 'center',
                    fontFamily: 'Pretendard',
                    fontSize: `${20 * scaleFactor}px`,
                    fontWeight: 700,
                    lineHeight: '140%',
                  }}
                >
                  Getting ready...
                </span>
              </div>
            ) : (
              <span
                style={{
                  color: !previewUrl ? '#999' : '#3B1389',
                  textAlign: 'center',
                  fontFamily: 'Pretendard',
                  fontSize: `${20 * scaleFactor}px`,
                  fontWeight: 700,
                  lineHeight: '140%',
                }}
              >
                Color Me!
              </span>
            )}
          </button>

          {/* Retry Button - Active only after photo is taken */}
          <button
            onClick={() => {
              if (previewUrl) {
                // Reset to live camera view
                setPreviewUrl(null);
                setSelectedFile(null);
                setError(null);
                // Restart camera
                if (!camera.isCameraActive) {
                  camera.startCamera();
                }
                // Restart face detection
                camera.startFaceDetection();
              }
            }}
            disabled={!previewUrl}
            style={{
              width: `${48 * scaleFactor}px`,
              height: `${48 * scaleFactor}px`,
              flexShrink: 0,
              borderRadius: '50%',
              backgroundColor: !previewUrl ? '#D0D0D0' : '#3B1389',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: !previewUrl ? 'not-allowed' : 'pointer',
              opacity: !previewUrl ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (previewUrl) {
                e.currentTarget.style.backgroundColor = '#2A0F68';
              }
            }}
            onMouseLeave={(e) => {
              if (previewUrl) {
                e.currentTarget.style.backgroundColor = '#3B1389';
              }
            }}
          >
            {/* Refresh Icon - Single Arrow (Flipped) */}
            <svg
              style={{
                width: `${24 * scaleFactor}px`,
                height: `${24 * scaleFactor}px`,
                transform: 'scaleX(-1)',
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Debug Panel - Show in production for diagnosing camera issues */}
      <UploadDebugPanel
        sessionId={sessionId}
        isCameraActive={camera.isCameraActive}
        cameraInitialized={camera.cameraInitialized}
        cameraError={camera.cameraError}
        stream={camera.stream}
        onRetryCamera={() => {
          devLog.log('🔄 Attempting to restart camera...');
          camera.stopCamera();
          setTimeout(() => camera.startCamera(), 100);
        }}
      />
    </div>
  );
};

export default UploadPage;
