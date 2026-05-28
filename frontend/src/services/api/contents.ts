import { apiClient } from './client';
import type { Content, ContentCategory } from '@/types';

export interface ContentsResponse {
  success: boolean;
  data: Content[];
  total?: number;
  hasMore?: boolean;
}

export interface ContentResponse {
  success: boolean;
  data: Content;
}

export interface ContentFilters {
  category?: ContentCategory;
  limit?: number;
  offset?: number;
}

export class ContentAPI {
  /**
   * Get all published contents
   * @param filters - Optional filters
   * @returns Promise<ContentsResponse>
   */
  static async getContents(filters?: ContentFilters): Promise<ContentsResponse> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = queryString ? `/contents?${queryString}` : '/contents';

    const response = await apiClient.get<ContentsResponse>(url);
    return response.data;
  }

  /**
   * Get popular contents by view count
   * @param limit - Number of contents to return
   * @param category - Optional category filter
   * @returns Promise<ContentsResponse>
   */
  static async getPopularContents(
    limit = 10,
    category?: ContentCategory,
  ): Promise<ContentsResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (category) params.append('category', category);

    const response = await apiClient.get<ContentsResponse>(
      `/contents/popular?${params.toString()}`,
    );
    return response.data;
  }

  /**
   * Get recent contents
   * @param limit - Number of contents to return
   * @param category - Optional category filter
   * @returns Promise<ContentsResponse>
   */
  static async getRecentContents(
    limit = 10,
    category?: ContentCategory,
  ): Promise<ContentsResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (category) params.append('category', category);

    const response = await apiClient.get<ContentsResponse>(`/contents/recent?${params.toString()}`);
    return response.data;
  }

  /**
   * Get contents by category
   * @param category - Content category
   * @param filters - Optional pagination filters
   * @returns Promise<ContentsResponse>
   */
  static async getContentsByCategory(
    category: ContentCategory,
    filters?: { limit?: number; offset?: number },
  ): Promise<ContentsResponse> {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = queryString
      ? `/contents/category/${category}?${queryString}`
      : `/contents/category/${category}`;

    const response = await apiClient.get<ContentsResponse>(url);
    return response.data;
  }

  /**
   * Get a single content by slug
   * @param slug - Content slug
   * @returns Promise<ContentResponse>
   */
  static async getContentBySlug(slug: string): Promise<ContentResponse> {
    const response = await apiClient.get<ContentResponse>(`/contents/slug/${slug}`);
    return response.data;
  }

  /**
   * Get a single content by ID
   * @param contentId - Content ID
   * @returns Promise<ContentResponse>
   */
  static async getContent(contentId: string): Promise<ContentResponse> {
    const response = await apiClient.get<ContentResponse>(`/contents/${contentId}`);
    return response.data;
  }

  /**
   * Get related contents
   * @param contentId - Current content ID
   * @param limit - Number of related contents to return
   * @returns Promise<ContentsResponse>
   */
  static async getRelatedContents(contentId: string, limit = 4): Promise<ContentsResponse> {
    const response = await apiClient.get<ContentsResponse>(
      `/contents/related/${contentId}?limit=${limit}`,
    );
    return response.data;
  }

  /**
   * Record a view for a content (idempotent GET → explicit POST).
   * Errors (e.g. 429 from rate limit, network) are swallowed because
   * a missed view should never break content rendering.
   * @param idOrSlug - Content ID or slug
   */
  static async incrementContentView(idOrSlug: string): Promise<void> {
    try {
      await apiClient.post(`/contents/${encodeURIComponent(idOrSlug)}/view`);
    } catch {
      // Non-fatal: view tracking failures must not affect UX.
    }
  }

  /**
   * Get category display name
   * @param category - Content category
   * @returns Display name in Korean
   */
  static getCategoryDisplayName(category: ContentCategory): string {
    const categoryNames: Record<ContentCategory, string> = {
      beauty_tips: 'Beauty Tips',
      hijab_styling: 'Hijab Styling',
      color_guide: 'Color Guide',
      trend: 'Trends',
      tutorial: 'Tutorials',
    };

    return categoryNames[category] || category;
  }

  /**
   * Get category icon
   * @param category - Content category
   * @returns Emoji icon for the category
   */
  static getCategoryIcon(category: ContentCategory): string {
    const categoryIcons: Record<ContentCategory, string> = {
      beauty_tips: '💄',
      hijab_styling: '🧕',
      color_guide: '🎨',
      trend: '✨',
      tutorial: '📚',
    };

    return categoryIcons[category] || '📄';
  }
}
