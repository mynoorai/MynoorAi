import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AuthTokens, User, UserRole } from "../types";
import { config } from "../config/environment";

// Use validated environment configuration
const JWT_SECRET = config.JWT_SECRET;
const JWT_REFRESH_SECRET = config.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Token generation
interface TokenPayload {
  userId: string;
  role: UserRole;
}

const buildTokenPayload = (userId: string, role: UserRole): TokenPayload => ({
  userId,
  role,
});

// Backward-compatible overloads: allow calling with (userId) only, defaulting role to 'user'
export function generateTokens(userId: string): AuthTokens;
export function generateTokens(userId: string, role: UserRole): AuthTokens;
export function generateTokens(userId: string, role?: UserRole): AuthTokens {
  const effectiveRole: UserRole = role ?? "user";
  const accessToken = jwt.sign(
    { ...buildTokenPayload(userId, effectiveRole), type: "access" },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );

  const refreshToken = jwt.sign(
    { ...buildTokenPayload(userId, effectiveRole), type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
  );

  return { accessToken, refreshToken };
}

// Token verification
export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
}

interface DecodedToken {
  userId: string;
  role?: UserRole;
  type: "access" | "refresh";
}

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }
    return { userId: decoded.userId, role: decoded.role ?? "user" };
  } catch {
    throw new Error("Invalid or expired access token");
  }
};

export const verifyRefreshToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as DecodedToken;
    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }
    return { userId: decoded.userId, role: decoded.role ?? "user" };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }
};

// Generate random tokens for email verification and password reset
export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

// Get token expiry date
export const getRefreshTokenExpiryDate = (): Date => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
  return expiryDate;
};

export const getPasswordResetExpiryDate = (): Date => {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1); // 1 hour from now
  return expiryDate;
};

export const getVerificationTokenExpiryDate = (): Date => {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24); // 24 hours from now
  return expiryDate;
};

// Sanitize user object (remove sensitive data)
export const sanitizeUser = (
  user: User,
): Omit<User, "passwordHash" | "verificationToken" | "resetPasswordToken"> => {
  const {
    passwordHash,
    verificationToken,
    resetPasswordToken,
    ...sanitizedUser
  } = user;
  return sanitizedUser;
};
