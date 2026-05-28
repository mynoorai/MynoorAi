import { apiClient } from './client';
import type {
  Product,
  ProductFormData,
  ImageUploadResponse,
  ProductCategory,
  PersonalColorType,
  Content,
  ContentFormData,
  ContentCategory,
  ContentStatus,
} from '@/types/admin';
import { devLog } from '@/utils/devLog';

// Debug logging
devLog.log('[Admin API] Module loading...');

export const ProductAPI = {
  // Product management
  products: {
    // Get all products with optional filters
    getAll: async (filters?: { category?: ProductCategory; personalColor?: PersonalColorType }) => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.personalColor) params.append('personalColor', filters.personalColor);

      const response = await apiClient.get<{ success: boolean; data: Product[] }>(
        `/admin/products${params.toString() ? `?${params.toString()}` : ''}`,
      );
      return response.data.data;
    },

    // Get single product
    getById: async (id: string) => {
      const response = await apiClient.get<{ success: boolean; data: Product }>(
        `/admin/products/${id}`,
      );
      return response.data.data;
    },

    // Create new product
    create: async (data: ProductFormData) => {
      const response = await apiClient.post<{ success: boolean; data: Product }>(
        '/admin/products',
        data,
      );
      return response.data.data;
    },

    // Update product
    update: async (id: string, data: Partial<ProductFormData>) => {
      const response = await apiClient.put<{ success: boolean; data: Product }>(
        `/admin/products/${id}`,
        data,
      );
      return response.data.data;
    },

    // Delete product
    delete: async (id: string) => {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `/admin/products/${id}`,
      );
      return response.data;
    },

    // Bulk delete products (delete all if ids omitted)
    bulkDelete: async (ids?: string[]) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/admin/products/bulk-delete',
        ids && ids.length > 0 ? { ids } : {},
      );
      return response.data;
    },
  },

  // Image upload
  upload: {
    // Upload single image
    single: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post<{ success: boolean; data: ImageUploadResponse }>(
        '/admin/upload/image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data.data;
    },

    // Upload multiple images
    multiple: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const response = await apiClient.post<{ success: boolean; data: ImageUploadResponse[] }>(
        '/admin/upload/images',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data.data;
    },
  },

  // Recommendation methods (for backward compatibility)
  getRecommendation: async (id: string) => {
    devLog.log('[Admin API] Getting recommendation:', id);
    try {
      const response = await apiClient.get(`/admin/recommendations/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('[Admin API] Failed to get recommendation:', error);
      throw error;
    }
  },

  updateRecommendationStatus: async (
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    productIds?: string[],
  ) => {
    devLog.log('[Admin API] Updating recommendation status:', id, status);
    try {
      const body: { status: typeof status; productIds?: string[] } = { status };
      if (productIds !== undefined) body.productIds = productIds;
      const response = await apiClient.put(`/admin/recommendations/${id}/status`, body);
      return response.data.data;
    } catch (error) {
      console.error('[Admin API] Failed to update recommendation status:', error);
      throw error;
    }
  },

  // Content management
  contents: {
    // Get all contents with optional filters
    getAll: async (filters?: { category?: ContentCategory; status?: ContentStatus }) => {
      devLog.log('[Admin API] Getting all contents with filters:', filters);
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);

      const response = await apiClient.get<{ success: boolean; data: Content[] }>(
        `/admin/contents${params.toString() ? `?${params.toString()}` : ''}`,
      );
      return response.data.data;
    },

    // Get single content
    getById: async (id: string) => {
      devLog.log('[Admin API] Getting content by ID:', id);
      const response = await apiClient.get<{ success: boolean; data: Content }>(
        `/admin/contents/${id}`,
      );
      return response.data.data;
    },

    // Get content by slug
    getBySlug: async (slug: string) => {
      devLog.log('[Admin API] Getting content by slug:', slug);
      const response = await apiClient.get<{ success: boolean; data: Content }>(
        `/admin/contents/slug/${slug}`,
      );
      return response.data.data;
    },

    // Create new content
    create: async (data: ContentFormData) => {
      devLog.log('[Admin API] Creating new content');
      const response = await apiClient.post<{ success: boolean; data: Content }>(
        '/admin/contents',
        data,
      );
      return response.data.data;
    },

    // Update content
    update: async (id: string, data: Partial<ContentFormData>) => {
      devLog.log('[Admin API] Updating content:', id);
      const response = await apiClient.put<{ success: boolean; data: Content }>(
        `/admin/contents/${id}`,
        data,
      );
      return response.data.data;
    },

    // Update content status
    updateStatus: async (id: string, status: ContentStatus) => {
      devLog.log('[Admin API] Updating content status:', id, status);
      const response = await apiClient.put<{ success: boolean; data: Content }>(
        `/admin/contents/${id}/status`,
        { status },
      );
      return response.data.data;
    },

    // Delete content
    delete: async (id: string) => {
      devLog.log('[Admin API] Deleting content:', id);
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `/admin/contents/${id}`,
      );
      return response.data;
    },

    // Bulk delete contents by IDs
    bulkDelete: async (ids: string[]) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/admin/contents/bulk-delete',
        { ids },
      );
      return response.data;
    },
  },

  // Convenience method for backward compatibility
  getProducts: async () => {
    return ProductAPI.products.getAll();
  },
};

export const AdminAPI = {
  verify: async (): Promise<{ success: boolean; data: { admin: unknown } }> => {
    const response = await apiClient.get('/admin/verify');
    return response.data;
  },
  users: {
    getAll: async (params?: {
      q?: string;
      role?: 'user' | 'admin' | 'content_manager';
      verified?: boolean;
      page?: number;
      limit?: number;
    }) => {
      const search = new URLSearchParams();
      if (params?.q) search.append('q', params.q);
      if (params?.role) search.append('role', params.role);
      if (typeof params?.verified === 'boolean') search.append('verified', String(params.verified));
      if (params?.page) search.append('page', String(params.page));
      if (params?.limit) search.append('limit', String(params.limit));
      const qs = search.toString();
      const response = await apiClient.get<{
        success: boolean;
        data: Array<{
          id: string;
          email: string;
          fullName: string;
          role: string;
          emailVerified: boolean;
          lastLoginAt?: string;
          createdAt: string;
          instagramId?: string;
        }>;
      }>(`/admin/users${qs ? `?${qs}` : ''}`);
      return response.data.data;
    },
  },
};

// Log successful module load
devLog.log('[Admin API] Module loaded successfully, ProductAPI exported');
