import { Router, Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { authenticateAdmin } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import type {
  Product,
  ProductCategory,
  PersonalColorType,
  ContentCategory,
  ContentStatus,
  UserRole,
  RecommendationStatus,
} from "../types";
import { logAdminAction } from "../services/adminAuditService";
import { emailService } from "../services/emailService";

const RECOMMENDATION_STATUSES: readonly RecommendationStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

const router = Router();

const auditAdmin = (
  req: Request,
  actionType: string,
  details: Record<string, unknown> = {},
  sessionId?: string | null,
): void => {
  if (!req.adminUser) {
    return;
  }

  void logAdminAction(actionType, details, req.adminUser, sessionId ?? null);
};

// 슬러그를 일관되게 정규화
const normalizeSlug = (raw: string): string => {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

// 이미 존재하는 슬러그가 있을 경우 -1, -2 식으로 유니크 슬러그 생성
const ensureUniqueSlug = async (
  baseSlug: string,
  excludeId?: string,
): Promise<string> => {
  try {
    if (!db.getAllContents) return baseSlug;
    const contents = await db.getAllContents();
    const existing = new Set(
      contents
        .filter((c) => !excludeId || c.id !== excludeId)
        .map((c) => c.slug)
        .filter(Boolean),
    );

    if (!existing.has(baseSlug)) return baseSlug;

    let counter = 1;
    let candidate = `${baseSlug}-${counter}`;
    while (existing.has(candidate)) {
      counter += 1;
      candidate = `${baseSlug}-${counter}`;
    }
    return candidate;
  } catch (error) {
    console.warn(
      "[Admin API] Failed to ensure unique slug, using base:",
      error,
    );
    return baseSlug;
  }
};

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// GET /api/admin/verify - Verify admin session
router.get("/verify", (req, res) => {
  res.json({
    success: true,
    message: "Admin session is valid",
    data: {
      admin: req.adminUser,
    },
  });
});

// GET /api/admin/products - Get all products with filters
router.get("/products", async (req, res, next) => {
  try {
    const { category, personalColor } = req.query;

    let products: Product[];

    if (category && personalColor) {
      if (!db.getProductsByCategoryAndPersonalColor) {
        throw new AppError(500, "Product functionality not available");
      }
      products = await db.getProductsByCategoryAndPersonalColor(
        category as ProductCategory,
        personalColor as PersonalColorType,
      );
    } else if (category) {
      if (!db.getProductsByCategory) {
        throw new AppError(500, "Product functionality not available");
      }
      products = await db.getProductsByCategory(category as ProductCategory);
    } else if (personalColor) {
      if (!db.getProductsByPersonalColor) {
        throw new AppError(500, "Product functionality not available");
      }
      products = await db.getProductsByPersonalColor(
        personalColor as PersonalColorType,
      );
    } else {
      if (!db.getAllProducts) {
        throw new AppError(500, "Product functionality not available");
      }
      products = await db.getAllProducts();
    }

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/products/:id - Get single product
router.get("/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!db.getProduct) {
      throw new AppError(500, "Product functionality not available");
    }
    const product = await db.getProduct(id);

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/products - Create new product
router.post("/products", async (req, res, next) => {
  try {
    console.log(
      "[Admin API] Create product request body:",
      JSON.stringify(req.body, null, 2),
    );

    const {
      name,
      category,
      price,
      thumbnailUrl,
      detailImageUrls,
      personalColors,
      description,
      shopeeLink,
      isActive,
    } = req.body;

    console.log("[Admin API] Extracted fields:", {
      name,
      category,
      price,
      thumbnailUrl,
      personalColors,
      shopeeLink,
      isActive,
    });

    // Validation
    if (
      !name ||
      !category ||
      price === undefined ||
      price === null ||
      !thumbnailUrl ||
      !personalColors
    ) {
      console.error("[Admin API] Missing required fields:", {
        name: !!name,
        category: !!category,
        price: price,
        price_type: typeof price,
        thumbnailUrl: !!thumbnailUrl,
        personalColors: !!personalColors,
      });
      throw new AppError(400, "Missing required fields");
    }

    // Validate price is a positive number
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      console.error(
        "[Admin API] Invalid price:",
        price,
        "converted to:",
        numPrice,
      );
      throw new AppError(400, "Price must be a positive number");
    }
    // PostgreSQL integer upper bound safeguard
    const MAX_INT = 2147483647;
    if (numPrice > MAX_INT) {
      console.error("[Admin API] Price out of range (max int):", numPrice);
      throw new AppError(400, `Price too large. Max allowed is ${MAX_INT}`);
    }

    const validCategories: ProductCategory[] = [
      "hijab",
      "lens",
      "lip",
      "blush",
    ];
    if (!validCategories.includes(category)) {
      console.error("[Admin API] Invalid category:", category);
      throw new AppError(400, `Invalid category: ${category}`);
    }

    const validPersonalColors: PersonalColorType[] = [
      "spring_warm",
      "autumn_warm",
      "summer_cool",
      "winter_cool",
    ];
    if (
      !Array.isArray(personalColors) ||
      !personalColors.every((pc) => validPersonalColors.includes(pc))
    ) {
      throw new AppError(400, "Invalid personal colors");
    }

    if (!db.createProduct) {
      console.error("[Admin API] db.createProduct is not available");
      throw new AppError(500, "Product functionality not available");
    }

    const productData = {
      name,
      category,
      price: numPrice, // Use validated price
      thumbnailUrl,
      detailImageUrls: detailImageUrls || [],
      personalColors,
      description: description || "", // Ensure description is not undefined
      shopeeLink: shopeeLink || "", // Provide empty string as default
      isActive: isActive !== false,
    };

    console.log(
      "[Admin API] Creating product with data:",
      JSON.stringify(productData, null, 2),
    );

    let product;
    try {
      product = await db.createProduct(productData);
      console.log("[Admin API] Product created successfully:", product.id);
      auditAdmin(req, "product_create", {
        productId: product.id,
        name: product.name,
      });
    } catch (dbError) {
      console.error("[Admin API] Database error creating product:", dbError);
      if (dbError instanceof Error) {
        console.error("[Admin API] Error details:", {
          message: dbError.message,
          stack: dbError.stack,
          code: (dbError as { code?: string }).code,
        });
      }
      throw dbError;
    }

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/products/:id - Update product
router.put("/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate category if provided
    if (updates.category) {
      const validCategories: ProductCategory[] = [
        "hijab",
        "lens",
        "lip",
        "blush",
      ];
      if (!validCategories.includes(updates.category)) {
        console.error(
          "[Admin API] Invalid category in update:",
          updates.category,
        );
        throw new AppError(400, `Invalid category: ${updates.category}`);
      }
    }

    // Validate personal colors if provided
    if (updates.personalColors) {
      const validPersonalColors: PersonalColorType[] = [
        "spring_warm",
        "autumn_warm",
        "summer_cool",
        "winter_cool",
      ];
      if (
        !Array.isArray(updates.personalColors) ||
        !updates.personalColors.every((pc: string) =>
          validPersonalColors.includes(pc as PersonalColorType),
        )
      ) {
        throw new AppError(400, "Invalid personal colors");
      }
    }

    // Validate price before hitting the database to avoid persisting bad data
    if (updates.price !== undefined) {
      const up = Number(updates.price);
      if (isNaN(up) || up <= 0) {
        throw new AppError(400, "Price must be a positive number");
      }
      const MAX_INT = 2147483647;
      if (up > MAX_INT) {
        throw new AppError(400, `Price too large. Max allowed is ${MAX_INT}`);
      }
    }

    // Convert empty shopeeLink to empty string if needed
    if (updates.shopeeLink === null || updates.shopeeLink === undefined) {
      updates.shopeeLink = "";
    }

    if (!db.updateProduct) {
      throw new AppError(500, "Product functionality not available");
    }
    const product = await db.updateProduct(id, updates);

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    auditAdmin(req, "product_update", {
      productId: product.id,
      fields: Object.keys(updates ?? {}),
    });

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/products/:id - Delete product
router.delete("/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!db.deleteProduct) {
      throw new AppError(500, "Product functionality not available");
    }
    const deleted = await db.deleteProduct(id);

    if (!deleted) {
      throw new AppError(404, "Product not found");
    }

    auditAdmin(req, "product_delete", { productId: id });

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/products/bulk-delete - Bulk delete products by IDs
// Empty/missing ids → 400 (never silently delete all). To wipe the table use
// the dedicated seed/reset scripts.
const BULK_DELETE_MAX = 100;

router.post("/products/bulk-delete", async (req, res, next) => {
  try {
    const { ids } = req.body as { ids?: unknown };

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError(400, "ids must be a non-empty array");
    }
    if (ids.some((id) => typeof id !== "string")) {
      throw new AppError(400, "ids must be an array of strings");
    }
    if (ids.length > BULK_DELETE_MAX) {
      throw new AppError(
        400,
        `Cannot delete more than ${BULK_DELETE_MAX} products in a single request`,
      );
    }

    if (!db.deleteProduct) {
      throw new AppError(500, "Product functionality not available");
    }

    const stringIds = ids as string[];
    await Promise.all(stringIds.map((id) => db.deleteProduct!(id)));
    auditAdmin(req, "products_bulk_delete", { count: stringIds.length });
    return res.json({ success: true, message: "Selected products deleted" });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/upload/image - Upload image
router.post("/upload/image", upload.single("image"), (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, "No image file provided");
    }

    // In production, you would upload to cloud storage (S3, Cloudinary, etc.)
    // For development, we'll return a local URL
    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
    auditAdmin(req, "asset_upload_single", {
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/upload/images - Upload multiple images
router.post("/upload/images", upload.array("images", 10), (req, res, next) => {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      throw new AppError(400, "No image files provided");
    }

    const images = req.files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    }));

    res.json({
      success: true,
      data: images,
    });
    auditAdmin(req, "asset_upload_bulk", {
      fileCount: images.length,
    });
  } catch (error) {
    next(error);
  }
});

// Content Management Routes

// GET /api/admin/contents - Get all contents with filters
router.get("/contents", async (req, res, next) => {
  try {
    const { category, status } = req.query;

    if (!db.getAllContents) {
      throw new AppError(500, "Content functionality not available");
    }

    const contents = await db.getAllContents({
      category: category as ContentCategory | undefined,
      status: status as ContentStatus | undefined,
    });

    res.json({
      success: true,
      data: contents,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/contents/:id - Get single content
router.get("/contents/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!db.getContentForAdmin) {
      throw new AppError(500, "Content functionality not available");
    }
    const content = await db.getContentForAdmin(id);

    if (!content) {
      throw new AppError(404, "Content not found");
    }

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/contents/slug/:slug - Get content by slug
router.get("/contents/slug/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!db.getContentBySlugForAdmin) {
      throw new AppError(500, "Content functionality not available");
    }
    const content = await db.getContentBySlugForAdmin(slug);

    if (!content) {
      throw new AppError(404, "Content not found");
    }

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/contents - Create new content
router.post("/contents", async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      slug,
      thumbnailUrl,
      content,
      excerpt,
      category,
      tags,
      status,
      metaDescription,
      metaKeywords,
    } = req.body;

    // Validation
    if (!title || !thumbnailUrl || !content || !category) {
      throw new AppError(400, "Missing required fields");
    }

    // Generate slug if missing/empty - basic normalization from title
    const rawSlug =
      slug && String(slug).trim().length > 0 ? String(slug).trim() : title;
    const baseSlug = normalizeSlug(rawSlug) || `content-${Date.now()}`;
    const uniqueSlug = await ensureUniqueSlug(baseSlug);

    const validCategories: ContentCategory[] = [
      "beauty_tips",
      "hijab_styling",
      "color_guide",
      "trend",
      "tutorial",
    ];
    if (!validCategories.includes(category)) {
      throw new AppError(400, "Invalid category");
    }

    const validStatuses: ContentStatus[] = ["draft", "published"];
    if (status && !validStatuses.includes(status)) {
      throw new AppError(400, "Invalid status");
    }

    if (!db.createContent) {
      throw new AppError(500, "Content functionality not available");
    }
    const newContent = await db.createContent({
      title,
      subtitle,
      slug: uniqueSlug,
      thumbnailUrl,
      content,
      excerpt,
      category,
      tags: tags || [],
      status: status || "draft",
      metaDescription,
      metaKeywords,
    });

    res.status(201).json({
      success: true,
      data: newContent,
    });
    auditAdmin(req, "content_create", {
      contentId: newContent.id,
      slug: newContent.slug,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/contents/:id - Update content
router.put("/contents/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Validate category if provided
    if (updates.category) {
      const validCategories: ContentCategory[] = [
        "beauty_tips",
        "hijab_styling",
        "color_guide",
        "trend",
        "tutorial",
      ];
      if (!validCategories.includes(updates.category)) {
        throw new AppError(400, "Invalid category");
      }
    }

    // Validate status if provided
    if (updates.status) {
      const validStatuses: ContentStatus[] = ["draft", "published"];
      if (!validStatuses.includes(updates.status)) {
        throw new AppError(400, "Invalid status");
      }
    }

    // Normalize and deduplicate slug if provided
    if (typeof updates.slug === "string") {
      const normalized = normalizeSlug(updates.slug) || `content-${Date.now()}`;
      updates.slug = await ensureUniqueSlug(normalized, id);
    }

    if (!db.updateContent) {
      throw new AppError(500, "Content functionality not available");
    }
    const updatedContent = await db.updateContent(id, updates);

    if (!updatedContent) {
      throw new AppError(404, "Content not found");
    }

    auditAdmin(req, "content_update", {
      contentId: updatedContent.id,
      fields: Object.keys(updates),
    });

    res.json({
      success: true,
      data: updatedContent,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/contents/bulk-delete - Bulk delete contents by IDs
router.post("/contents/bulk-delete", async (req, res, next) => {
  try {
    const { ids } = req.body as { ids?: unknown };
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError(400, "ids must be a non-empty array");
    }
    if (ids.some((id) => typeof id !== "string")) {
      throw new AppError(400, "ids must be an array of strings");
    }
    if (ids.length > BULK_DELETE_MAX) {
      throw new AppError(
        400,
        `Cannot delete more than ${BULK_DELETE_MAX} contents in a single request`,
      );
    }
    if (!db.deleteContent) {
      throw new AppError(500, "Content functionality not available");
    }
    const stringIds = ids as string[];
    await Promise.all(stringIds.map((id) => db.deleteContent!(id)));
    auditAdmin(req, "contents_bulk_delete", { count: stringIds.length });
    res.json({ success: true, message: "Selected contents deleted" });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/contents/:id/status - Update content status
router.put("/contents/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError(400, "Status is required");
    }

    const validStatuses: ContentStatus[] = ["draft", "published"];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, "Invalid status");
    }

    if (!db.updateContentStatus) {
      throw new AppError(500, "Content functionality not available");
    }
    const updatedContent = await db.updateContentStatus(id, status);

    if (!updatedContent) {
      throw new AppError(404, "Content not found");
    }

    auditAdmin(req, "content_status_update", {
      contentId: updatedContent.id,
      status,
    });

    res.json({
      success: true,
      data: updatedContent,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/contents/:id - Delete content
router.delete("/contents/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!db.deleteContent) {
      throw new AppError(500, "Content functionality not available");
    }
    const deleted = await db.deleteContent(id);

    if (!deleted) {
      throw new AppError(404, "Content not found");
    }

    auditAdmin(req, "content_delete", { contentId: id });

    res.json({
      success: true,
      message: "Content deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Recommendation management (admin-facing, aligns with frontend admin calls)
router.get("/recommendations/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!db.getRecommendation) {
      throw new AppError(500, "Recommendation functionality not available");
    }
    const recommendation = await db.getRecommendation(id);
    if (!recommendation) {
      throw new AppError(404, "Recommendation not found");
    }
    res.json({ success: true, data: recommendation });
  } catch (error) {
    next(error);
  }
});

router.put("/recommendations/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, productIds } = req.body as {
      status?: RecommendationStatus;
      productIds?: unknown;
    };

    if (
      !status ||
      !RECOMMENDATION_STATUSES.includes(status as RecommendationStatus)
    ) {
      throw new AppError(
        400,
        `Invalid status value. Allowed: ${RECOMMENDATION_STATUSES.join(", ")}`,
      );
    }

    if (!db.updateRecommendationStatus || !db.getRecommendation) {
      throw new AppError(500, "Recommendation functionality not available");
    }

    // Capture the prior status BEFORE mutation so the completed-email trigger
    // stays idempotent: we only notify on the pending|processing → completed
    // transition, never on a re-save of an already-completed recommendation.
    const previous = await db.getRecommendation(id);
    if (!previous) {
      throw new AppError(404, "Recommendation not found");
    }

    // Optional curated product list. Validate every id exists; reject the
    // whole request on any miss so the admin doesn't ship a broken bundle.
    let validatedProductIds: string[] | undefined;
    if (productIds !== undefined) {
      if (
        !Array.isArray(productIds) ||
        productIds.some((p) => typeof p !== "string")
      ) {
        throw new AppError(400, "productIds must be an array of strings");
      }
      validatedProductIds = productIds as string[];
      if (!db.getProduct) {
        throw new AppError(500, "Product functionality not available");
      }
      for (const pid of validatedProductIds) {
        const product = await db.getProduct(pid);
        if (!product) {
          throw new AppError(400, `Product not found: ${pid}`);
        }
      }
    }

    let updated = await db.updateRecommendationStatus(id, status);
    if (!updated) {
      throw new AppError(404, "Recommendation not found");
    }

    if (validatedProductIds && db.updateRecommendationProductIds) {
      const withProducts = await db.updateRecommendationProductIds(
        id,
        validatedProductIds,
      );
      if (withProducts) updated = withProducts;
    }

    auditAdmin(req, "recommendation_status_update", {
      recommendationId: updated.id,
      status,
      productIdCount: validatedProductIds?.length,
    });

    // Email trigger: completed transition only, swallow send failures so the
    // admin's status update never gets rolled back by a flaky email provider.
    if (status === "completed" && previous.status !== "completed") {
      try {
        const session = await db.getSession(updated.sessionId);
        const userId = session?.userId;
        const user = userId ? await db.getUserById(userId) : undefined;
        if (user?.email) {
          await emailService.sendRecommendationReady({
            userEmail: user.email,
            userName: user.fullName,
            recommendationId: updated.id,
          });
        }
      } catch (emailErr) {
        console.error("[Admin API] Failed to send recommendation-ready email", {
          recommendationId: updated.id,
          error: emailErr,
        });
      }
    }

    res.json({
      success: true,
      data: updated,
      message: "Status updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users - List registered users (sanitized)
router.get("/users", async (req, res, next) => {
  try {
    const {
      q,
      role,
      verified,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
    const limitNum = Math.max(
      1,
      Math.min(100, parseInt(limit || "20", 10) || 20),
    );
    const offset = (pageNum - 1) * limitNum;

    // Fetch users via DB helpers when available
    const users = db.getAllUsers
      ? await db.getAllUsers({
          search: q,
          role: role as UserRole | undefined,
          emailVerified:
            typeof verified === "string" ? verified === "true" : undefined,
          offset,
          limit: limitNum,
        })
      : [];

    // Sanitize
    const { sanitizeUser } = await import("../utils/auth");
    const sanitized = users.map((u) => sanitizeUser(u));
    res.json({
      success: true,
      data: sanitized,
      pagination: { page: pageNum, limit: limitNum, count: sanitized.length },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
