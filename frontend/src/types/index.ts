// Personal Color Analysis Types
export interface PersonalColorResult {
  personal_color: string;
  personal_color_en: 'spring' | 'summer' | 'autumn' | 'winter';
  confidence?: number;
  best_colors?: string[];
  worst_colors?: string[];
  bestColors?: Color[];
  worstColors?: Color[];
  // Optional fields that may come from more detailed analysis
  tone?: string;
  tone_en?: 'warm' | 'cool';
  details?: {
    is_warm: number;
    skin_lab_b: number;
    eyebrow_lab_b: number;
    eye_lab_b: number;
    skin_hsv_s: number;
    eyebrow_hsv_s: number;
    eye_hsv_s: number;
  };
  facial_colors?: FacialColors;
}

export interface FacialColors {
  cheek: ColorInfo;
  eyebrow: ColorInfo;
  eye: ColorInfo;
}

export interface ColorInfo {
  rgb: [number, number, number];
  lab: [number, number, number];
  hsv: [number, number, number];
}

// User & Session Types
export interface UserSession {
  sessionId: string;
  instagramId: string;
  createdAt: Date;
}

export interface UserPreferences {
  style: string[];
  priceRange: string;
  material: string[];
  occasion: string[];
  additionalNotes: string;
}

// Recommendation Type
export type RecommendationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Recommendation {
  id: string;
  sessionId: string;
  instagramId: string;
  personalColorResult: PersonalColorResult;
  userPreferences: UserPreferences;
  productIds: string[];
  status: RecommendationStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Form Types
export interface FormStep {
  id: string;
  title: string;
  description?: string;
  validation?: (data: unknown) => boolean;
}

// API Types
export interface ApiError {
  error: string;
  detail: string;
  code?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// UI Component Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type ToneType = 'warm' | 'cool';

// Analysis Flow Types
export interface AnalysisStep {
  id: string;
  icon?: string;
  message: string;
  progress: number;
  duration: number;
}

// Color Palette Types
export interface Color {
  name: string;
  hex: string;
  rgb: [number, number, number];
}

export interface ColorPalette {
  bestColors: Color[];
  worstColors: Color[];
}

// Product Tracking Types
export interface ViewedProduct {
  productId: string;
  viewedAt: string; // ISO string for serialization
}

export interface SavedProduct {
  productId: string;
  savedAt: string; // ISO string for serialization
}

// Product Types (for regular users)
export type ProductCategory = 'hijab' | 'lens' | 'lip' | 'blush';
export type PersonalColorType = 'spring_warm' | 'autumn_warm' | 'summer_cool' | 'winter_cool';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  thumbnailUrl: string;
  detailImageUrls: string[];
  personalColors: PersonalColorType[]; // recommended personal colors
  description?: string;
  shopeeLink: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Category labels for UI
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  hijab: 'Hijab',
  lens: 'Contact Lens',
  lip: 'Lipstick',
  blush: 'Blusher',
};

// Personal color labels for UI
export const PERSONAL_COLOR_LABELS: Record<PersonalColorType, string> = {
  spring_warm: 'Spring Warm',
  autumn_warm: 'Autumn Warm',
  summer_cool: 'Summer Cool',
  winter_cool: 'Winter Cool',
};

// Content Types
export type ContentCategory =
  | 'beauty_tips'
  | 'hijab_styling'
  | 'color_guide'
  | 'trend'
  | 'tutorial';
export type ContentStatus = 'draft' | 'published';

export interface Content {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  thumbnailUrl: string;
  content: string; // HTML content
  excerpt?: string;
  category: ContentCategory;
  tags: string[];
  status: ContentStatus;
  publishedAt?: string;
  metaDescription?: string;
  metaKeywords?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}
