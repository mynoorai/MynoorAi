import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { db } from "../db";
import { AppError } from "../middleware/errorHandler";
import type { ContentCategory, RateLimitInfo } from "../types";

const router = Router();

// Rate-limit view-count increments: same IP can only count one view per content
// every 5 minutes. Bot crawlers and React Strict Mode double-mounts are absorbed.
const viewIncrementLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1,
  keyGenerator: (req: Request) =>
    `${req.ip ?? "unknown"}:${req.params.idOrSlug}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: "View already recorded recently",
      retryAfter: (req.rateLimit as RateLimitInfo | undefined)?.resetTime,
    });
  },
});

// GET /api/contents - Get all published contents (public)
router.get("/", async (req, res, next) => {
  try {
    const { category, limit, offset } = req.query;

    if (!db.getAllContents || !db.countContents) {
      throw new AppError(500, "Content functionality not available");
    }

    const parsedLimit =
      typeof limit === "string" ? parseInt(limit, 10) : Number.NaN;
    const parsedOffset =
      typeof offset === "string" ? parseInt(offset, 10) : Number.NaN;
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;
    const safeOffset =
      Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const filters = {
      category: category as ContentCategory,
      status: "published" as const,
    };

    const [contents, total] = await Promise.all([
      db.getAllContents({
        ...filters,
        orderBy: "published_at_desc",
        limit: safeLimit,
        offset: safeOffset,
      }),
      db.countContents(filters),
    ]);

    const endIndex = safeOffset + (safeLimit ?? contents.length);
    res.json({
      success: true,
      data: contents,
      total,
      hasMore: endIndex < total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contents/popular - Get popular contents by view count (public)
router.get("/popular", async (req, res, next) => {
  try {
    const { limit = "10", category } = req.query;

    if (!db.getAllContents) {
      throw new AppError(500, "Content functionality not available");
    }

    const parsedLimit = parseInt(limit as string, 10);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

    const popularContents = await db.getAllContents({
      category: category as ContentCategory,
      status: "published",
      orderBy: "view_count_desc",
      limit: safeLimit,
    });

    res.json({
      success: true,
      data: popularContents,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contents/recent - Get recent contents (public)
router.get("/recent", async (req, res, next) => {
  try {
    const { limit = "10", category } = req.query;

    if (!db.getAllContents) {
      throw new AppError(500, "Content functionality not available");
    }

    const parsedLimit = parseInt(limit as string, 10);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

    const recentContents = await db.getAllContents({
      category: category as ContentCategory,
      status: "published",
      orderBy: "published_at_desc",
      limit: safeLimit,
    });

    res.json({
      success: true,
      data: recentContents,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contents/category/:category - Get contents by category (public)
router.get("/category/:category", async (req, res, next) => {
  try {
    const { category } = req.params;
    const { limit, offset } = req.query;

    const validCategories: ContentCategory[] = [
      "beauty_tips",
      "hijab_styling",
      "color_guide",
      "trend",
      "tutorial",
    ];
    if (!validCategories.includes(category as ContentCategory)) {
      throw new AppError(400, "Invalid category");
    }

    if (!db.getAllContents || !db.countContents) {
      throw new AppError(500, "Content functionality not available");
    }

    const parsedLimit =
      typeof limit === "string" ? parseInt(limit, 10) : Number.NaN;
    const parsedOffset =
      typeof offset === "string" ? parseInt(offset, 10) : Number.NaN;
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;
    const safeOffset =
      Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const filters = {
      category: category as ContentCategory,
      status: "published" as const,
    };

    const [paginatedContents, total] = await Promise.all([
      db.getAllContents({
        ...filters,
        orderBy: "published_at_desc",
        limit: safeLimit,
        offset: safeOffset,
      }),
      db.countContents(filters),
    ]);

    const endIndex = safeOffset + (safeLimit ?? paginatedContents.length);
    res.json({
      success: true,
      data: paginatedContents,
      total,
      hasMore: endIndex < total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contents/slug/:slug - Get single content by slug (public)
router.get("/slug/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!db.getContentBySlug) {
      throw new AppError(500, "Content functionality not available");
    }

    const content = await db.getContentBySlug(slug);

    if (!content || content.status !== "published") {
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

// GET /api/contents/related/:id - Get related contents (public)
router.get("/related/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const limitRaw = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;
    const parsedLimit =
      typeof limitRaw === "string" ? Number.parseInt(limitRaw, 10) : Number.NaN;
    const limitValue =
      Number.isNaN(parsedLimit) || parsedLimit <= 0
        ? 4
        : Math.min(parsedLimit, 12);

    if (!db.getContent || !db.getAllContents) {
      throw new AppError(500, "Content functionality not available");
    }

    // Get the current content
    const currentContent = await db.getContent(id);
    if (!currentContent || currentContent.status !== "published") {
      throw new AppError(404, "Content not found");
    }

    // Get all published contents
    const contents = await db.getAllContents({ status: "published" });

    const normalizedCurrentTags = Array.isArray(currentContent.tags)
      ? currentContent.tags.filter((tag): tag is string => Boolean(tag))
      : [];
    const tagsSet = new Set(normalizedCurrentTags);

    const relatedContents = contents
      .filter(
        (candidate) => candidate.id !== id && candidate.status === "published",
      )
      .map((candidate) => {
        const candidateTags = Array.isArray(candidate.tags)
          ? candidate.tags.filter((tag): tag is string => Boolean(tag))
          : [];
        const sharedTagCount = candidateTags.reduce(
          (count, tag) => (tagsSet.has(tag) ? count + 1 : count),
          0,
        );
        const sameCategory = candidate.category === currentContent.category;
        const relevanceScore = (sameCategory ? 10 : 0) + sharedTagCount;
        const recentDate = candidate.publishedAt || candidate.createdAt;

        return {
          content: candidate,
          relevanceScore,
          sameCategory,
          sharedTagCount,
          recentDate: new Date(recentDate),
        };
      })
      .filter(
        ({ sameCategory, sharedTagCount }) =>
          sameCategory || sharedTagCount > 0,
      )
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return b.recentDate.getTime() - a.recentDate.getTime();
      })
      .slice(0, limitValue)
      .map(({ content }) => content);

    res.json({
      success: true,
      data: relatedContents,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contents/:idOrSlug/view - Increment view count (public, rate limited)
router.post("/:idOrSlug/view", viewIncrementLimiter, async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    if (!db.incrementContentView) {
      throw new AppError(500, "Content functionality not available");
    }

    const ok = await db.incrementContentView(idOrSlug);
    if (!ok) {
      throw new AppError(404, "Content not found");
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/contents/:id - Get single content by ID (public)
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!db.getContent) {
      throw new AppError(500, "Content functionality not available");
    }

    const content = await db.getContent(id);

    if (!content || content.status !== "published") {
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

export const contentRouter = router;
