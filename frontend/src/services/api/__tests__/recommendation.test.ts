import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationAPI } from '../recommendation';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { useAppStore } from '@/store';
import type { RecommendationRequest } from '../recommendation';
import type { PersonalColorResult } from '@/types';

describe('RecommendationAPI', () => {
  const mockPersonalColorResult: PersonalColorResult = {
    personal_color: 'Autumn Warm',
    personal_color_en: 'autumn',
    tone: 'Warm Tone',
    tone_en: 'warm',
    confidence: 0.92,
  };

  const mockRecommendationData: RecommendationRequest = {
    sessionId: 'test_session_id',
    personalColorResult: mockPersonalColorResult,
    preferences: {
      style: ['casual'],
      priceRange: 'mid',
      material: ['cotton'],
      occasion: ['daily'],
      additionalNotes: '',
    },
  };

  beforeEach(() => {
    // Ensure store has a sessionId so RecommendationAPI does not throw
    useAppStore.setState({ sessionId: 'test_session_id' });
  });

  describe('submitRecommendation', () => {
    it('should successfully submit recommendation', async () => {
      server.use(
        http.post('http://localhost:5001/api/recommendations', async () => {
          const id = 'rec_' + Date.now();
          return HttpResponse.json({
            success: true,
            message: 'Recommendation request submitted successfully.',
            data: {
              recommendationId: id,
              id,
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          });
        }),
      );

      const result = await RecommendationAPI.submitRecommendation(mockRecommendationData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toBeTruthy();
      expect(result.recommendationId).toMatch(/^rec_/);
      expect(result.data?.recommendationId).toMatch(/^rec_/);
    });

    it('should propagate validation errors', async () => {
      server.use(
        http.post('http://localhost:5001/api/recommendations', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Required information is missing.',
            },
            { status: 400 },
          );
        }),
      );

      await expect(
        RecommendationAPI.submitRecommendation(mockRecommendationData),
      ).rejects.toBeDefined();
    });

    it('should propagate server errors', async () => {
      server.use(
        http.post('http://localhost:5001/api/recommendations', () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 });
        }),
      );

      await expect(
        RecommendationAPI.submitRecommendation(mockRecommendationData),
      ).rejects.toBeDefined();
    });

    it('should propagate network errors', async () => {
      server.use(
        http.post('http://localhost:5001/api/recommendations', () => {
          return HttpResponse.error();
        }),
      );

      await expect(
        RecommendationAPI.submitRecommendation(mockRecommendationData),
      ).rejects.toBeDefined();
    });
  });

  describe('getRecommendationStatus', () => {
    it('should get recommendation status', async () => {
      const recommendationId = 'rec_123456';

      server.use(
        http.get(`http://localhost:5001/api/recommendations/${recommendationId}/status`, () => {
          return HttpResponse.json({
            status: 'completed',
            updatedAt: '2024-01-01T12:00:00Z',
          });
        }),
      );

      const result = await RecommendationAPI.getRecommendationStatus(recommendationId);

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.updatedAt).toBeTruthy();
    });

    it('should handle status check errors', async () => {
      const recommendationId = 'rec_invalid';

      server.use(
        http.get(`http://localhost:5001/api/recommendations/${recommendationId}/status`, () => {
          return HttpResponse.json({ message: 'Not found' }, { status: 404 });
        }),
      );

      const result = await RecommendationAPI.getRecommendationStatus(recommendationId);

      expect(result.status).toBe('pending');
      expect(result.updatedAt).toBeTruthy();
    });
  });
});
