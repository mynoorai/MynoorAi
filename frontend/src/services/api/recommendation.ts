import { apiClient } from './client';
import { useAppStore } from '@/store';
import type { UserPreferences, PersonalColorResult } from '@/types';

export interface RecommendationRequest {
  personalColorResult: PersonalColorResult;
  preferences: UserPreferences;
  sessionId?: string;
}

// Backend POST /recommendations response shape:
//   { success, message, data: { recommendationId, id, status, createdAt } }
// We flatten `recommendationId` back onto the top-level result so existing
// callers (`result.recommendationId`) keep working after the envelope change.
export interface RecommendationCreatedData {
  recommendationId: string;
  id: string;
  status: string;
  createdAt: string;
}

export interface RecommendationResponse {
  success: boolean;
  message: string;
  data?: RecommendationCreatedData;
  recommendationId?: string;
}

interface RawRecommendationCreateResponse {
  success: boolean;
  message: string;
  data?: Partial<RecommendationCreatedData> & { recommendationId?: string };
  // Legacy flat field kept temporarily so a stale backend doesn't break the
  // client during a rolling deploy.
  recommendationId?: string;
}

export class RecommendationAPI {
  /**
   * Submit hijab recommendation request
   * @param data - Recommendation request data
   * @returns Promise<RecommendationResponse>
   */
  static async submitRecommendation(data: RecommendationRequest): Promise<RecommendationResponse> {
    try {
      // Get sessionId from store if not provided
      const sessionId = data.sessionId || useAppStore.getState().sessionId;

      if (!sessionId) {
        throw new Error('Session ID not found');
      }

      // Transform personalColorResult to match backend expectations
      const transformedPersonalColorResult = {
        ...data.personalColorResult,
        season: data.personalColorResult.personal_color_en,
        tone:
          data.personalColorResult.tone_en ||
          (data.personalColorResult.personal_color_en === 'spring' ||
          data.personalColorResult.personal_color_en === 'autumn'
            ? 'warm'
            : 'cool'),
      };

      // Log the data being sent
      const requestData = {
        sessionId,
        personalColorResult: transformedPersonalColorResult,
        userPreferences: data.preferences,
      };

      console.log('Sending recommendation request:', requestData);

      const response = await apiClient.post<RawRecommendationCreateResponse>(
        '/recommendations',
        requestData,
      );
      const raw = response.data;
      // Resolve recommendationId from new envelope or legacy flat field so
      // callers can keep using `result.recommendationId` unchanged.
      const recommendationId = raw.data?.recommendationId ?? raw.recommendationId;
      return {
        success: raw.success,
        message: raw.message,
        data: raw.data
          ? {
              recommendationId: raw.data.recommendationId ?? recommendationId ?? '',
              id: raw.data.id ?? recommendationId ?? '',
              status: raw.data.status ?? 'pending',
              createdAt: raw.data.createdAt ?? new Date().toISOString(),
            }
          : undefined,
        recommendationId,
      };
    } catch (error: any) {
      console.error('Recommendation submission error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        request: error.request,
        code: error.code,
        config: error.config,
      });
      // Re-throw the error to see what's actually happening
      throw error;
    }
  }

  /**
   * Get recommendation status
   * @param recommendationId - Recommendation ID
   * @returns Promise<{ status: string; updatedAt: string }>
   */
  static async getRecommendationStatus(
    recommendationId: string,
  ): Promise<{ status: string; updatedAt: string }> {
    try {
      const response = await apiClient.get(`/recommendations/${recommendationId}/status`);
      return response.data;
    } catch {
      // Return mock status for MVP
      return {
        status: 'pending',
        updatedAt: new Date().toISOString(),
      };
    }
  }
}
