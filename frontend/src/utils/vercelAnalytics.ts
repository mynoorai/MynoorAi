import { track } from '@vercel/analytics';

// Vercel Analytics용 커스텀 이벤트 추적
type VercelEventProperties = Record<string, string | number | boolean | null>;
export const trackVercelEvent = (eventName: string, properties?: VercelEventProperties) => {
  track(eventName, properties);
};

// PCA Hijab 특화 이벤트들
export const VercelAnalytics = {
  // 세션 시작
  sessionStart: (instagramId: string) => {
    track('session_start', {
      instagram_id: instagramId,
      timestamp: new Date().toISOString(),
    });
  },

  // 이미지 업로드
  imageUpload: (fileSize: number, fileType: string) => {
    track('image_upload', {
      file_size: fileSize,
      file_type: fileType,
      timestamp: new Date().toISOString(),
    });
  },

  // AI 분석 시작
  analysisStart: () => {
    track('analysis_start', {
      timestamp: new Date().toISOString(),
    });
  },

  // AI 분석 완료
  analysisComplete: (result: {
    personalColorType: string;
    season: string;
    tone: string;
    confidence: number;
    processingTime: number;
  }) => {
    track('analysis_complete', {
      personal_color_type: result.personalColorType,
      season: result.season,
      tone: result.tone,
      confidence: result.confidence,
      processing_time: result.processingTime,
      timestamp: new Date().toISOString(),
    });
  },

  // 결과 공유
  resultShare: (shareMethod: string) => {
    track('result_share', {
      share_method: shareMethod,
      timestamp: new Date().toISOString(),
    });
  },

  // 추천 요청
  recommendationRequest: (instagramId: string, personalColorType: string) => {
    track('recommendation_request', {
      instagram_id: instagramId,
      personal_color_type: personalColorType,
      timestamp: new Date().toISOString(),
    });
  },

  // 페이지 체류 시간
  pageTimeSpent: (page: string, timeSpent: number) => {
    track('page_time_spent', {
      page: page,
      time_spent: timeSpent,
      timestamp: new Date().toISOString(),
    });
  },

  // 오류 추적
  errorOccurred: (errorType: string, errorMessage: string, page: string) => {
    track('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      page: page,
      timestamp: new Date().toISOString(),
    });
  },

  // 사용자 행동 추적
  userInteraction: (action: string, element: string, page: string) => {
    track('user_interaction', {
      action: action,
      element: element,
      page: page,
      timestamp: new Date().toISOString(),
    });
  },
};

export default VercelAnalytics;
