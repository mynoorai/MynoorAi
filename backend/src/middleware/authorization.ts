/**
 * Authorization middleware for resource ownership verification
 * CRITICAL SECURITY: Ensures users can only access their own resources
 */

import { type Request, type Response, type NextFunction } from "express";
import { AppError } from "./errorHandler";
import { db } from "../db";
import { maskUserId } from "../utils/logging";

/**
 * Middleware to verify that the authenticated user owns the session
 * MUST be used after authenticateUser middleware
 */
export const verifySessionOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!sessionId) {
      throw new AppError(400, "Session ID is required");
    }

    // Get session from database
    const session = await db.getSession(sessionId);

    if (!session) {
      throw new AppError(404, "Session not found");
    }

    // For authenticated users, verify ownership
    if (userId) {
      if (session.userId !== userId) {
        console.warn(
          `SECURITY: User ${maskUserId(userId)} attempted to access session ${sessionId} owned by ${maskUserId(session.userId || "unknown")}`,
        );
        throw new AppError(
          403,
          "Access denied: You can only access your own sessions",
        );
      }
    } else {
      // For anonymous users, allow access only if session has no userId (anonymous session)
      if (session.userId) {
        console.warn(
          `SECURITY: Anonymous user attempted to access authenticated session ${sessionId}`,
        );
        throw new AppError(
          403,
          "Access denied: Cannot access authenticated sessions anonymously",
        );
      }
    }

    // Attach session to request for use in route handler
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to verify that the authenticated user owns the recommendation
 * MUST be used after authenticateUser middleware
 */
export const verifyRecommendationOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { recommendationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(401, "Authentication required");
    }

    if (!recommendationId) {
      throw new AppError(400, "Recommendation ID is required");
    }

    // Get recommendation from database
    const recommendation = await db.getRecommendation(recommendationId);

    if (!recommendation) {
      throw new AppError(404, "Recommendation not found");
    }

    // Get the associated session to verify ownership
    const session = await db.getSession(recommendation.sessionId);

    if (!session) {
      throw new AppError(404, "Associated session not found");
    }

    // Verify ownership: user must own the session that created the recommendation
    if (session.userId !== userId) {
      console.warn(
        `SECURITY: User ${maskUserId(userId)} attempted to access recommendation ${recommendationId} owned by ${maskUserId(session.userId || "unknown")}`,
      );
      throw new AppError(
        403,
        "Access denied: You can only access your own recommendations",
      );
    }

    // Attach recommendation to request for use in route handler
    req.recommendation = recommendation;
    next();
  } catch (error) {
    next(error);
  }
};

// Extend Express Request type to include attached resources
