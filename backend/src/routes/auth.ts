import { Router, Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { db } from "../db";
import { AppError } from "../middleware/errorHandler";
import { authenticateUser } from "../middleware/auth";
import {
  loginLimiter,
  signupLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimiter";
import { csrfProtection } from "../middleware/csrf";
import {
  signupValidation,
  loginValidation,
  accountLookupValidation,
  passwordResetValidation,
  resetPasswordValidation,
  emailVerificationValidation,
  handleValidationErrors,
} from "../middleware/validation";
import {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyRefreshToken,
  generateRandomToken,
  getRefreshTokenExpiryDate,
  getPasswordResetExpiryDate,
  getVerificationTokenExpiryDate,
  sanitizeUser,
} from "../utils/auth";
import { maskEmail, maskUserId } from "../utils/logging";
import { emailService } from "../services/emailService";
import { config } from "../config/environment";
import { ensureSeedAdmin } from "../services/adminBootstrap";
import type { PersonalColorResult } from "../types";
import { logAdminAction } from "../services/adminAuditService";
import { ADMIN_ROLES } from "../config/roles";

const router = Router();

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
} as const;

// POST /api/auth/signup - User registration
router.post(
  "/signup",
  signupLimiter,
  csrfProtection,
  signupValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, fullName } = req.body;
      console.info(`[SIGNUP] Request received - email: ${maskEmail(email)}`);

      // Check if user already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        throw new AppError(409, "User with this email already exists");
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      const requireEmailVerification = config.REQUIRE_EMAIL_VERIFICATION;
      let verificationToken: string | undefined;
      let verificationTokenExpires: Date | undefined;
      if (requireEmailVerification) {
        verificationToken = generateRandomToken();
        verificationTokenExpires = getVerificationTokenExpiryDate();
      }

      // Create user
      const user = await db.createUser({
        email,
        passwordHash,
        fullName,
        emailVerified: !requireEmailVerification,
        verificationToken,
        verificationTokenExpires,
        role: "user",
      });
      console.info(`[SIGNUP] User created - id: ${maskUserId(user.id)}`);

      if (requireEmailVerification) {
        // Send verification email and return without issuing tokens
        try {
          await emailService.sendVerificationEmail({
            userEmail: user.email,
            userName: user.fullName,
            verificationToken: verificationToken!,
          });
          console.info(
            `[SIGNUP] Verification email sent - user: ${maskUserId(user.id)}`,
          );
        } catch (emailError) {
          console.error(
            `[SIGNUP] Verification email send failed - user: ${maskUserId(user.id)}`,
            emailError instanceof Error ? emailError.message : emailError,
          );
        }

        const response = {
          success: true,
          message:
            "User registered successfully. Please check your email to verify your account.",
          data: {
            user: sanitizeUser(user),
          },
        };
        res.status(201).json(response);
      } else {
        // Issue tokens immediately and set cookies
        const tokens = generateTokens(user.id, user.role);
        await db.createRefreshToken({
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: getRefreshTokenExpiryDate(),
        });
        res.cookie("accessToken", tokens.accessToken, {
          ...cookieOptions,
          maxAge: 15 * 60 * 1000,
        });
        res.cookie("refreshToken", tokens.refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        const response = {
          success: true,
          message: "User registered successfully.",
          data: {
            user: sanitizeUser(user),
          },
        };
        res.status(201).json(response);
      }
    } catch (error) {
      console.error(
        `[SIGNUP] Signup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      next(error);
    }
  },
);

// POST /api/auth/login - User login
router.post(
  "/login",
  loginLimiter,
  csrfProtection,
  loginValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await db.getUserByEmail(email);
      if (!user) {
        throw new AppError(401, "Invalid credentials");
      }

      // Check password
      const isValidPassword = await comparePassword(
        password,
        user.passwordHash,
      );
      if (!isValidPassword) {
        throw new AppError(401, "Invalid credentials");
      }

      // Enforce email verification for non-admin users (only when enabled)
      if (config.REQUIRE_EMAIL_VERIFICATION) {
        if (!ADMIN_ROLES.includes(user.role) && !user.emailVerified) {
          throw new AppError(
            403,
            "Email not verified. Please check your inbox to verify your account.",
          );
        }
      }

      await db.updateUser(user.id, { lastLoginAt: new Date() });

      // Invalidate all existing refresh tokens for this user (token rotation)
      await db.deleteUserRefreshTokens(user.id);

      // Generate new tokens
      const tokens = generateTokens(user.id, user.role);

      // Create refresh token in database
      await db.createRefreshToken({
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: getRefreshTokenExpiryDate(),
      });

      // Set cookies
      res.cookie("accessToken", tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.info(`User logged in successfully - ID: ${maskUserId(user.id)}`);

      if (ADMIN_ROLES.includes(user.role)) {
        void logAdminAction(
          "admin_login",
          {
            ip: req.ip,
            userAgent: req.get("user-agent") || "unknown",
          },
          {
            userId: user.id,
            email: user.email,
            role: user.role,
          },
        );
      }

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: sanitizeUser(user),
        },
      });
    } catch (error) {
      console.error("Login failed");
      next(error);
    }
  },
);

// POST /api/auth/refresh - Refresh access token
router.post("/refresh", csrfProtection, async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError(401, "No refresh token provided");
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const dbToken = await db.getRefreshToken(refreshToken);
    if (!dbToken || dbToken.userId !== decoded.userId) {
      throw new AppError(401, "Invalid refresh token");
    }

    // Get user
    const user = await db.getUserById(decoded.userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    // Generate new tokens
    const tokens = generateTokens(user.id, user.role);

    // Delete old refresh token
    await db.deleteRefreshToken(refreshToken);

    // Create new refresh token
    await db.createRefreshToken({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: getRefreshTokenExpiryDate(),
    });

    // Set new cookies
    res.cookie("accessToken", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Token refresh failed");
    next(error);
  }
});

// POST /api/auth/logout - User logout
router.post(
  "/logout",
  csrfProtection,
  authenticateUser,
  async (req, res, next) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        // Delete specific refresh token
        await db.deleteRefreshToken(refreshToken);
      }

      // Delete all user's refresh tokens
      await db.deleteUserRefreshTokens(req.user!.userId);

      // Clear cookies
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      if (req.user && ADMIN_ROLES.includes(req.user.role)) {
        const adminUser = await db.getUserById(req.user.userId);
        if (adminUser) {
          void logAdminAction(
            "admin_logout",
            {
              ip: req.ip,
              userAgent: req.get("user-agent") || "unknown",
            },
            {
              userId: adminUser.id,
              email: adminUser.email,
              role: adminUser.role,
            },
          );
        }
      }

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout failed");
      next(error);
    }
  },
);

// GET /api/auth/me - Get current user
router.get("/me", authenticateUser, async (req, res, next) => {
  try {
    const user = await db.getUserById(req.user!.userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error("Get user failed:", error);
    next(error);
  }
});

// POST /api/auth/verify-email - Verify email address
router.post(
  "/verify-email",
  csrfProtection,
  emailVerificationValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      // Find user by verification token
      const user = await db.getUserByVerificationToken(token);

      if (!user) {
        throw new AppError(400, "Invalid or expired verification token");
      }

      // Verify the user's email
      const success = await db.verifyUserEmail(user.id);

      if (!success) {
        throw new AppError(500, "Failed to verify email");
      }

      console.info(
        `Email verified successfully - User: ${maskUserId(user.id)}`,
      );

      res.json({
        success: true,
        message: "Email verified successfully. You can now log in.",
      });
    } catch (error) {
      console.error("Email verification failed:", error);
      next(error);
    }
  },
);

// POST /api/auth/admin-login - Admin login via environment credentials
router.post(
  "/admin-login",
  loginLimiter,
  csrfProtection,
  loginValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const seedEmail = process.env.ADMIN_SEED_EMAIL;
      const seedPassword = process.env.ADMIN_SEED_PASSWORD;

      if (!seedEmail || !seedPassword) {
        throw new AppError(503, "Admin login not configured");
      }

      const normalizeForCompare = (e: string): string => {
        const lower = e.trim().toLowerCase();
        const atIdx = lower.lastIndexOf("@");
        if (atIdx < 0) return lower;
        const local = lower.slice(0, atIdx);
        const domain = lower.slice(atIdx + 1);
        if (domain === "gmail.com" || domain === "googlemail.com") {
          return `${local.replace(/\./g, "")}@${domain}`;
        }
        return lower;
      };

      const matchesEmail =
        normalizeForCompare(email) === normalizeForCompare(seedEmail);

      // Timing-safe password comparison to prevent timing attacks
      const passwordBuf = Buffer.from(String(password));
      const seedPasswordBuf = Buffer.from(seedPassword);
      const matchesPassword =
        passwordBuf.length === seedPasswordBuf.length &&
        timingSafeEqual(passwordBuf, seedPasswordBuf);

      if (!matchesEmail || !matchesPassword) {
        throw new AppError(401, "Invalid admin credentials");
      }

      // Ensure seed admin exists and is synchronized
      await ensureSeedAdmin();

      // Fetch admin user from DB
      const adminUser = await db.getUserByEmail(seedEmail);
      if (!adminUser || !ADMIN_ROLES.includes(adminUser.role)) {
        throw new AppError(500, "Admin account not available");
      }

      // Token rotation: invalidate existing refresh tokens
      await db.deleteUserRefreshTokens(adminUser.id);

      // Generate new tokens
      const tokens = generateTokens(adminUser.id, adminUser.role);

      // Create refresh token record
      await db.createRefreshToken({
        userId: adminUser.id,
        token: tokens.refreshToken,
        expiresAt: getRefreshTokenExpiryDate(),
      });

      // Set cookies
      res.cookie("accessToken", tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie("refreshToken", tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Audit
      void logAdminAction(
        "admin_login",
        { ip: req.ip, userAgent: req.get("user-agent") || "unknown" },
        { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
      );

      res.json({
        success: true,
        message: "Admin login successful",
        data: {
          user: sanitizeUser(adminUser),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/auth/forgot-password - Request password reset
router.post(
  "/forgot-password",
  passwordResetLimiter,
  csrfProtection,
  passwordResetValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await db.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        res.json({
          success: true,
          message:
            "If an account exists with this email, you will receive a password reset link",
        });
        return;
      }

      // Generate reset token
      const resetToken = generateRandomToken();

      // Update user with reset token
      await db.updateUser(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: getPasswordResetExpiryDate(),
      });

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail({
          userEmail: user.email,
          userName: user.fullName,
          resetToken,
        });
        console.info(
          `Password reset email sent to user: ${maskUserId(user.id)}`,
        );
      } catch (emailError) {
        console.error(
          `Failed to send password reset email to user: ${maskUserId(user.id)}`,
          emailError,
        );
        // Don't fail the request if email fails - user can retry
      }

      console.info(`Password reset requested - User: ${maskUserId(user.id)}`);

      res.json({
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link",
      });
    } catch (error) {
      console.error("Password reset request failed:", error);
      next(error);
    }
  },
);

// PUT /api/auth/personal-color - Save user's personal color diagnosis (no-op storage for now)
// 목적: 프론트엔드에서 진단 결과 저장 호출 시 404가 발생하지 않도록 안전하게 수용
// 보안: 인증 필수, 현재는 사용자 레코드의 updatedAt만 갱신하여 응답에 최신 사용자 정보를 반환
router.put(
  "/personal-color",
  authenticateUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError(401, "Authentication required");

      const user = await db.getUserById(userId);
      if (!user) throw new AppError(404, "User not found");

      const { season, seasonEn, confidence } = req.body as {
        season?: string;
        seasonEn?: string;
        confidence?: number;
      };

      // Map free-form season to canonical enums
      const seasonKey = ((): "spring" | "summer" | "autumn" | "winter" => {
        const s = (seasonEn || season || "").toString().toLowerCase();
        if (s.includes("spring")) return "spring";
        if (s.includes("summer")) return "summer";
        if (s.includes("autumn")) return "autumn";
        if (s.includes("winter")) return "winter";
        return "spring";
      })();
      const toneKey: "warm" | "cool" =
        seasonKey === "spring" || seasonKey === "autumn" ? "warm" : "cool";

      // Build minimal PersonalColorResult object
      const personalColorResult: PersonalColorResult = {
        personal_color: season || seasonKey,
        personal_color_en: seasonKey,
        personal_color_ko: undefined,
        tone: toneKey,
        tone_en: toneKey,
        details: {
          is_warm: toneKey === "warm" ? 1 : 0,
          skin_lab_b: 0,
          eyebrow_lab_b: 0,
          eye_lab_b: 0,
          skin_hsv_s: 0,
          eyebrow_hsv_s: 0,
          eye_hsv_s: 0,
        },
        facial_colors: {
          cheek: { rgb: [0, 0, 0], lab: [0, 0, 0], hsv: [0, 0, 0] },
          eyebrow: { rgb: [0, 0, 0], lab: [0, 0, 0], hsv: [0, 0, 0] },
          eye: { rgb: [0, 0, 0], lab: [0, 0, 0], hsv: [0, 0, 0] },
        },
        confidence: typeof confidence === "number" ? confidence : 0,
      };

      const updated = await db.updateUser(user.id, {
        hasPersonalColorDiagnosis: true,
        personalColorResult,
        diagnosedAt: new Date(),
      });

      res.json({
        success: true,
        data: { user: sanitizeUser(updated || user) },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/auth/find-account - Send account reminder email
router.post(
  "/find-account",
  passwordResetLimiter,
  csrfProtection,
  accountLookupValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await db.getUserByEmail(email);

      if (user) {
        try {
          await emailService.sendAccountReminderEmail({
            userEmail: user.email,
            userName: user.fullName,
          });
          console.info(
            `Account reminder email sent to user: ${maskUserId(user.id)}`,
          );
        } catch (emailError) {
          console.error(
            `Failed to send account reminder email to user: ${maskUserId(user.id)}`,
            emailError,
          );
        }
      }

      res.json({
        success: true,
        message:
          "If an account exists with this email, we just sent you a reminder.",
      });
    } catch (error) {
      console.error("Account reminder request failed:", error);
      next(error);
    }
  },
);

// POST /api/auth/reset-password - Reset password
router.post(
  "/reset-password",
  csrfProtection,
  resetPasswordValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;

      // Find user by reset token
      const user = await db.getUserByResetToken(token);

      if (!user) {
        throw new AppError(400, "Invalid or expired reset token");
      }

      // Hash the new password
      const newPasswordHash = await hashPassword(newPassword);

      // Reset the password
      const success = await db.resetUserPassword(user.id, newPasswordHash);

      if (!success) {
        throw new AppError(500, "Failed to reset password");
      }

      // Invalidate all existing refresh tokens for security
      await db.deleteUserRefreshTokens(user.id);

      console.info(
        `Password reset successfully - User: ${maskUserId(user.id)}`,
      );

      res.json({
        success: true,
        message:
          "Password reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Password reset failed:", error);
      next(error);
    }
  },
);

export const authRouter = router;
