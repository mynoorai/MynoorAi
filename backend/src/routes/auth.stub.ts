import { Router, Request, Response } from "express";
import { csrfProtection } from "../middleware/csrf";
import {
  signupLimiter,
  loginLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimiter";
// Validation removed since we're using stubs
import { authenticateUser } from "../middleware/auth";
import { generateTokens } from "../utils/auth";

const router = Router();

// Stub user data
const STUB_USER = {
  id: "stub-user-001",
  email: "user@example.com",
  name: "Test User",
  emailVerified: true,
  role: "user" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (STUBBED)
 * @access  Public
 */
router.post(
  "/signup",
  signupLimiter,
  csrfProtection,
  async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;

      // Generate tokens for stubbed user
      const { accessToken, refreshToken } = generateTokens(
        STUB_USER.id,
        STUB_USER.role,
      );

      // Set refresh token cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: "Registration successful (STUB MODE)",
        data: {
          user: {
            id: STUB_USER.id,
            email: email || STUB_USER.email,
            name: name || STUB_USER.name,
            emailVerified: true,
            role: STUB_USER.role,
          },
          accessToken,
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({
        success: false,
        message: "Registration failed",
      });
    }
  },
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (STUBBED)
 * @access  Public
 */
router.post(
  "/login",
  loginLimiter,
  csrfProtection,
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // Generate tokens for stubbed user
      const { accessToken, refreshToken } = generateTokens(
        STUB_USER.id,
        STUB_USER.role,
      );

      // Set refresh token cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: "Login successful (STUB MODE)",
        data: {
          user: {
            id: STUB_USER.id,
            email: email || STUB_USER.email,
            name: STUB_USER.name,
            emailVerified: true,
            role: STUB_USER.role,
          },
          accessToken,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  },
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (STUBBED)
 * @access  Private
 */
router.post(
  "/logout",
  authenticateUser,
  csrfProtection,
  async (req: Request, res: Response) => {
    try {
      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Logged out successfully (STUB MODE)",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
  },
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token (STUBBED)
 * @access  Public
 */
router.post("/refresh", csrfProtection, async (req: Request, res: Response) => {
  try {
    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(
      STUB_USER.id,
      STUB_USER.role,
    );

    // Set new refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      success: false,
      message: "Token refresh failed",
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user (STUBBED)
 * @access  Private
 */
router.get("/me", authenticateUser, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        user: STUB_USER,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user data",
    });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address (STUBBED)
 * @access  Public
 */
router.post(
  "/verify-email",
  csrfProtection,
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Email verified successfully (STUB MODE)",
    });
  },
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (STUBBED)
 * @access  Public
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  csrfProtection,
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Password reset email sent (STUB MODE - no actual email sent)",
    });
  },
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password (STUBBED)
 * @access  Public
 */
router.post(
  "/reset-password",
  csrfProtection,
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Password reset successfully (STUB MODE)",
    });
  },
);

export default router;
