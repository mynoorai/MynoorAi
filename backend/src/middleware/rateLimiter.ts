import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import type { RateLimitInfo } from "../types";

// Create different rate limiters for different endpoints
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message:
    "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all attempts (prevents brute-force bypass when attacker knows valid credential)
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: "Too many login attempts. Please try again later.",
      retryAfter: (req.rateLimit as RateLimitInfo | undefined)?.resetTime,
    });
  },
});

export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow more attempts within a shorter window
  message: "Too many accounts created from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts to throttle account-creation spam
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: "Too many signup attempts. Please try again later.",
      retryAfter: (req.rateLimit as RateLimitInfo | undefined)?.resetTime,
    });
  },
});

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: "Too many password reset attempts from this IP",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});
