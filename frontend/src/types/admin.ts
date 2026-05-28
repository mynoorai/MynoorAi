// Admin-only types. Canonical Product/Content/ProductCategory/PersonalColorType/
// ContentCategory/ContentStatus/CATEGORY_LABELS/PERSONAL_COLOR_LABELS live in
// `./index.ts` (the SSOT). Import those directly from `@/types`.
// API responses are JSON, so timestamp fields are ISO 8601 strings — never Date.

import type { ProductCategory, PersonalColorType, ContentCategory, ContentStatus } from './index';

export interface ProductFormData {
  name: string;
  category: ProductCategory;
  price: number;
  thumbnailUrl: string;
  detailImageUrls: string[];
  personalColors: PersonalColorType[];
  description?: string;
  shopeeLink: string;
  isActive: boolean;
}

export interface ImageUploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
}

export interface ProductFilters {
  category?: ProductCategory;
  personalColor?: PersonalColorType;
  searchTerm?: string;
}

export interface ContentFormData {
  title: string;
  subtitle?: string;
  slug: string;
  thumbnailUrl: string;
  content: string;
  excerpt?: string;
  category: ContentCategory;
  tags: string[];
  status: ContentStatus;
  metaDescription?: string;
  metaKeywords?: string;
}

// Content category labels for UI (admin-only — public pages don't categorize)
export const CONTENT_CATEGORY_LABELS: Record<ContentCategory, string> = {
  beauty_tips: 'Beauty Tips',
  hijab_styling: 'Hijab Styling',
  color_guide: 'Color Guide',
  trend: 'Trend',
  tutorial: 'Tutorial',
};

// Content status labels for UI (admin-only — public only sees published)
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  published: 'Published',
};
