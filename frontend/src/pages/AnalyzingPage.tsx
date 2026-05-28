import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { ANALYSIS_STEPS, ROUTES, COLOR_COMPARISON_FLOWS } from '@/utils/constants';
import { useAppStore } from '@/store';
import { analyzeImage } from '@/services/api';
import {
  trackAIAnalysis,
  trackEvent,
  trackError,
  trackDropOff,
  trackEngagement,
} from '@/utils/analytics';
import { ImageAnalysisError } from '@/components/ui/ImageAnalysisError/ImageAnalysisError';
import { parseImageAnalysisError, ImageAnalysisErrorType } from '@/utils/imageAnalysisErrors';
const FaceLandmarkVisualization = lazy(
  () => import('@/components/analysis/FaceLandmarkVisualization'),
);
import { updateSessionWithRecovery } from '@/utils/sessionHelper';
import guideBackground from '@/assets/가이드배경.jpg';
import analysisCharacter from '@/assets/분석캐릭터.png';
import { devLog } from '@/utils/devLog';

const AnalyzingPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { uploadedFile, sessionId, uploadedImage, analysisResult, setAnalysisResult } =
    useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ImageAnalysisErrorType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLandmarkVisualization, setShowLandmarkVisualization] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [canSkip, setCanSkip] = useState(false);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false); // Track if API analysis is done
  const [scaleFactor, setScaleFactor] = useState(1);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [characterImageBroken, setCharacterImageBroken] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analysisAbortControllerRef = useRef<AbortController | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate optimal scale to prevent overlapping
  useEffect(() => {
    const calculateScale = () => {
      const BASE_W = 402;
      const BASE_H = 874;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Calculate scale based on both width and height to maintain aspect ratio
      const scaleX = vw / BASE_W;
      const scaleY = vh / BASE_H;

      // Use the smaller scale to ensure everything fits without overlapping
      const scale = Math.min(scaleX, scaleY) * 0.95; // 0.95 for safety margin

      setScaleFactor(scale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);

    return () => {
      window.removeEventListener('resize', calculateScale);
    };
  }, []);

  // Redirect if no image and track page entry
  useEffect(() => {
    // Check if we have the necessary data
    if (!uploadedFile && !uploadedImage) {
      devLog.log('[AnalyzingPage] No uploaded file or image, checking session...');

      // If we have a sessionId, try to recover from session
      if (sessionId) {
        // TODO: Implement session recovery to get uploadedImageUrl from backend
        devLog.log('[AnalyzingPage] Session found but image recovery not implemented yet');
      }

      // Track drop-off if user arrives without proper data
      trackDropOff('analyzing_page', 'missing_upload_data');

      // Show error briefly before redirecting
      setError('Image failed to load properly. Please try refreshing.');
      setErrorType('NO_FACE_DETECTED' as ImageAnalysisErrorType);

      // Redirect after a short delay to let user see the error
      setTimeout(() => {
        navigate(ROUTES.DIAGNOSIS);
      }, 2000);

      return;
    }

    // We have the uploaded file or image
    trackEvent('page_enter', {
      page: 'analyzing',
      user_flow_step: 'analyzing_page_entered',
      file_size_mb: uploadedFile ? Math.round((uploadedFile.size / (1024 * 1024)) * 100) / 100 : 0,
      file_type: uploadedFile?.type || 'recovered',
    });

    // Create image URL for visualization
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setImageUrl(url);

      // Cleanup URL when component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (uploadedImage) {
      // uploadedImage is already a string URL
      setImageUrl(uploadedImage);
    }
  }, [uploadedFile, uploadedImage, sessionId, navigate]);

  // Start analysis on mount - immediately start both UI and API in parallel
  useEffect(() => {
    if (uploadedFile && !isAnalyzing) {
      setIsAnalyzing(true);

      // Track AI analysis start
      trackEvent('ai_analysis_start', {
        file_size_mb: Math.round((uploadedFile.size / (1024 * 1024)) * 100) / 100,
        file_type: uploadedFile.type,
        user_flow_step: 'ai_analysis_initiated',
        start_timestamp: new Date().toISOString(),
      });

      trackEngagement('ai_analysis', 'analysis_start');

      // Start API call immediately in background
      performAnalysis();

      // Start UI animation flow immediately (don't wait for API)
      // This allows UI to progress while API processes
      setCurrentStep(0);

      // Safety timeout - force close popup after 35 seconds if still showing
      const safetyTimeout = setTimeout(() => {
        if (isAnalyzing && !analysisComplete && !error) {
          console.warn('[AnalyzingPage] Force closing analysis popup after timeout');
          setIsAnalyzing(false);
        }
      }, 35000); // 35 seconds (5 seconds buffer after the 30-second API timeout)

      return () => clearTimeout(safetyTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFile]);

  // Cleanup effect - Clear timeouts and abort controllers on unmount
  useEffect(() => {
    return () => {
      // Clear navigation timeout if exists
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }

      // Abort any ongoing analysis
      if (analysisAbortControllerRef.current) {
        analysisAbortControllerRef.current.abort();
        analysisAbortControllerRef.current = null;
      }

      // Clear step timer if exists
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
        stepTimerRef.current = null;
      }

      // Reset analysis state to prevent lingering popup
      setIsAnalyzing(false);
    };
  }, []);

  // Progress animation with tracking
  useEffect(() => {
    if (currentStep < ANALYSIS_STEPS.length) {
      const step = ANALYSIS_STEPS[currentStep];

      // Enable skip for draping phases and final result
      const isDrapingPhase =
        step.id === 'warm-cool-comparison' ||
        step.id === 'season-comparison' ||
        step.id === 'final-result';

      // Allow skip if it's a draping phase OR if analysis is already complete
      // For Step 1, start with disabled and wait for scan completion
      if (currentStep === 0) {
        // Step 1: canSkip will be set to true when scan completes via onLandmarksDetected
        // Don't override if already set by scan completion
      } else {
        setCanSkip(isDrapingPhase || analysisComplete);
      }

      // Show navigation buttons for phases 3, 4, and 5 OR if analysis is complete
      setShowNavButtons(isDrapingPhase || analysisComplete);

      // Set progress immediately
      setProgress(step.progress);

      // Show visualization immediately
      if (currentStep < ANALYSIS_STEPS.length) {
        setShowLandmarkVisualization(true);
      } else {
        setShowLandmarkVisualization(false);
      }

      // Track progress milestones
      trackEvent('analysis_progress', {
        step_number: currentStep + 1,
        step_name: step.message,
        progress_percentage: step.progress,
        user_flow_step: 'analysis_progress_update',
      });

      // Auto-advance with shorter durations for better UX
      // Reduce wait times while maintaining smooth transitions
      if (!isDrapingPhase && !analysisComplete && currentStep !== 0) {
        // Reduce durations by 40% for faster progression
        const reducedDuration = Math.max(step.duration * 0.6, 1000); // Min 1 second
        stepTimerRef.current = setTimeout(() => {
          if (currentStep < ANALYSIS_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
          }
        }, reducedDuration);
      }
      // For Step 1, draping phases, or when analysis is complete, wait for user interaction (no timer)

      return () => {
        if (stepTimerRef.current) {
          clearTimeout(stepTimerRef.current);
        }
      };
    }
    return undefined;
  }, [currentStep, imageUrl, analysisComplete]);

  const performAnalysis = async (): Promise<void> => {
    if (!uploadedFile) return;

    devLog.log('[AnalyzingPage] performAnalysis started - isAnalyzing:', isAnalyzing);
    try {
      devLog.log('Starting analysis for file:', uploadedFile.name);

      // Track analysis start
      const startTime = Date.now();
      setAnalysisStartTime(startTime);

      // Call AI API
      const result = await analyzeImage(uploadedFile);

      // Calculate analysis time
      const analysisTime = Date.now() - startTime;

      devLog.log('Analysis successful:', result);

      // Track successful AI analysis with enhanced data
      trackAIAnalysis({
        personalColorType: result.personal_color_en,
        season: result.personal_color_en.toLowerCase().split(' ')[0],
        tone: result.personal_color_en.toLowerCase().split(' ')[1] || 'neutral',
        confidence: result.confidence || 0,
        processingTime: analysisTime,
        analysisId: sessionId,
      });

      // Track detailed analysis success
      trackEvent('ai_analysis_success', {
        personal_color: result.personal_color_en,
        confidence_score: Math.round((result.confidence || 0) * 100),
        processing_time_ms: analysisTime,
        file_size_mb: Math.round((uploadedFile.size / (1024 * 1024)) * 100) / 100,
        file_type: uploadedFile.type,
        analysis_quality:
          (result.confidence || 0) > 0.8
            ? 'high'
            : (result.confidence || 0) > 0.6
              ? 'medium'
              : 'low',
        user_flow_step: 'analysis_completed_successfully',
      });

      // Store result
      setAnalysisResult(result);

      // Mark analysis as complete - this will allow skipping through UI steps
      setAnalysisComplete(true);

      // IMPORTANT: Set isAnalyzing to false after successful completion
      setIsAnalyzing(false);

      devLog.log('[AnalyzingPage] Analysis completed successfully - isAnalyzing set to false');

      // Save analysis result to backend with automatic session recovery
      try {
        if (sessionId) {
          await updateSessionWithRecovery(sessionId, {
            analysisResult: result,
            uploadedImageUrl: uploadedImage, // Store image URL if available
          });
          devLog.log('Analysis result saved to backend');
        }
      } catch (saveError) {
        console.error('Failed to save analysis result to backend:', saveError);
        trackError(
          'backend_save_failed',
          saveError instanceof Error ? saveError.message : 'Unknown save error',
          'analyzing_page',
        );
        // Don't block user flow for backend save errors
      }

      // Store result but DON'T navigate automatically
      // Navigation will happen when user completes all steps manually
      devLog.log('Analysis complete, user can now navigate through steps freely');

      // Track that analysis is ready
      trackEvent('analysis_ready', {
        personal_color: result.personal_color_en,
        user_flow_step: 'analysis_complete_waiting_for_user',
      });
    } catch (err) {
      console.error('Analysis error:', err);

      // Parse the error to determine specific type
      const analysisErrorType = parseImageAnalysisError(err);

      let errorMessage = 'An error occurred during analysis.';
      if (err instanceof Error) {
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
          parsedType: analysisErrorType,
        });
        errorMessage = err.message;
      } else {
        console.error('Non-Error object thrown:', err);
        errorMessage = String(err);
      }

      // Track analysis failure with enhanced data
      trackError('ai_analysis_failed', errorMessage, 'analyzing_page');
      trackEvent('ai_analysis_failed', {
        error_message: errorMessage,
        error_type_detailed: analysisErrorType,
        file_size_mb: Math.round((uploadedFile.size / (1024 * 1024)) * 100) / 100,
        file_type: uploadedFile.type,
        analysis_duration_ms: Date.now() - Date.now(), // This would need the actual start time
        user_flow_step: 'analysis_failed',
        error_category: analysisErrorType,
      });

      // Set both error message and type
      setError(errorMessage);
      setErrorType(analysisErrorType);

      // IMPORTANT: Set isAnalyzing to false after error
      setIsAnalyzing(false);

      devLog.log(
        '[AnalyzingPage] Analysis failed - isAnalyzing set to false, error:',
        errorMessage,
      );
    }
  };

  // Get current step data with dynamic message for depth phases
  const getCurrentStepData = () => {
    const baseStep = ANALYSIS_STEPS[currentStep] || ANALYSIS_STEPS[0];

    // For depth phases (steps 2-4), update the message based on personal color
    if (currentStep >= 2 && currentStep <= 4 && analysisResult?.personal_color_en) {
      // Use the personal_color_en directly as it already contains the full name
      const personalColorKey = analysisResult.personal_color_en;

      devLog.log(
        '[AnalyzingPage] Getting color flow for:',
        personalColorKey,
        'at step:',
        currentStep,
      );

      const colorFlow =
        COLOR_COMPARISON_FLOWS[personalColorKey as keyof typeof COLOR_COMPARISON_FLOWS];

      if (colorFlow) {
        let depthConfig;
        if (currentStep === 2) {
          depthConfig = colorFlow.d1;
        } else if (currentStep === 3) {
          depthConfig = colorFlow.d2;
        } else {
          depthConfig = colorFlow.d3;
        }

        return {
          ...baseStep,
          message: depthConfig.message,
        };
      }
    }

    return baseStep;
  };

  const currentStepData = getCurrentStepData();

  // Handle proceeding to next step (for draping phases)
  const handleProceedToNext = () => {
    if (canSkip && currentStep < ANALYSIS_STEPS.length - 1) {
      // Clear current timer if any
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
      }

      // Track user interaction
      trackEvent('draping_phase_completed', {
        step_number: currentStep + 1,
        step_name: currentStepData.id,
        user_flow_step: 'user_proceeded_from_draping',
      });

      // Move to next step
      setCurrentStep(currentStep + 1);
      setCanSkip(false);
    }
  };

  // Handle going back to previous step
  const handleGoBack = () => {
    if (currentStep > 0) {
      // Clear current timer if any
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
      }

      // Track user interaction
      trackEvent('navigation_back', {
        from_step: currentStep,
        to_step: currentStep - 1,
        step_name: currentStepData.id,
        user_flow_step: 'user_went_back',
      });

      // Move to previous step
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle forward navigation (for all phases)
  const handleGoForward = () => {
    // Check if we're on the final step and analysis is complete
    if (currentStep === ANALYSIS_STEPS.length - 1) {
      // Final step - navigate to results if analysis is ready
      if (analysisResult) {
        trackEvent('navigation_to_results', {
          from_step: currentStep,
          step_name: currentStepData.id,
          user_flow_step: 'user_completed_analysis',
        });

        trackEngagement('analysis_completed', 'manual_completion');

        navigate(ROUTES.RESULT);
      } else {
        console.warn('Analysis not yet complete, waiting for results...');
        // Could show a message to the user here
      }
    } else if (currentStep < ANALYSIS_STEPS.length - 1) {
      // Not on final step - move to next step
      // Clear current timer if any
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
      }

      // Track user interaction
      trackEvent('navigation_forward', {
        from_step: currentStep,
        to_step: currentStep + 1,
        step_name: currentStepData.id,
        user_flow_step: 'user_went_forward',
      });

      // Move to next step
      setCurrentStep(currentStep + 1);
    }
  };

  // Prevent scrolling on this page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.touchAction = 'none';

    // Prevent pull-to-refresh on mobile
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.position = 'fixed';
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';

    return () => {
      // Cleanup on unmount
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
      className="fixed inset-0 w-screen h-screen overflow-hidden"
      style={{
        width: '100vw',
        height: '100dvh',
        touchAction: 'none',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Full screen background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(0deg, rgba(99, 36, 222, 0.20) 0%, rgba(99, 36, 222, 0.20) 100%), url(${guideBackground}) lightgray 50% / cover no-repeat`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* Content container */}
      <div className="w-full h-full flex items-center justify-center relative z-10">
        <div
          className="relative"
          style={{
            width: `${402 * scaleFactor}px`,
            height: `${874 * scaleFactor}px`,
            maxWidth: '100vw',
            maxHeight: '100vh',
          }}
        >
          {/* Header */}
          <div
            style={{
              position: 'absolute',
              top: `${16 * scaleFactor}px`,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              width: `${402 * scaleFactor}px`,
              height: `${61 * scaleFactor}px`,
              padding: `${28 * scaleFactor}px ${16 * scaleFactor}px`,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: `${10 * scaleFactor}px`,
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'var(--Label-Medium-Font, Roboto)',
                fontSize: `${14 * scaleFactor}px`,
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: 'var(--Label-Medium-Line-Height, 16px)',
                letterSpacing: 'var(--Label-Medium-Tracking, 0.5px)',
                width: '100%',
              }}
            >
              Step {currentStep + 1}/5
            </span>
            {/* Progress bar container */}
            <div
              style={{
                width: `${370 * scaleFactor}px`,
                height: `${5 * scaleFactor}px`,
                flexShrink: 0,
                borderRadius: `${40 * scaleFactor}px`,
                background: 'rgba(255, 255, 255, 0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Progress bar fill */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${((currentStep + 1) / 5) * 100}%`,
                  borderRadius: `${40 * scaleFactor}px`,
                  background: 'var(--main, #FFF49B)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Content container below header */}
          <div
            style={{
              position: 'absolute',
              top: `${(16 + 61) * scaleFactor + 16}px`, // header top + header height + 16px gap
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              width: `${402 * scaleFactor}px`,
              padding: '16px 0',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              alignSelf: 'stretch',
            }}
          >
            <h2
              style={{
                color: 'var(--Color-7, #FFF)',
                textAlign: 'center',
                fontFamily: '"Plus Jakarta Sans"',
                fontSize: '24px',
                fontStyle: 'normal',
                fontWeight: 800,
                lineHeight: '140%',
                margin: 0,
              }}
            >
              Finding Your Perfect Colors
              <br />
              Just a moment...
            </h2>
          </div>

          {/* Gray container for image/visualization */}
          <div
            className="absolute overflow-hidden"
            style={{
              top: `${(16 + 61) * scaleFactor + 16 * scaleFactor + 99.2 * scaleFactor + 20 * scaleFactor}px`, // header + gap + text container (with padding) + larger gap
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${348 * scaleFactor}px`,
              height: `${475 * scaleFactor}px`,
              flexShrink: 0,
              borderRadius: `${10 * scaleFactor}px`,
              background: '#D9D9D9',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              position: 'relative',
            }}
          >
            {/* Show error message if no image */}
            {!imageUrl && error && (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <svg
                      className="w-full h-full text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-semibold mb-2">{error}</p>
                  <button
                    onClick={() => navigate(ROUTES.DIAGNOSIS)}
                    className="text-purple-600 font-semibold text-sm hover:text-purple-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Face Landmark Visualization */}
            {imageUrl && !error && (
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-sm font-semibold text-gray-700 mt-2">
                        Loading AI model...
                      </p>
                    </div>
                  </div>
                }
              >
                <FaceLandmarkVisualization
                  imageUrl={imageUrl}
                  currentAnalysisStep={currentStep}
                  personalColorResult={(() => {
                    if (!analysisResult?.personal_color_en) return null;
                    const season = analysisResult.personal_color_en.toLowerCase();
                    // Map season to full personal color name
                    if (season === 'spring') return 'Spring Warm';
                    if (season === 'summer') return 'Summer Cool';
                    if (season === 'autumn' || season === 'fall') return 'Autumn Warm';
                    if (season === 'winter') return 'Winter Cool';
                    return 'Spring Warm'; // Default
                  })()}
                  onLandmarksDetected={(landmarks) => {
                    devLog.log(
                      `🎯 [Sync] Face landmarks detected for step ${currentStep}:`,
                      landmarks,
                    );

                    // Check if scan is complete (Step 1 only)
                    if (currentStep === 0 && landmarks.some((l: any) => l.scanComplete)) {
                      devLog.log('✅ [Step 1] Scan complete, enabling continue button');
                      setCanSkip(true); // Enable continue button after scan completes
                    }

                    trackEvent('face_landmarks_detected', {
                      faces_count: landmarks.length,
                      total_landmarks: landmarks.reduce(
                        (sum, face) => sum + (face.keypoints ? face.keypoints.length : 0),
                        0,
                      ),
                      current_analysis_step: currentStep,
                      step_name: ANALYSIS_STEPS[currentStep]?.id || 'unknown',
                      user_flow_step: 'landmarks_visualization_synchronized',
                    });
                  }}
                  className="w-full h-full"
                />
              </Suspense>
            )}

            {/* Analysis in Progress Overlay - shows while API is processing */}
            {isAnalyzing && !analysisComplete && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-lg z-10">
                <div className="bg-white/95 rounded-2xl p-6 shadow-2xl max-w-[280px] mx-4">
                  <div className="flex flex-col items-center space-y-4">
                    {/* Animated spinner */}
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
                      <div
                        className="absolute inset-2 border-4 border-transparent border-b-purple-400 rounded-full animate-spin"
                        style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                      ></div>
                    </div>

                    {/* Status text */}
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-800 mb-1">
                        AI Analysis in Progress
                      </p>
                      <p className="text-xs text-gray-500">Processing your personal colors...</p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1 bg-purple-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full animate-pulse"
                        style={{
                          width: `${Math.min(((Date.now() - (analysisStartTime || Date.now())) / 30000) * 100, 90)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTA Buttons - Same as PhotoGuide page, positioned at bottom */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center"
            style={{
              width: `${402 * scaleFactor}px`,
              padding: `0 ${16 * scaleFactor}px`,
              gap: `${10 * scaleFactor}px`,
              bottom: '51px',
            }}
          >
            {/* Left Button - White */}
            <button
              onClick={() => {
                if (currentStep === 0) {
                  // On first step, go back to diagnosis page
                  navigate(ROUTES.DIAGNOSIS);
                } else {
                  handleGoBack();
                }
              }}
              className="items-center justify-center cursor-pointer transition-all"
              style={{
                display: 'flex',
                width: `${164 * scaleFactor}px`,
                height: `${57 * scaleFactor}px`,
                padding: `${10 * scaleFactor}px ${16 * scaleFactor}px`,
                borderRadius: `${10 * scaleFactor}px`,
                background: '#FFFFFF',
                transition: 'all 0.2s ease',
                opacity: 1, // Always enabled
                pointerEvents: 'auto', // Always clickable
                marginRight: `${18 * scaleFactor}px`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
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
                Go Back
              </span>
            </button>

            {/* Right Button - Yellow */}
            <button
              onClick={() => {
                if (currentStep === ANALYSIS_STEPS.length - 1 && analysisResult) {
                  navigate(ROUTES.RESULT);
                } else if (canSkip) {
                  handleProceedToNext();
                }
              }}
              className="items-center justify-center cursor-pointer transition-all"
              style={{
                display: 'flex',
                width: `${164 * scaleFactor}px`,
                height: `${57 * scaleFactor}px`,
                padding: `${10 * scaleFactor}px ${16 * scaleFactor}px`,
                borderRadius: `${10 * scaleFactor}px`,
                background: '#FFF3A1',
                border: 'none',
                transition: 'all 0.2s ease',
                opacity:
                  canSkip || (currentStep === ANALYSIS_STEPS.length - 1 && analysisResult)
                    ? 1
                    : 0.5,
                pointerEvents:
                  canSkip || (currentStep === ANALYSIS_STEPS.length - 1 && analysisResult)
                    ? 'auto'
                    : 'none',
              }}
              onMouseEnter={(e) => {
                if (canSkip || (currentStep === ANALYSIS_STEPS.length - 1 && analysisResult)) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 19, 137, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onTouchStart={(e) => {
                if (canSkip || (currentStep === ANALYSIS_STEPS.length - 1 && analysisResult)) {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
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
                {currentStep === ANALYSIS_STEPS.length - 1
                  ? analysisResult
                    ? 'See My Colors!'
                    : 'Almost ready...'
                  : 'Continue'}
              </span>
            </button>
          </div>

          {/* Character and Speech Bubble - Position based on warm/cool tone */}
          {!error &&
            (() => {
              // Determine character position based on personal color result
              // Warm tones (Spring/Autumn) = left, Cool tones (Summer/Winter) = right
              // Before analysis complete or for initial steps, alternate positions
              let isCharacterOnLeft = currentStep % 2 === 0; // Default: alternate by step

              if (analysisResult?.personal_color_en) {
                const season = analysisResult.personal_color_en.toLowerCase();
                // Warm tones: Spring, Autumn = character on LEFT
                // Cool tones: Summer, Winter = character on RIGHT
                isCharacterOnLeft = season === 'spring' || season === 'autumn' || season === 'fall';
              }

              return (
                <div
                  key={`character-${currentStep}`}
                  className={`absolute z-20 animate-slideUp`}
                  style={{
                    bottom: `${112 * scaleFactor}px`,
                    left: isCharacterOnLeft ? 0 : 'auto',
                    right: isCharacterOnLeft ? 'auto' : 0,
                    animationDelay: '0.2s',
                    animationFillMode: 'both',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    className={`flex ${isCharacterOnLeft ? 'flex-row' : 'flex-row-reverse'} items-center`}
                    style={{
                      gap: `${12 * scaleFactor}px`,
                      padding: `${16 * scaleFactor}px`,
                      pointerEvents: 'none',
                    }}
                  >
                    {/* Character Container */}
                    <div
                      className="relative animate-bounce-gentle"
                      style={{ animationDelay: '0.5s' }}
                    >
                      {characterImageBroken ? (
                        <div
                          className="flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm drop-shadow-xl"
                          style={{
                            width: `${111 * scaleFactor}px`,
                            height: `${100 * scaleFactor}px`,
                            aspectRatio: '111/100',
                          }}
                          aria-label="Analysis Character"
                          role="img"
                        >
                          <Sparkles
                            className="text-purple-500 animate-pulse"
                            style={{
                              width: `${56 * scaleFactor}px`,
                              height: `${56 * scaleFactor}px`,
                            }}
                          />
                        </div>
                      ) : (
                        <img
                          src={analysisCharacter}
                          alt="Analysis Character"
                          onError={() => setCharacterImageBroken(true)}
                          className="object-contain filter drop-shadow-xl"
                          style={{
                            width: `${111 * scaleFactor}px`,
                            height: `${100 * scaleFactor}px`,
                            aspectRatio: '111/100',
                          }}
                        />
                      )}
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={`relative`}
                      style={{
                        animationDelay: '0.4s',
                        maxWidth: `${300 * scaleFactor}px`,
                        marginLeft: isCharacterOnLeft ? `${8 * scaleFactor}px` : 0,
                        marginRight: !isCharacterOnLeft ? `${8 * scaleFactor}px` : 0,
                      }}
                    >
                      <div
                        className="bg-white/95 backdrop-blur-md shadow-xl transform transition-all hover:scale-105"
                        style={{
                          padding: `${16 * scaleFactor}px`,
                          borderRadius: `${16 * scaleFactor}px`,
                          border: `${2 * scaleFactor}px solid rgb(233, 213, 255)`,
                        }}
                      >
                        {/* Bubble tail pointing to character */}
                        <div
                          className={`absolute w-0 h-0`}
                          style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                            left: isCharacterOnLeft ? `-${8 * scaleFactor}px` : 'auto',
                            right: !isCharacterOnLeft ? `-${8 * scaleFactor}px` : 'auto',
                            borderTop: `${8 * scaleFactor}px solid transparent`,
                            borderBottom: `${8 * scaleFactor}px solid transparent`,
                            borderRight: isCharacterOnLeft
                              ? `${8 * scaleFactor}px solid white`
                              : 'none',
                            borderLeft: !isCharacterOnLeft
                              ? `${8 * scaleFactor}px solid white`
                              : 'none',
                          }}
                        ></div>

                        {/* Message content */}
                        <p
                          style={{
                            color: 'var(--Color-5, #000)',
                            fontFamily: 'Pretendard',
                            fontSize: `${18 * scaleFactor}px`,
                            fontStyle: 'normal',
                            fontWeight: 700,
                            lineHeight: '140%',
                          }}
                        >
                          {currentStepData.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Error state - positioned at center */}
          {error && errorType && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50 backdrop-blur-sm">
              <div className="max-w-md w-full mx-4">
                <ImageAnalysisError
                  errorType={errorType}
                  onRetry={() => {
                    // Track retry button click with enhanced data
                    trackEvent('button_click', {
                      button_name: 'try_again_analysis',
                      page: 'analyzing',
                      retry_attempt: 'user_initiated',
                      previous_error: error || 'unknown',
                      error_type: errorType,
                      user_flow_step: 'analysis_retry_initiated',
                    });

                    trackEngagement('retry', 'analysis_retry');

                    // Reset all error states
                    setError(null);
                    setErrorType(null);
                    setCurrentStep(0);
                    setProgress(0);
                    setIsAnalyzing(false);

                    // Start analysis again
                    performAnalysis();
                  }}
                  onChangeImage={() => {
                    trackEvent('button_click', {
                      button_name: 'go_back_to_upload',
                      page: 'analyzing',
                      reason: 'user_requested_change',
                      error_type: errorType,
                      user_flow_step: 'return_to_upload_from_error',
                    });
                    navigate(ROUTES.DIAGNOSIS);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyzingPage;
