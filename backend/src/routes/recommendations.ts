import { Router } from "express";
import { db } from "../db";
import { validateRecommendationData } from "../middleware/validation";
import { AppError } from "../middleware/errorHandler";
import { authenticateUser } from "../middleware/auth";
import { verifyRecommendationOwnership } from "../middleware/authorization";
import { maskUserId } from "../utils/logging";

const router = Router();

// POST /api/recommendations - Create a new recommendation request (SECURED)
router.post(
  "/",
  authenticateUser,
  validateRecommendationData,
  async (req, res, next) => {
    try {
      const { sessionId, personalColorResult, userPreferences } = req.body;
      const userId = req.user!.userId;

      // Verify session exists and user owns it
      const session = await db.getSession(sessionId);
      if (!session) {
        throw new AppError(400, "Invalid session ID");
      }

      // Security check: verify session ownership
      if (session.userId !== userId) {
        console.warn(
          `SECURITY: User ${maskUserId(userId)} attempted to create recommendation for session ${sessionId} owned by ${maskUserId(session.userId || "unknown")}`,
        );
        throw new AppError(
          403,
          "Access denied: You can only create recommendations for your own sessions",
        );
      }

      console.info(
        `Recommendation creation attempt - SessionID: ${sessionId}, User: ${maskUserId(userId)}`,
      );

      // Create recommendation
      const recommendation = await db.createRecommendation({
        sessionId,
        instagramId: "anonymous",
        personalColorResult,
        userPreferences,
        productIds: [],
        status: "pending",
      });

      console.info(
        `Recommendation created successfully - ID: ${recommendation.id}, User: ${maskUserId(userId)}`,
      );

      // Response shape aligned with the rest of the admin/data APIs:
      // every payload is wrapped under `data` so frontend code can rely on a
      // single envelope (`{success, message, data: {...}}`).
      res.status(201).json({
        success: true,
        message: "Recommendation request submitted successfully",
        data: {
          recommendationId: recommendation.id,
          id: recommendation.id,
          status: recommendation.status,
          createdAt: recommendation.createdAt,
        },
      });
    } catch (error) {
      console.error(
        `Recommendation creation failed - User: ${maskUserId(req.user?.userId || "unknown")}`,
        error,
      );
      next(error);
    }
  },
);

// GET /api/recommendations/:recommendationId - Get recommendation status (SECURED)
router.get(
  "/:recommendationId",
  authenticateUser,
  verifyRecommendationOwnership,
  async (req, res, next) => {
    try {
      // Recommendation is already verified and attached by middleware
      const recommendation = req.recommendation;
      if (!recommendation) {
        throw new AppError(500, "Recommendation context missing");
      }

      console.info(
        `Recommendation accessed - ID: ${recommendation.id}, User: ${maskUserId(req.user!.userId)}`,
      );

      res.json({
        success: true,
        data: {
          id: recommendation.id,
          status: recommendation.status,
          productIds: recommendation.productIds,
          completedAt: recommendation.completedAt,
          createdAt: recommendation.createdAt,
          updatedAt: recommendation.updatedAt,
        },
      });
    } catch (error) {
      console.error(
        `Recommendation access failed - RecommendationID: ${req.params.recommendationId}, User: ${maskUserId(req.user?.userId || "unknown")}`,
        error,
      );
      next(error);
    }
  },
);

export const recommendationRouter = router;
