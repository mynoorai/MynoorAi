/**
 * Utility to handle image URLs
 * Converts relative paths to absolute URLs using the API base URL
 */

// Raw API base URL (may include /api depending on env)
const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://pca-hijab-backend-q07l.onrender.com'
    : 'http://localhost:5001');

// Normalize: drop trailing slash
const API_BASE = RAW_API_BASE.endsWith('/') ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE;

// For static uploads served at /uploads (not under /api), strip trailing /api if present
const ORIGIN_BASE = API_BASE.replace(/\/api\/?$/, '');

/**
 * Get the absolute URL for an image
 * @param url - The image URL (can be relative or absolute)
 * @returns The absolute image URL
 */
export function getImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // If already an absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a data URL, return as is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // For relative URLs, prepend the API base URL
  // Remove leading slash if exists to avoid double slashes
  const cleanPath = url.startsWith('/') ? url : `/${url}`;

  // Uploads are served at /uploads from origin (not /api/uploads)
  const isUploadPath = cleanPath.startsWith('/uploads/');
  const base = isUploadPath ? ORIGIN_BASE : API_BASE;

  return `${base}${cleanPath}`;
}

/**
 * Get multiple image URLs
 * @param urls - Array of image URLs
 * @returns Array of absolute image URLs
 */
export function getImageUrls(urls: string[] | undefined | null): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map(url => getImageUrl(url));
}
