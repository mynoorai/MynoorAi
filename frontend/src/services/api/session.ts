import { apiClient } from './client';
import { getInstagramClient, shouldUseInstagramClient } from './instagramClient';
import type { PersonalColorResult } from '@/types';
import { secureWarn } from '@/utils/secureLogging';

export interface SessionResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    instagramId?: string;
  };
}

export interface SessionDetails {
  id: string;
  instagramId?: string;
  uploadedImageUrl?: string;
  analysisResult?: PersonalColorResult;
  createdAt: string;
  updatedAt?: string;
}

export interface SessionUpdateData {
  uploadedImageUrl?: string;
  analysisResult?: PersonalColorResult;
}

export class SessionAPI {
  /**
   * Create a new session with retry logic
   * @param instagramId - Instagram ID (optional)
   * @returns Promise<SessionResponse>
   */
  static async createSession(instagramId?: string): Promise<SessionResponse> {
    // Use Instagram-optimized client if detected
    const client = shouldUseInstagramClient() ? getInstagramClient() : apiClient;
    const isInstagram = shouldUseInstagramClient();

    if (isInstagram) {
      console.log('📱 [SessionAPI] Using Instagram-optimized client (5s timeout, no retries)');
    }

    // No retry for Instagram browser - fail fast
    if (isInstagram) {
      try {
        const response = await client.post<SessionResponse>(
          '/sessions',
          instagramId ? { instagramId } : {},
        );
        return response.data;
      } catch (error) {
        secureWarn('Instagram session creation failed:', error);
        throw error;
      }
    }

    // Regular browsers can handle cold starts with proper retries
    try {
      const response = await client.post<SessionResponse>(
        '/sessions',
        instagramId ? { instagramId } : {},
      );
      return response.data;
    } catch (error) {
      // The client already has retry logic with cold start handling
      // Just propagate the error
      secureWarn('Session creation failed:', error);
      throw error;
    }
  }

  /**
   * Get session details
   * @param sessionId - Session ID
   * @returns Promise<{ success: boolean; data: SessionDetails }>
   */
  static async getSession(sessionId: string): Promise<{
    success: boolean;
    data: SessionDetails;
  }> {
    const response = await apiClient.get(`/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Update session with analysis results and/or uploaded image URL
   * @param sessionId - Session ID
   * @param updateData - Data to update (uploadedImageUrl and/or analysisResult)
   * @returns Promise<{ success: boolean; data: SessionDetails }>
   */
  static async updateSession(
    sessionId: string,
    updateData: SessionUpdateData,
  ): Promise<{
    success: boolean;
    data: SessionDetails;
  }> {
    try {
      const response = await apiClient.patch(`/sessions/${sessionId}`, updateData);
      return response.data;
    } catch (error) {
      // If session not found (404), log error but don't auto-recreate
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          secureWarn(`[Session API] Session not found: ${sessionId}`);
          // Let the error propagate so the UI can handle it appropriately
          // (e.g., redirect to home page to create a new session)
        }
      }
      throw error;
    }
  }
}
