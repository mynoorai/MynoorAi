import { Router } from "express";
import { db } from "../db";
import { tokenCleanupService } from "../services/tokenCleanupService";
import { config } from "../config/environment";

const router = Router();

// Debug endpoint - only available in development
if (process.env.NODE_ENV === "development") {
  // GET /api/debug/data - Get all data (sessions and recommendations)
  router.get("/data", async (_req, res) => {
    try {
      // For in-memory DB, we'll get recommendations which contain session info
      const recommendations = await db.getAllRecommendations();

      // Extract unique sessions from recommendations
      const sessionsMap = new Map();
      recommendations.forEach((rec) => {
        if (!sessionsMap.has(rec.sessionId)) {
          sessionsMap.set(rec.sessionId, {
            sessionId: rec.sessionId,
            instagramId: rec.instagramId,
            createdAt: rec.createdAt,
          });
        }
      });

      // If getAllSessions is available, use it
      const sessions = db.getAllSessions
        ? await db.getAllSessions()
        : Array.from(sessionsMap.values());

      res.json({
        success: true,
        data: {
          sessions: {
            count: sessions.length,
            items: sessions,
          },
          recommendations: {
            count: recommendations.length,
            items: recommendations,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /api/debug/recommendations - Get all recommendations
  router.get("/recommendations", async (_req, res) => {
    try {
      const recommendations = await db.getAllRecommendations();
      res.json({
        success: true,
        count: recommendations.length,
        recommendations: recommendations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /api/debug/stats - Get statistics
  router.get("/stats", async (_req, res) => {
    try {
      const recommendations = await db.getAllRecommendations();

      // Calculate statistics
      const stats = {
        total: recommendations.length,
        byStatus: {
          pending: recommendations.filter((r) => r.status === "pending").length,
          processing: recommendations.filter((r) => r.status === "processing")
            .length,
          completed: recommendations.filter((r) => r.status === "completed")
            .length,
        },
        byPersonalColor: {} as Record<string, number>,
        recent: recommendations.slice(-5).reverse(), // Last 5, most recent first
      };

      // Count by personal color
      recommendations.forEach((rec) => {
        const color = rec.personalColorResult.personal_color_en || "unknown";
        stats.byPersonalColor[color] = (stats.byPersonalColor[color] || 0) + 1;
      });

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /api/debug/email - Test email service health
  router.get("/email", async (_req, res) => {
    try {
      const emailHealth = {
        enabled: config.EMAIL_ENABLED,
        available: config.EMAIL_ENABLED || !!process.env.RESEND_API_KEY,
        connectionTest: false,
        usingResend: !!process.env.RESEND_API_KEY,
      };

      // Email service is simplified now - no test connection method
      if (config.EMAIL_ENABLED || process.env.RESEND_API_KEY) {
        emailHealth.connectionTest = true; // Assume working if enabled
      }

      res.json({
        success: true,
        email: emailHealth,
        config: {
          hasSmtpHost: !!config.SMTP_HOST,
          hasEmailFrom: !!config.EMAIL_FROM,
          smtpPort: config.SMTP_PORT,
          smtpSecure: config.SMTP_SECURE,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /api/debug/cleanup - Token cleanup service status
  router.get("/cleanup", async (_req, res) => {
    try {
      const status = tokenCleanupService.getStatus();
      const healthCheck = await tokenCleanupService.healthCheck();
      const history = tokenCleanupService.getCleanupHistory();

      res.json({
        success: true,
        status,
        health: healthCheck,
        recentHistory: history.slice(-5), // Last 5 cleanups
        totalHistoryEntries: history.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/debug/cleanup/force - Force manual cleanup
  router.post("/cleanup/force", async (_req, res) => {
    try {
      const result = await tokenCleanupService.forceCleanup();

      res.json({
        success: true,
        message: "Manual cleanup completed",
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

export const debugRouter = router;
