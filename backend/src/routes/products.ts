import { Router } from "express";
import { db } from "../db";
import { AppError } from "../middleware/errorHandler";
import type { Product, ProductCategory, PersonalColorType } from "../types";

const router = Router();

// GET /api/products - Get all active products (public)
router.get("/", async (req, res, next) => {
  try {
    const { category, personalColor } = req.query;

    const categoryParam =
      typeof category === "string" ? (category as ProductCategory) : undefined;
    const personalColorParam =
      typeof personalColor === "string"
        ? (personalColor as PersonalColorType)
        : undefined;

    let products: Product[];

    if (categoryParam && personalColorParam) {
      if (!db.getProductsByCategoryAndPersonalColor) {
        throw new AppError(500, "Product functionality not available");
      }
      products = await db.getProductsByCategoryAndPersonalColor(
        categoryParam,
        personalColorParam,
      );
    } else if (categoryParam) {
      if (!db.getProductsByCategory) {
        throw new AppError(500, "Product functionality not available");
      }
      products = await db.getProductsByCategory(categoryParam);
    } else if (personalColorParam) {
      if (!db.getProductsByPersonalColor) {
        throw new AppError(500, "Product functionality not available");
      }
      products = await db.getProductsByPersonalColor(personalColorParam);
    } else {
      if (!db.getAllProducts) {
        throw new AppError(500, "Product functionality not available");
      }
      products = await db.getAllProducts();
    }

    // Only expose active products on the public route
    const activeProducts = products.filter((p) => p.isActive);

    res.json({
      success: true,
      data: activeProducts,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/random - Get random products by personal color (public)
router.get("/random", async (req, res, next) => {
  try {
    const { personalColor, limit = "3" } = req.query;

    if (!personalColor || typeof personalColor !== "string") {
      throw new AppError(400, "personalColor is required");
    }

    const validPersonalColors: PersonalColorType[] = [
      "spring_warm",
      "autumn_warm",
      "summer_cool",
      "winter_cool",
    ];
    if (!validPersonalColors.includes(personalColor as PersonalColorType)) {
      throw new AppError(400, "Invalid personal color");
    }

    if (!db.getProductsByPersonalColor) {
      throw new AppError(500, "Product functionality not available");
    }

    // Get products for this personal color
    const products = await db.getProductsByPersonalColor(
      personalColor as PersonalColorType,
    );
    const activeProducts = products.filter((p) => p.isActive);

    if (activeProducts.length === 0) {
      throw new AppError(404, "Product not found");
    }

    // Shuffle and limit
    const shuffled = activeProducts.sort(() => Math.random() - 0.5);
    const limitNum = parseInt(limit as string, 10);
    const result = shuffled.slice(0, limitNum);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get single product (public)
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!db.getProduct) {
      throw new AppError(500, "Product functionality not available");
    }

    const product = await db.getProduct(id);

    if (!product || !product.isActive) {
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

// POST /api/products/batch - Get multiple products by IDs (public)
router.post("/batch", async (req, res, next) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new AppError(400, "productIds must be a non-empty array");
    }

    if (productIds.some((id) => typeof id !== "string")) {
      throw new AppError(400, "productIds must be an array of strings");
    }

    if (!db.getProductsByIds) {
      throw new AppError(500, "Product functionality not available");
    }

    const products = await db.getProductsByIds(productIds);
    const activeProducts = products.filter((p) => p.isActive);

    res.json({
      success: true,
      data: activeProducts,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/category/:category - Get products by category (public)
router.get("/category/:category", async (req, res, next) => {
  try {
    const { category } = req.params;

    const validCategories: ProductCategory[] = [
      "hijab",
      "lens",
      "lip",
      "blush",
    ];
    if (!validCategories.includes(category as ProductCategory)) {
      throw new AppError(400, "Invalid category");
    }

    if (!db.getProductsByCategory) {
      throw new AppError(500, "Product functionality not available");
    }

    const products = await db.getProductsByCategory(
      category as ProductCategory,
    );
    const activeProducts = products.filter((p) => p.isActive);

    res.json({
      success: true,
      data: activeProducts,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/personal-color/:personalColor - Get products by personal color (public)
router.get("/personal-color/:personalColor", async (req, res, next) => {
  try {
    const { personalColor } = req.params;

    const validPersonalColors: PersonalColorType[] = [
      "spring_warm",
      "autumn_warm",
      "summer_cool",
      "winter_cool",
    ];
    if (!validPersonalColors.includes(personalColor as PersonalColorType)) {
      throw new AppError(400, "Invalid personal color");
    }

    if (!db.getProductsByPersonalColor) {
      throw new AppError(500, "Product functionality not available");
    }

    const products = await db.getProductsByPersonalColor(
      personalColor as PersonalColorType,
    );
    const activeProducts = products.filter((p) => p.isActive);

    res.json({
      success: true,
      data: activeProducts,
    });
  } catch (error) {
    next(error);
  }
});

export const productRouter = router;
