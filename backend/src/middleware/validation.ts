import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { AppError } from "./errorHandler";

const INSTAGRAM_ID_REGEX = /^[a-zA-Z0-9_.]{1,30}$/;

export const validateInstagramId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { instagramId } = req.body;

  if (!instagramId || typeof instagramId !== "string") {
    return next(new AppError(400, "Instagram ID is required"));
  }

  if (!INSTAGRAM_ID_REGEX.test(instagramId)) {
    return next(new AppError(400, "Invalid Instagram ID format"));
  }

  next();
};

export const validateOptionalInstagramId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { instagramId } = req.body;

  if (instagramId === undefined || instagramId === null || instagramId === "") {
    return next();
  }

  if (typeof instagramId !== "string") {
    return next(new AppError(400, "Instagram ID must be a string"));
  }

  if (!INSTAGRAM_ID_REGEX.test(instagramId)) {
    return next(new AppError(400, "Invalid Instagram ID format"));
  }

  next();
};

export const validateRecommendationData = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { sessionId, personalColorResult, userPreferences } = req.body;

  if (!sessionId || !personalColorResult || !userPreferences) {
    return next(new AppError(400, "Missing required fields"));
  }

  // Validate personal color result structure
  // Accept both old format (season/tone) and new format (personal_color_en/tone_en)
  const hasOldFormat = personalColorResult.season && personalColorResult.tone;
  const hasNewFormat =
    personalColorResult.personal_color_en &&
    (personalColorResult.tone_en || personalColorResult.tone);

  if (!hasOldFormat && !hasNewFormat) {
    return next(
      new AppError(
        400,
        "Invalid personal color result data - missing season/tone information",
      ),
    );
  }

  // Validate user preferences structure - no specific validation needed
  // as the structure is flexible based on form inputs

  next();
};

// Auth validation rules using express-validator
export const signupValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Please provide a valid email address"),

  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8-128 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  body("fullName")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Full name must be 1-100 characters long")
    .matches(/^[\p{L}\p{N}\s.-]+$/u)
    .withMessage(
      "Full name can only contain letters, numbers, spaces, dots, and hyphens",
    ),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Please provide a valid email address"),

  body("password")
    .isLength({ min: 1, max: 128 })
    .withMessage("Password is required"),
];

export const passwordResetValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Please provide a valid email address"),
];

export const accountLookupValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Please provide a valid email address"),
];

export const resetPasswordValidation = [
  body("token").isLength({ min: 1 }).withMessage("Reset token is required"),

  body("newPassword")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8-128 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
];

export const emailVerificationValidation = [
  body("token")
    .isLength({ min: 1 })
    .withMessage("Verification token is required"),
];

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new AppError(400, errorMessages.join(". ")));
  }
  next();
};
