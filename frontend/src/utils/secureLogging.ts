/**
 * Secure logging utilities for frontend to prevent sensitive data exposure
 * CRITICAL: Always use these functions for logging user data in browser
 */

/**
 * Fields that should never be logged in browser console
 */
const SENSITIVE_FIELDS = [
  'password',
  'email',
  'token',
  'accessToken',
  'refreshToken',
  'userId',
  'instagramId',
  'sessionId',
  'recommendationId',
  'verificationToken',
  'resetToken',
  'csrfToken',
];

/**
 * Sanitize an object to remove sensitive fields for logging
 * @param data - Object to sanitize
 * @param depth - Maximum depth to traverse (prevent infinite recursion)
 */
export const sanitizeForLogging = (data: unknown, depth = 3): unknown => {
  if (depth <= 0) return '[MAX_DEPTH_REACHED]';

  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Check if string looks like sensitive data
    if (data.length > 20 && (data.includes('@') || /^[A-Za-z0-9+/=]{20,}$/.test(data))) {
      return '[SENSITIVE_STRING]';
    }
    return data;
  }

  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item, depth - 1));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeForLogging(value, depth - 1);
    }
  }

  return sanitized;
};

/**
 * Secure console.log that automatically sanitizes data
 */
export const secureLog = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    if (data) {
      console.log(message, sanitizeForLogging(data));
    } else {
      console.log(message);
    }
  }
};

/**
 * Secure console.error that automatically sanitizes data
 */
export const secureError = (message: string, error?: unknown) => {
  if (import.meta.env.DEV) {
    if (error) {
      console.error(message, sanitizeForLogging(error));
    } else {
      console.error(message);
    }
  }
};

/**
 * Secure console.warn that automatically sanitizes data
 */
export const secureWarn = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    if (data) {
      console.warn(message, sanitizeForLogging(data));
    } else {
      console.warn(message);
    }
  }
};

/**
 * Shape of an axios-like request config (subset used for logging)
 */
interface RequestConfigLike {
  method?: string;
  url?: string;
  baseURL?: string;
  data?: unknown;
  headers?: unknown;
}

/**
 * Create sanitized request log for API calls
 */
export const createSecureRequestLog = (config: RequestConfigLike) => {
  return {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL ?? ''}${config.url ?? ''}`,
    data: sanitizeForLogging(config.data),
    headers: sanitizeForLogging(config.headers),
  };
};

/**
 * Shape of an axios-like response (subset used for logging)
 */
interface ResponseLike {
  status?: number;
  config?: { url?: string };
  data?: unknown;
}

/**
 * Create sanitized response log for API calls
 */
export const createSecureResponseLog = (response: ResponseLike) => {
  return {
    status: response.status,
    url: response.config?.url,
    data: sanitizeForLogging(response.data),
  };
};

/**
 * Shape of an axios-like error (subset used for logging)
 */
interface ErrorLike {
  message?: string;
  code?: string;
  response?: { data?: unknown; status?: number };
  config?: { url?: string; baseURL?: string };
}

/**
 * Create sanitized error log for API calls
 */
export const createSecureErrorLog = (error: ErrorLike) => {
  return {
    message: error.message,
    code: error.code,
    response: sanitizeForLogging(error.response?.data),
    status: error.response?.status,
    url: error.config?.url,
    baseURL: error.config?.baseURL,
  };
};
