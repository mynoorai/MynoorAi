/**
 * Instagram-safe persistence adapter for Zustand
 * Handles localStorage limitations in Instagram iOS browser
 */

import type { StateStorage } from 'zustand/middleware';
import { detectInAppBrowser, inAppStorage } from '@/utils/inAppBrowserDetection';
import { devLog } from '@/utils/devLog';

/**
 * Create a storage adapter that falls back gracefully for Instagram browser
 */
export const createInstagramSafeStorage = (): StateStorage => {
  const browserInfo = detectInAppBrowser();
  const isInstagramIOS = browserInfo.browserName === 'instagram' && browserInfo.platform === 'ios';
  
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        // Try localStorage first (for regular browsers)
        if (!isInstagramIOS) {
          const value = localStorage.getItem(name);
          if (value !== null) return value;
        }
        
        // Try sessionStorage (more reliable in Instagram)
        const sessionValue = sessionStorage.getItem(name);
        if (sessionValue !== null) {
          devLog.log('📦 [Storage] Retrieved from sessionStorage:', name);
          return sessionValue;
        }
        
        // Fall back to in-app storage (memory/session hybrid)
        const inAppValue = await inAppStorage.getItem(name);
        if (inAppValue !== null) {
          devLog.log('📦 [Storage] Retrieved from in-app fallback:', name);
        }
        return inAppValue;
      } catch (error) {
        console.warn('⚠️ [Storage] Failed to get item:', name, error);
        // Last resort: check memory storage
        return await inAppStorage.getItem(name);
      }
    },
    
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        // Always try sessionStorage first for Instagram
        if (isInstagramIOS) {
          try {
            sessionStorage.setItem(name, value);
            devLog.log('💾 [Storage] Saved to sessionStorage (Instagram):', name);
            // Also save to in-app storage as backup
            await inAppStorage.setItem(name, value);
          } catch (e) {
            console.warn('⚠️ [Storage] SessionStorage failed, using fallback:', e);
            await inAppStorage.setItem(name, value);
          }
        } else {
          // Regular browsers: use localStorage
          localStorage.setItem(name, value);
          // Also save to sessionStorage for consistency
          try {
            sessionStorage.setItem(name, value);
          } catch { /* noop */ }
        }
      } catch (error) {
        console.warn('⚠️ [Storage] Failed to set item:', name, error);
        // Fallback to in-app storage
        await inAppStorage.setItem(name, value);
      }
    },
    
    removeItem: async (name: string): Promise<void> => {
      try {
        // Remove from all storages
        try { localStorage.removeItem(name); } catch { /* noop */ }
        try { sessionStorage.removeItem(name); } catch { /* noop */ }
        await inAppStorage.removeItem(name);
        devLog.log('🗑️ [Storage] Removed item:', name);
      } catch (error) {
        console.warn('⚠️ [Storage] Failed to remove item:', name, error);
      }
    },
  };
};

/**
 * Session recovery helpers for Instagram browser
 */
export const sessionRecoveryHelpers = {
  /**
   * Save session to URL hash for recovery
   */
  saveToUrlHash: (sessionId: string): void => {
    if (sessionId) {
      const hash = `#session=${sessionId}`;
      if (window.location.hash !== hash) {
        window.history.replaceState(null, '', hash);
        devLog.log('🔗 [Session] Saved to URL hash:', sessionId);
      }
    }
  },
  
  /**
   * Recover session from URL hash
   */
  recoverFromUrlHash: (): string | null => {
    const hash = window.location.hash;
    const match = hash.match(/#session=([^&]+)/);
    if (match && match[1]) {
      devLog.log('🔗 [Session] Recovered from URL hash:', match[1]);
      return match[1];
    }
    return null;
  },
  
  /**
   * Save session to all available storages for redundancy
   */
  saveSessionEverywhere: async (sessionId: string): Promise<void> => {
    const key = 'pca-hijab-session-backup';
    
    // Save to all storage types
    try {
      localStorage.setItem(key, sessionId);
    } catch { /* noop */ }
    
    try {
      sessionStorage.setItem(key, sessionId);
    } catch { /* noop */ }
    
    await inAppStorage.setItem(key, sessionId);
    
    // Also save to URL hash
    sessionRecoveryHelpers.saveToUrlHash(sessionId);
    
    devLog.log('💾 [Session] Backed up everywhere:', sessionId);
  },
  
  /**
   * Try to recover session from any available source
   */
  recoverSessionFromAnywhere: async (): Promise<string | null> => {
    const key = 'pca-hijab-session-backup';
    
    // Try URL hash first (most reliable)
    const urlSession = sessionRecoveryHelpers.recoverFromUrlHash();
    if (urlSession) return urlSession;
    
    // Try sessionStorage
    try {
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) {
        devLog.log('🔍 [Session] Recovered from sessionStorage:', sessionValue);
        return sessionValue;
      }
    } catch { /* noop */ }
    
    // Try localStorage
    try {
      const localValue = localStorage.getItem(key);
      if (localValue) {
        devLog.log('🔍 [Session] Recovered from localStorage:', localValue);
        return localValue;
      }
    } catch { /* noop */ }
    
    // Try in-app storage
    const inAppValue = await inAppStorage.getItem(key);
    if (inAppValue) {
      devLog.log('🔍 [Session] Recovered from in-app storage:', inAppValue);
      return inAppValue;
    }
    
    return null;
  },
};
