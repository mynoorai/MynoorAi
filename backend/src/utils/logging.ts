/**
 * Secure logging utilities to prevent sensitive data exposure
 * CRITICAL: Always use these functions for logging user data
 */

/**
 * Mask email address for logging
 * Example: john.doe@example.com -> j***@example.com
 */
export const maskEmail = (email: string): string => {
  if (!email || typeof email !== "string") return "[INVALID_EMAIL]";

  const [local, domain] = email.split("@");
  if (!local || !domain) return "[INVALID_EMAIL]";

  const maskedLocal =
    local.length > 1
      ? local[0] + "*".repeat(Math.max(local.length - 1, 3))
      : "*";

  return `${maskedLocal}@${domain}`;
};

/**
 * Mask Instagram ID for logging
 * Example: johndoe123 -> j***3
 */
export const maskInstagramId = (instagramId: string): string => {
  if (!instagramId || typeof instagramId !== "string") return "[INVALID_ID]";

  if (instagramId.length <= 2) return "*".repeat(instagramId.length);

  const first = instagramId[0];
  const last = instagramId[instagramId.length - 1];
  const masked = "*".repeat(Math.max(instagramId.length - 2, 3));

  return `${first}${masked}${last}`;
};

/**
 * Mask IP address for logging
 * Example: 192.168.1.100 -> 192.168.*.*
 */
export const maskIpAddress = (ip: string): string => {
  if (!ip || typeof ip !== "string") return "[INVALID_IP]";

  // Handle IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
  }

  // Handle IPv6 - show first 2 groups
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}::*`;
    }
  }

  return "[MASKED_IP]";
};

/**
 * Mask user agent for logging (remove version numbers and sensitive info)
 */
export const maskUserAgent = (userAgent: string): string => {
  if (!userAgent || typeof userAgent !== "string") return "[UNKNOWN_UA]";

  // Extract basic browser info without versions
  if (userAgent.includes("Chrome")) return "Chrome/***";
  if (userAgent.includes("Firefox")) return "Firefox/***";
  if (userAgent.includes("Safari")) return "Safari/***";
  if (userAgent.includes("Edge")) return "Edge/***";

  return "[BROWSER]";
};

/**
 * Mask user ID for logging (show only first few characters)
 */
export const maskUserId = (userId: string): string => {
  if (!userId || typeof userId !== "string") return "[INVALID_USER]";

  if (userId.length <= 8) return userId.substring(0, 4) + "***";

  return userId.substring(0, 8) + "***";
};

/**
 * Create secure log entry for user session creation
 */
export const createSecureSessionLog = (data: {
  instagramId: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
}): {
  instagram: string;
  ip: string | undefined;
  ua: string | undefined;
  user: string;
} => {
  return {
    instagram: maskInstagramId(data.instagramId),
    ip: data.ip ? maskIpAddress(data.ip) : undefined,
    ua: data.userAgent ? maskUserAgent(data.userAgent) : undefined,
    user: data.userId ? maskUserId(data.userId) : "anonymous",
  };
};

/**
 * Create secure log entry for auth operations
 */
export const createSecureAuthLog = (data: {
  email?: string;
  userId: string;
  action: string;
}): { user: string; email: string | undefined; action: string } => {
  return {
    user: maskUserId(data.userId),
    email: data.email ? maskEmail(data.email) : undefined,
    action: data.action,
  };
};
