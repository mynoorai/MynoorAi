export type UserRole = "user" | "admin" | "content_manager";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  instagramId?: string;
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  role: UserRole;
  lastLoginAt?: Date;
  // Personal color diagnosis (optional persistence)
  hasPersonalColorDiagnosis?: boolean;
  personalColorResult?: PersonalColorResult;
  diagnosedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Session {
  id: string;
  instagramId?: string;
  userId?: string;
  uploadedImageUrl?: string;
  analysisResult?: PersonalColorResult;
  journeyStatus?: JourneyStatus;
  priority?: Priority;
  offerSentAt?: Date;
  notes?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export type JourneyStatus =
  | "just_started"
  | "diagnosis_pending"
  | "diagnosis_done"
  | "offer_sent"
  | "recommendation_requested"
  | "recommendation_processing"
  | "recommendation_completed"
  | "inactive";

export type Priority = "urgent" | "high" | "medium" | "low";

export interface PersonalColorResult {
  personal_color: string;
  personal_color_en: "spring" | "summer" | "autumn" | "winter";
  personal_color_ko?: string;
  tone: string;
  tone_en: "warm" | "cool";
  details: {
    is_warm: number;
    skin_lab_b: number;
    eyebrow_lab_b: number;
    eye_lab_b: number;
    skin_hsv_s: number;
    eyebrow_hsv_s: number;
    eye_hsv_s: number;
  };
  facial_colors: {
    cheek: ColorInfo;
    eyebrow: ColorInfo;
    eye: ColorInfo;
  };
  confidence?: number;
}

export interface ColorInfo {
  rgb: [number, number, number];
  lab: [number, number, number];
  hsv: [number, number, number];
}

export interface UserPreferences {
  style: string[];
  priceRange: string;
  material: string[];
  occasion: string[];
  additionalNotes: string;
}

export type RecommendationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface Recommendation {
  id: string;
  sessionId: string;
  instagramId: string;
  userId?: string;
  personalColorResult: PersonalColorResult;
  userPreferences: UserPreferences;
  uploadedImageUrl?: string;
  productIds: string[];
  status: RecommendationStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export type ProductCategory = "hijab" | "lens" | "lip" | "blush";
export type PersonalColorType =
  | "spring_warm"
  | "autumn_warm"
  | "summer_cool"
  | "winter_cool";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  thumbnailUrl: string;
  detailImageUrls: string[];
  personalColors: PersonalColorType[]; // 해당 상품이 추천되는 퍼스널 컬러들
  description?: string;
  shopeeLink: string; // 쇼피 상품 링크
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentCategory =
  | "beauty_tips"
  | "hijab_styling"
  | "color_guide"
  | "trend"
  | "tutorial";
export type ContentStatus = "draft" | "published";

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
  publishedAt?: Date;
  metaDescription?: string;
  metaKeywords?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime?: Date;
}

export interface AuthenticatedRequestUser {
  userId: string;
  role: UserRole;
}

export interface AdminContext {
  userId: string;
  email: string;
  role: UserRole;
}
