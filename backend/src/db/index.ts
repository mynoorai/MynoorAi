import {
  Session,
  Recommendation,
  User,
  RefreshToken,
  Product,
  ProductCategory,
  PersonalColorType,
  Content,
  ContentCategory,
  ContentStatus,
  UserRole,
} from "../types";
import { db as postgresDb } from "./postgres";

// In-memory storage as fallback for development
class InMemoryDatabase {
  private sessions: Map<string, Session> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private users: Map<string, User> = new Map();
  private refreshTokens: Map<string, RefreshToken> = new Map();
  private products: Map<string, Product> = new Map();
  private contents: Map<string, Content> = new Map();
  private adminActions: Array<{
    id: string;
    sessionId: string | null;
    actionType: string;
    actionDetails: unknown;
    performedBy: string;
    performedAt: Date;
  }> = [];
  private savedProducts: Map<string, Map<string, Date>> = new Map();
  private viewedProducts: Map<string, Map<string, Date>> = new Map();

  // Sessions
  async createSession(
    instagramId: string | null,
    userId?: string,
  ): Promise<Session> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: Session = {
      id: sessionId,
      instagramId: instagramId || undefined,
      userId,
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    return this.sessions.get(sessionId);
  }

  // User saved/viewed products (in-memory)
  async getUserSavedProducts(
    userId: string,
  ): Promise<Array<{ productId: string; savedAt: Date }>> {
    const map = this.savedProducts.get(userId) || new Map();
    return Array.from(map.entries())
      .map(([productId, savedAt]) => ({ productId, savedAt }))
      .sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
  }

  async addUserSavedProduct(
    userId: string,
    productId: string,
    savedAt?: Date,
  ): Promise<boolean> {
    const map = this.savedProducts.get(userId) || new Map();
    map.set(productId, savedAt ?? new Date());
    this.savedProducts.set(userId, map);
    return true;
  }

  async removeUserSavedProduct(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const map = this.savedProducts.get(userId) || new Map();
    const existed = map.delete(productId);
    this.savedProducts.set(userId, map);
    return existed;
  }

  async mergeUserSavedProducts(
    userId: string,
    items: Array<{ productId: string; savedAt?: Date }>,
  ): Promise<number> {
    const map = this.savedProducts.get(userId) || new Map();
    for (const it of items) {
      const prev = map.get(it.productId);
      const ts = it.savedAt ?? new Date();
      if (!prev || prev.getTime() < ts.getTime()) map.set(it.productId, ts);
    }
    this.savedProducts.set(userId, map);
    return items.length;
  }

  async getUserViewedProducts(
    userId: string,
  ): Promise<Array<{ productId: string; viewedAt: Date }>> {
    const map = this.viewedProducts.get(userId) || new Map();
    return Array.from(map.entries())
      .map(([productId, viewedAt]) => ({ productId, viewedAt }))
      .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime());
  }

  async upsertUserViewedProduct(
    userId: string,
    productId: string,
    viewedAt?: Date,
  ): Promise<boolean> {
    const map = this.viewedProducts.get(userId) || new Map();
    map.set(productId, viewedAt ?? new Date());
    this.viewedProducts.set(userId, map);
    return true;
  }

  async mergeUserViewedProducts(
    userId: string,
    items: Array<{ productId: string; viewedAt?: Date }>,
  ): Promise<number> {
    const map = this.viewedProducts.get(userId) || new Map();
    for (const it of items) {
      const prev = map.get(it.productId);
      const ts = it.viewedAt ?? new Date();
      if (!prev || prev.getTime() < ts.getTime()) map.set(it.productId, ts);
    }
    this.viewedProducts.set(userId, map);
    return items.length;
  }

  async updateSession(
    sessionId: string,
    updates: Partial<Pick<Session, "uploadedImageUrl" | "analysisResult">>,
  ): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (session) {
      const updatedSession = {
        ...session,
        ...updates,
        updatedAt: new Date(),
      };
      this.sessions.set(sessionId, updatedSession);
      return updatedSession;
    }
    return undefined;
  }

  // Recommendations
  async createRecommendation(
    data: Omit<Recommendation, "id" | "createdAt" | "updatedAt">,
  ): Promise<Recommendation> {
    const recommendationId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const recommendation: Recommendation = {
      ...data,
      id: recommendationId,
      status: data.status ?? "pending",
      productIds: data.productIds ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.recommendations.set(recommendationId, recommendation);
    return recommendation;
  }

  async getRecommendation(
    recommendationId: string,
  ): Promise<Recommendation | undefined> {
    return this.recommendations.get(recommendationId);
  }

  async updateRecommendationStatus(
    recommendationId: string,
    status: Recommendation["status"],
  ): Promise<Recommendation | undefined> {
    const recommendation = this.recommendations.get(recommendationId);
    if (recommendation) {
      const updated: Recommendation = {
        ...recommendation,
        status,
        completedAt:
          status === "completed"
            ? (recommendation.completedAt ?? new Date())
            : recommendation.completedAt,
        updatedAt: new Date(),
      };
      this.recommendations.set(recommendationId, updated);
      return updated;
    }
    return recommendation;
  }

  async updateRecommendationProductIds(
    recommendationId: string,
    productIds: string[],
  ): Promise<Recommendation | undefined> {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) return undefined;
    const updated: Recommendation = {
      ...recommendation,
      productIds: [...productIds],
      updatedAt: new Date(),
    };
    this.recommendations.set(recommendationId, updated);
    return updated;
  }

  // Get all recommendations (for admin/manual processing)
  async getAllRecommendations(): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // Test connection (for health checks)
  async testConnection(): Promise<boolean> {
    return true; // In-memory DB is always available
  }

  async getRecommendationsByStatus(
    status: Recommendation["status"],
  ): Promise<Recommendation[]> {
    const recs = await this.getAllRecommendations();
    return recs.filter((rec) => rec.status === status);
  }

  // Debug methods (for development only)
  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // Products
  async createProduct(
    data: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ): Promise<Product> {
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const product: Product = {
      ...data,
      id: productId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(productId, product);
    return product;
  }

  async getProduct(productId: string): Promise<Product | undefined> {
    return this.products.get(productId);
  }

  async updateProduct(
    productId: string,
    updates: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Product | undefined> {
    const product = this.products.get(productId);
    if (product) {
      const updatedProduct = {
        ...product,
        ...updates,
        updatedAt: new Date(),
      };
      this.products.set(productId, updatedProduct);
      return updatedProduct;
    }
    return undefined;
  }

  async deleteProduct(productId: string): Promise<boolean> {
    return this.products.delete(productId);
  }

  async deleteAllProducts(): Promise<void> {
    this.products.clear();
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getProductsByCategory(category: ProductCategory): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter((product) => product.category === category)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProductsByPersonalColor(
    personalColor: PersonalColorType,
  ): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter((product) => product.personalColors.includes(personalColor))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProductsByCategoryAndPersonalColor(
    category: ProductCategory,
    personalColor: PersonalColorType,
  ): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(
        (product) =>
          product.category === category &&
          product.personalColors.includes(personalColor),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const idSet = new Set(ids);
    return Array.from(this.products.values())
      .filter((product) => idSet.has(product.id))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async clearAllData(): Promise<void> {
    this.sessions.clear();
    this.recommendations.clear();
    this.users.clear();
    this.refreshTokens.clear();
    this.products.clear();
    this.contents.clear();
  }

  // Content methods
  async createContent(
    data: Omit<Content, "id" | "createdAt" | "updatedAt" | "viewCount">,
  ): Promise<Content> {
    const contentId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const content: Content = {
      ...data,
      id: contentId,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: data.status === "published" ? new Date() : undefined,
    };

    this.contents.set(contentId, content);
    return content;
  }

  // Pure read — no side effects (use incrementContentView to record a view).
  async getContent(contentId: string): Promise<Content | undefined> {
    const content = this.contents.get(contentId);
    return content ? { ...content } : undefined;
  }

  // Admin-safe fetch: no view count mutation (kept for API symmetry with
  // postgres backend; behaviour matches getContent now).
  async getContentForAdmin(contentId: string): Promise<Content | undefined> {
    return this.getContent(contentId);
  }

  // Pure read — no side effects.
  async getContentBySlug(slug: string): Promise<Content | undefined> {
    const content = Array.from(this.contents.values()).find(
      (c) => c.slug === slug,
    );
    return content ? { ...content } : undefined;
  }

  // Admin-safe slug fetch: no view count mutation.
  async getContentBySlugForAdmin(slug: string): Promise<Content | undefined> {
    return this.getContentBySlug(slug);
  }

  async incrementContentView(idOrSlug: string): Promise<boolean> {
    const direct = this.contents.get(idOrSlug);
    const target =
      direct ??
      Array.from(this.contents.values()).find((c) => c.slug === idOrSlug);
    if (!target) return false;
    target.viewCount = (target.viewCount ?? 0) + 1;
    target.updatedAt = new Date();
    this.contents.set(target.id, target);
    return true;
  }

  async updateContent(
    contentId: string,
    updates: Partial<
      Omit<Content, "id" | "createdAt" | "updatedAt" | "viewCount">
    >,
  ): Promise<Content | undefined> {
    const content = this.contents.get(contentId);
    if (content) {
      const updatedContent = {
        ...content,
        ...updates,
        updatedAt: new Date(),
        publishedAt:
          updates.status === "published" && !content.publishedAt
            ? new Date()
            : content.publishedAt,
      };
      this.contents.set(contentId, updatedContent);
      return updatedContent;
    }
    return undefined;
  }

  async deleteContent(contentId: string): Promise<boolean> {
    return this.contents.delete(contentId);
  }

  async getAllContents(filters?: {
    category?: ContentCategory;
    status?: ContentStatus;
    orderBy?: "created_at_desc" | "published_at_desc" | "view_count_desc";
    limit?: number;
    offset?: number;
  }): Promise<Content[]> {
    let contents = Array.from(this.contents.values());

    if (filters?.category) {
      contents = contents.filter(
        (content) => content.category === filters.category,
      );
    }

    if (filters?.status) {
      contents = contents.filter(
        (content) => content.status === filters.status,
      );
    }

    const orderBy = filters?.orderBy ?? "created_at_desc";
    contents.sort((a, b) => {
      if (orderBy === "view_count_desc") {
        return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      }
      if (orderBy === "published_at_desc") {
        const dateA = a.publishedAt || a.createdAt;
        const dateB = b.publishedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const offset = filters?.offset ?? 0;
    const end =
      filters?.limit !== undefined ? offset + filters.limit : contents.length;
    return contents.slice(offset, end);
  }

  async countContents(filters?: {
    category?: ContentCategory;
    status?: ContentStatus;
  }): Promise<number> {
    let contents = Array.from(this.contents.values());
    if (filters?.category) {
      contents = contents.filter((c) => c.category === filters.category);
    }
    if (filters?.status) {
      contents = contents.filter((c) => c.status === filters.status);
    }
    return contents.length;
  }

  async updateContentStatus(
    contentId: string,
    status: ContentStatus,
  ): Promise<Content | undefined> {
    const content = this.contents.get(contentId);
    if (content) {
      content.status = status;
      content.updatedAt = new Date();
      if (status === "published" && !content.publishedAt) {
        content.publishedAt = new Date();
      }
      this.contents.set(contentId, content);
      return content;
    }
    return undefined;
  }

  async addAdminAction(
    sessionId: string | null,
    actionType: string,
    actionDetails: unknown,
    performedBy: string = "admin",
  ): Promise<boolean> {
    this.adminActions.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      actionType,
      actionDetails,
      performedBy,
      performedAt: new Date(),
    });
    return true;
  }

  async getAdminActions(sessionId?: string): Promise<unknown[]> {
    if (!sessionId) {
      return [...this.adminActions];
    }
    return this.adminActions.filter((action) => action.sessionId === sessionId);
  }

  // User methods - STUBBED for auth bypass
  async getAllUsers(filters?: {
    search?: string;
    role?: UserRole;
    emailVerified?: boolean;
    offset?: number;
    limit?: number;
  }): Promise<User[]> {
    let list = Array.from(this.users.values());
    // Filters
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.fullName?.toLowerCase().includes(q),
      );
    }
    if (filters?.role) {
      list = list.filter((u) => u.role === filters.role);
    }
    if (typeof filters?.emailVerified === "boolean") {
      list = list.filter((u) => u.emailVerified === filters.emailVerified);
    }
    // Sort by createdAt desc
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    // Pagination
    const start = Math.max(0, filters?.offset ?? 0);
    const end = (filters?.limit ?? list.length) + start;
    return list.slice(start, end).map((u) => ({ ...u }));
  }
  async createUser(
    data: Omit<User, "id" | "createdAt" | "updatedAt">,
  ): Promise<User> {
    // Prevent duplicate emails (mimic DB unique constraint)
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const user: User = {
      id: userId,
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      instagramId: data.instagramId,
      emailVerified: data.emailVerified ?? false,
      verificationToken: data.verificationToken,
      verificationTokenExpires: data.verificationTokenExpires,
      resetPasswordToken: data.resetPasswordToken,
      resetPasswordExpires: data.resetPasswordExpires,
      role: data.role ?? "user",
      lastLoginAt: data.lastLoginAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(userId, user);
    return { ...user };
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    return user ? { ...user } : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return { ...user };
      }
    }
    return undefined;
  }

  async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    const existing = this.users.get(userId);
    if (!existing) {
      return undefined;
    }

    const updatedUser: User = {
      ...existing,
      ...updates,
      email: updates.email ?? existing.email,
      passwordHash: updates.passwordHash ?? existing.passwordHash,
      fullName: updates.fullName ?? existing.fullName,
      emailVerified: updates.emailVerified ?? existing.emailVerified,
      verificationToken:
        updates.verificationToken ?? existing.verificationToken,
      verificationTokenExpires:
        updates.verificationTokenExpires ?? existing.verificationTokenExpires,
      resetPasswordToken:
        updates.resetPasswordToken ?? existing.resetPasswordToken,
      resetPasswordExpires:
        updates.resetPasswordExpires ?? existing.resetPasswordExpires,
      lastLoginAt: updates.lastLoginAt ?? existing.lastLoginAt,
      role: updates.role ?? existing.role,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return { ...updatedUser };
  }

  // Refresh token methods
  async createRefreshToken(
    data: Omit<RefreshToken, "id" | "createdAt">,
  ): Promise<RefreshToken> {
    const tokenId = `refresh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const refreshToken: RefreshToken = {
      id: tokenId,
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };

    this.refreshTokens.set(tokenId, refreshToken);
    return { ...refreshToken };
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const now = Date.now();
    for (const rt of this.refreshTokens.values()) {
      if (rt.token === token && rt.expiresAt.getTime() > now) {
        return { ...rt };
      }
    }
    return undefined;
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    for (const [id, rt] of this.refreshTokens.entries()) {
      if (rt.token === token) {
        this.refreshTokens.delete(id);
        return true;
      }
    }
    return false;
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    for (const [id, rt] of this.refreshTokens.entries()) {
      if (rt.userId === userId) {
        this.refreshTokens.delete(id);
      }
    }
  }

  // Delete a specific session
  async deleteSession(sessionId: string): Promise<boolean> {
    const existed = this.sessions.has(sessionId);
    if (existed) {
      this.sessions.delete(sessionId);
      // Also delete associated recommendations
      const recommendations = Array.from(this.recommendations.values());
      for (const rec of recommendations) {
        if (rec.sessionId === sessionId) {
          this.recommendations.delete(rec.id);
        }
      }
      console.info(`Session ${sessionId} and associated data deleted`);
    }
    return existed;
  }

  // Email verification methods
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    if (!token) return undefined;
    const now = Date.now();
    for (const user of this.users.values()) {
      if (
        user.verificationToken === token &&
        (!user.verificationTokenExpires ||
          user.verificationTokenExpires.getTime() > now) &&
        user.emailVerified === false
      ) {
        return { ...user };
      }
    }
    return undefined;
  }

  async verifyUserEmail(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.updatedAt = new Date();

    this.users.set(userId, user);
    return true;
  }

  // Password reset methods
  async getUserByResetToken(token: string): Promise<User | undefined> {
    if (!token) return undefined;
    const now = Date.now();
    for (const user of this.users.values()) {
      if (
        user.resetPasswordToken === token &&
        user.resetPasswordExpires &&
        user.resetPasswordExpires.getTime() > now
      ) {
        return { ...user };
      }
    }
    return undefined;
  }

  async resetUserPassword(
    userId: string,
    newPasswordHash: string,
  ): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.passwordHash = newPasswordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = new Date();

    this.users.set(userId, user);
    return true;
  }

  async cleanupExpiredResetTokens(): Promise<void> {
    const now = Date.now();
    for (const user of this.users.values()) {
      if (
        user.resetPasswordExpires &&
        user.resetPasswordExpires.getTime() <= now
      ) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.updatedAt = new Date();
      }
      if (
        user.verificationTokenExpires &&
        user.verificationTokenExpires.getTime() <= now
      ) {
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        user.updatedAt = new Date();
      }
    }
  }
}

// Database interface to ensure consistency
interface Database {
  createSession(instagramId: string | null, userId?: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  updateSession?(
    sessionId: string,
    updates: Partial<Pick<Session, "uploadedImageUrl" | "analysisResult">>,
  ): Promise<Session | undefined>;
  createRecommendation(
    data: Omit<Recommendation, "id" | "createdAt" | "updatedAt">,
  ): Promise<Recommendation>;
  getRecommendation(
    recommendationId: string,
  ): Promise<Recommendation | undefined>;
  updateRecommendationStatus(
    recommendationId: string,
    status: Recommendation["status"],
  ): Promise<Recommendation | undefined>;
  updateRecommendationProductIds?(
    recommendationId: string,
    productIds: string[],
  ): Promise<Recommendation | undefined>;
  getAllRecommendations(): Promise<Recommendation[]>;
  getRecommendationsByStatus(
    status: Recommendation["status"],
  ): Promise<Recommendation[]>;
  testConnection?(): Promise<boolean>;
  // User methods
  getAllUsers?(filters?: {
    search?: string;
    role?: UserRole;
    emailVerified?: boolean;
    offset?: number;
    limit?: number;
  }): Promise<User[]>;
  createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
  getUserById(userId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | undefined>;
  // Email verification methods
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  verifyUserEmail(userId: string): Promise<boolean>;
  // Password reset methods
  getUserByResetToken(token: string): Promise<User | undefined>;
  resetUserPassword(userId: string, newPasswordHash: string): Promise<boolean>;
  cleanupExpiredResetTokens?(): Promise<void>;
  // Refresh token methods
  createRefreshToken(
    data: Omit<RefreshToken, "id" | "createdAt">,
  ): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<boolean>;
  deleteUserRefreshTokens(userId: string): Promise<void>;
  // Debug methods
  getAllSessions?(): Promise<Session[]>;
  // Product methods
  createProduct?(
    data: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ): Promise<Product>;
  getProduct?(productId: string): Promise<Product | undefined>;
  updateProduct?(
    productId: string,
    updates: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Product | undefined>;
  deleteProduct?(productId: string): Promise<boolean>;
  deleteAllProducts?(): Promise<void>;
  getAllProducts?(): Promise<Product[]>;
  getProductsByCategory?(category: ProductCategory): Promise<Product[]>;
  getProductsByPersonalColor?(
    personalColor: PersonalColorType,
  ): Promise<Product[]>;
  getProductsByCategoryAndPersonalColor?(
    category: ProductCategory,
    personalColor: PersonalColorType,
  ): Promise<Product[]>;
  getProductsByIds?(ids: string[]): Promise<Product[]>;
  clearAllData?(): Promise<void>;
  deleteSession?(sessionId: string): Promise<boolean>;
  // Content methods
  createContent?(
    data: Omit<Content, "id" | "createdAt" | "updatedAt" | "viewCount">,
  ): Promise<Content>;
  getContent?(contentId: string): Promise<Content | undefined>;
  getContentBySlug?(slug: string): Promise<Content | undefined>;
  getContentForAdmin?(contentId: string): Promise<Content | undefined>;
  getContentBySlugForAdmin?(slug: string): Promise<Content | undefined>;
  updateContent?(
    contentId: string,
    updates: Partial<
      Omit<Content, "id" | "createdAt" | "updatedAt" | "viewCount">
    >,
  ): Promise<Content | undefined>;
  deleteContent?(contentId: string): Promise<boolean>;
  getAllContents?(filters?: {
    category?: ContentCategory;
    status?: ContentStatus;
    orderBy?: "created_at_desc" | "published_at_desc" | "view_count_desc";
    limit?: number;
    offset?: number;
  }): Promise<Content[]>;
  countContents?(filters?: {
    category?: ContentCategory;
    status?: ContentStatus;
  }): Promise<number>;
  incrementContentView?(idOrSlug: string): Promise<boolean>;
  updateContentStatus?(
    contentId: string,
    status: ContentStatus,
  ): Promise<Content | undefined>;
  addAdminAction?(
    sessionId: string | null,
    actionType: string,
    actionDetails: unknown,
    performedBy?: string,
  ): Promise<boolean>;
  getAdminActions?(sessionId?: string): Promise<unknown[]>;
  // Saved/viewed products
  getUserSavedProducts?(
    userId: string,
  ): Promise<Array<{ productId: string; savedAt: Date }>>;
  addUserSavedProduct?(
    userId: string,
    productId: string,
    savedAt?: Date,
  ): Promise<boolean>;
  removeUserSavedProduct?(userId: string, productId: string): Promise<boolean>;
  mergeUserSavedProducts?(
    userId: string,
    items: Array<{ productId: string; savedAt?: Date }>,
  ): Promise<number>;
  getUserViewedProducts?(
    userId: string,
  ): Promise<Array<{ productId: string; viewedAt: Date }>>;
  upsertUserViewedProduct?(
    userId: string,
    productId: string,
    viewedAt?: Date,
  ): Promise<boolean>;
  mergeUserViewedProducts?(
    userId: string,
    items: Array<{ productId: string; viewedAt?: Date }>,
  ): Promise<number>;
}

// Use PostgreSQL if DATABASE_URL is set, otherwise use in-memory
const usePostgres = !!process.env.DATABASE_URL;

// Secure logging - never log actual DATABASE_URL content
if (process.env.NODE_ENV !== "production") {
  console.log("Database configuration:", {
    hasConnectionString: !!process.env.DATABASE_URL,
    databaseType: usePostgres ? "PostgreSQL" : "In-Memory",
  });
} else {
  // In production, only log that database is configured
  console.info(`Database type: ${usePostgres ? "PostgreSQL" : "In-Memory"}`);
  if (process.env.DATABASE_URL) {
    console.info("DATABASE_URL exists:", true);
    console.info("DATABASE_URL length:", process.env.DATABASE_URL.length);
    // Extract and log only the host part for debugging
    const hostMatch = process.env.DATABASE_URL.match(/@([^:/]+)/);
    if (hostMatch) {
      console.info("Database host from env:", hostMatch[1]);
    }
  }
}

export const db: Database = usePostgres ? postgresDb : new InMemoryDatabase();

// Initialize database on startup
if (usePostgres) {
  void postgresDb.testConnection().then((connected) => {
    if (connected) {
      console.info("Using PostgreSQL database");
      // Initialize schema (uses IF NOT EXISTS, safe to run every time)
      postgresDb.initialize().catch((err) => {
        console.error("Schema initialization failed:", err);
      });
    } else {
      if (process.env.NODE_ENV === "production") {
        console.error("FATAL: PostgreSQL connection failed in production");
        process.exit(1);
      }
      console.warn(
        "PostgreSQL connection failed, falling back to in-memory database",
      );
    }
  });
} else {
  if (process.env.NODE_ENV === "production") {
    // In unified container, DATABASE_URL will be set by startup script
    console.info(
      "DATABASE_URL not yet set, will be configured by container startup script",
    );
  } else {
    console.warn("⚠️  Using in-memory database (DATA WILL BE LOST ON RESTART)");
    console.info("Set DATABASE_URL environment variable to use PostgreSQL");
  }
}
