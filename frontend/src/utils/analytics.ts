// Google Analytics 4 Event Tracking Utilities - Complete Implementation
import { VercelAnalytics, trackVercelEvent } from './vercelAnalytics';
import { devLog } from '@/utils/devLog';

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set' | 'consent',
      targetId: string,
      config?: Record<string, unknown>,
    ) => void;
    dataLayer: unknown[];
  }
}

// GA4 Measurement ID from environment variables
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || 'G-JXPF7BL260';

// Enhanced GA4 initialization
export const initializeGA4 = (): void => {
  if (typeof window.gtag !== 'undefined') {
    // Set default consent state (GDPR compliance)
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    // Enhanced config with conditional debug mode
    const config: Record<string, unknown> = {
      send_page_view: false,
      allow_google_signals: true,
      cookie_flags: 'SameSite=None;Secure',
    };

    // Add debug_mode only in development (not false, just omit it in production)
    if (import.meta.env.DEV) {
      config.debug_mode = true;
    }

    window.gtag('config', GA_MEASUREMENT_ID, config);

    // Set custom dimensions
    window.gtag('set', {
      custom_map: {
        custom_parameter_1: 'personal_color_type',
        custom_parameter_2: 'user_flow_step',
        custom_parameter_3: 'processing_time_ms',
        custom_parameter_4: 'confidence_score',
      },
    });

    devLog.log('[GA4] Initialized with ID:', GA_MEASUREMENT_ID);
  }
};

// Enhanced page view tracking for SPA
export const trackPageView = (path: string, title?: string): void => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'page_view', {
      page_location: window.location.href,
      page_path: path,
      page_title: title || document.title,
      engagement_time_msec: 100,
    });

    // Also track with Vercel Analytics
    if (path === '/') {
      VercelAnalytics.pageView('landing');
    }
  }
};

// Core event tracking function with error handling and conditional debug mode
export const trackEvent = (eventName: string, parameters?: Record<string, unknown>): void => {
  try {
    if (typeof window.gtag !== 'undefined') {
      const eventParams = {
        ...parameters,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
      };

      // Add debug mode in development
      const finalParams = addDebugMode(eventParams);

      window.gtag('event', eventName, finalParams);

      if (import.meta.env.DEV) {
        devLog.log(`[GA4 Event] ${eventName}:`, finalParams);
      }
    }
  } catch (error) {
    console.warn('[GA4] Event tracking failed:', eventName, error);
  }
};

// ============================================================================
// ENHANCED GA4 + VERCEL ANALYTICS - DUAL TRACKING SYSTEM
// ============================================================================

// 1. USER JOURNEY TRACKING
export const trackSessionStart = (instagramId?: string): void => {
  // GA4 tracking
  trackEvent('session_start', {
    event_category: 'engagement',
    instagram_id: instagramId || 'anonymous',
    user_flow_step: 'session_start',
    session_id: `session_${Date.now()}`,
    device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  });

  // Vercel Analytics tracking
  VercelAnalytics.sessionStart(instagramId || 'anonymous');
};

// 2. IMAGE UPLOAD TRACKING
export const trackImageUpload = (
  success: boolean,
  fileSize?: number,
  fileType?: string,
  errorReason?: string,
): void => {
  // GA4 tracking
  trackEvent('image_upload', {
    event_category: 'user_action',
    success: success,
    file_size_mb: fileSize ? Math.round((fileSize / (1024 * 1024)) * 100) / 100 : undefined,
    file_type: fileType,
    error_reason: success ? undefined : errorReason,
    user_flow_step: 'image_upload',
    upload_method: 'drag_drop_or_click',
  });

  // Vercel Analytics tracking
  if (success && fileSize && fileType) {
    VercelAnalytics.imageUpload(fileSize, fileType);
  }
};

// 3. AI ANALYSIS TRACKING (Critical Event)
export const trackAIAnalysis = (result: {
  personalColorType: string;
  season: string;
  tone: string;
  confidence: number;
  processingTime?: number;
  analysisId?: string;
}): void => {
  // Use critical event tracking for AI analysis completion (always has debug_mode: true)
  trackCriticalEvent('ai_analysis_complete', {
    event_category: 'conversion',
    personal_color_type: result.personalColorType,
    season: result.season,
    tone: result.tone,
    confidence_score: Math.round(result.confidence * 100),
    processing_time_ms: result.processingTime || 0,
    analysis_id: result.analysisId,
    user_flow_step: 'analysis_complete',
    analysis_quality: result.confidence > 0.8 ? 'high' : result.confidence > 0.6 ? 'medium' : 'low',
  });

  // Vercel Analytics tracking
  VercelAnalytics.analysisComplete({
    personalColorType: result.personalColorType,
    season: result.season,
    tone: result.tone,
    confidence: result.confidence,
    processingTime: result.processingTime || 0,
  });
};

// 4. PREFERENCE SUBMISSION TRACKING
export const trackPreferenceSubmit = (preferences: {
  style?: string[];
  priceRange?: string;
  material?: string[];
  occasion?: string[];
  fitStyle?: string[];
}): void => {
  trackEvent('preference_submit', {
    event_category: 'user_action',
    style_count: preferences.style?.length || 0,
    fit_style_count: preferences.fitStyle?.length || 0,
    price_range: preferences.priceRange,
    material_count: preferences.material?.length || 0,
    occasion_count: preferences.occasion?.length || 0,
    user_flow_step: 'preferences_submit',
    total_selections:
      (preferences.style?.length || 0) +
      (preferences.fitStyle?.length || 0) +
      (preferences.material?.length || 0) +
      (preferences.occasion?.length || 0),
  });
};

// 5. RECOMMENDATION REQUEST TRACKING
export const trackRecommendationRequest = (
  _instagramId: string,
  personalColorType: string,
): void => {
  // GA4 tracking
  trackEvent('recommendation_request', {
    event_category: 'conversion',
    personal_color_type: personalColorType,
    user_flow_step: 'recommendation_request',
    value: 1, // Conversion value
  });

  // Vercel Analytics tracking
  VercelAnalytics.recommendationRequest(instagramId, personalColorType);
};

// 6. RESULT DOWNLOAD/SHARE TRACKING
export const trackResultDownload = (
  personalColor: string,
  downloadType: 'image' | 'pdf' = 'image',
): void => {
  // GA4 tracking
  trackEvent('result_download', {
    event_category: 'engagement',
    personal_color: personalColor,
    download_type: downloadType,
    user_flow_step: 'result_download',
    value: 1,
  });

  // Vercel Analytics tracking
  VercelAnalytics.resultShare('download');
};

// 7. FLOW COMPLETION TRACKING (Critical Event)
export const trackFlowCompletion = (_instagramId?: string, personalColor?: string): void => {
  trackCriticalEvent('flow_complete', {
    event_category: 'conversion',
    completion_type: 'full_flow',
    personal_color: personalColor,
    user_flow_step: 'flow_complete',
    value: 2,
    currency: 'USD',
  });
};

// 8. DROP-OFF TRACKING
export const trackDropOff = (step: string, reason?: string): void => {
  trackEvent('drop_off', {
    event_category: 'user_behavior',
    drop_off_step: step,
    drop_off_reason: reason,
    user_flow_step: step,
  });
};

// 9. ERROR TRACKING
export const trackError = (errorType: string, errorMessage: string, errorStep: string): void => {
  trackEvent('error_encountered', {
    event_category: 'error',
    error_type: errorType,
    error_message: errorMessage,
    error_step: errorStep,
    user_flow_step: errorStep,
  });
};

// 10. PERFORMANCE TRACKING
export const trackPerformance = (metric: string, value: number, step: string): void => {
  trackEvent('performance_metric', {
    event_category: 'performance',
    metric_name: metric,
    metric_value: Math.round(value),
    performance_step: step,
    user_flow_step: step,
  });
};

// 11. USER ENGAGEMENT TRACKING
export const trackEngagement = (action: string, target: string, duration?: number): void => {
  trackEvent('user_engagement', {
    event_category: 'engagement',
    engagement_action: action,
    engagement_target: target,
    engagement_duration: duration ? Math.round(duration) : undefined,
  });
};

// 12. SCROLL DEPTH TRACKING
export const trackScrollDepth = (depth: number, page: string): void => {
  trackEvent('scroll_depth', {
    event_category: 'engagement',
    scroll_depth_percent: depth,
    page_path: page,
    user_flow_step: 'content_engagement',
  });
};

// ============================================================================
// SCROLL DEPTH TRACKING UTILITY
// ============================================================================

const scrollDepthMarkers: Set<number> = new Set();

export const initializeScrollTracking = (pagePath: string): void => {
  scrollDepthMarkers.clear();

  const handleScroll = (): void => {
    const scrollPercent = Math.round(
      ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100,
    );

    // Track at 25%, 50%, 75%, 90% marks
    const markers = [25, 50, 75, 90];
    markers.forEach((marker) => {
      if (scrollPercent >= marker && !scrollDepthMarkers.has(marker)) {
        scrollDepthMarkers.add(marker);
        trackScrollDepth(marker, pagePath);
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Cleanup function
  return () => {
    window.removeEventListener('scroll', handleScroll);
    scrollDepthMarkers.clear();
  };
};

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

export const debugGA4 = (): void => {
  if (typeof window.gtag !== 'undefined') {
    devLog.log('[GA4 Debug] DataLayer:', window.dataLayer);
    devLog.log('[GA4 Debug] Measurement ID:', GA_MEASUREMENT_ID);
    devLog.log('[GA4 Debug] Environment:', import.meta.env.DEV ? 'Development' : 'Production');
    devLog.log(
      '[GA4 Debug] Debug Mode:',
      import.meta.env.DEV || import.meta.env.VITE_GA4_DEBUG_MODE === 'true'
        ? 'Enabled'
        : 'Disabled',
    );
    devLog.log('[GA4 Debug] Last 5 DataLayer Events:', window.dataLayer?.slice(-5));
  }
};

// Test function to send a test event (for debugging purposes)
export const sendTestEvent = (): void => {
  if (import.meta.env.DEV) {
    trackEvent('debug_test_event', {
      event_category: 'debug',
      test_parameter: 'test_value',
      timestamp: Date.now(),
      debug_mode: true,
    });
    devLog.log('[GA4 Debug] Test event sent');
  }
};

// Function to enable debug mode for specific events
export const trackDebugEvent = (eventName: string, parameters: Record<string, unknown>): void => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, { ...parameters, debug_mode: true });
    devLog.log(`[GA4 Debug Event] ${eventName}:`, parameters);
  }
};

// Helper function to add debug mode to events in development or when forced
const addDebugMode = (params: Record<string, unknown>): Record<string, unknown> => {
  // Enable debug mode for: development, forced via env, or special query parameter
  const shouldDebug =
    import.meta.env.DEV ||
    import.meta.env.VITE_GA4_DEBUG_MODE === 'true' ||
    window.location.search.includes('ga_debug=1');

  if (shouldDebug) {
    return { ...params, debug_mode: true };
  }
  return params;
};

// Enhanced event tracking with debug mode for critical events
export const trackCriticalEvent = (
  eventName: string,
  parameters: Record<string, unknown>,
): void => {
  if (typeof window.gtag !== 'undefined') {
    // Always add debug mode for critical events (even in production for important tracking)
    const debugParams = { ...parameters, debug_mode: true };
    window.gtag('event', eventName, debugParams);

    if (import.meta.env.DEV) {
      devLog.log(`[GA4 Critical Event] ${eventName}:`, debugParams);
    }
  }

  // Also track with Vercel Analytics
  trackVercelEvent(eventName, parameters);
};
