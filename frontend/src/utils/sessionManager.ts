/**
 * Session Manager - Handles session lifecycle and prevents duplicate sessions
 */

import { SessionAPI } from '@/services/api/session';
import { secureLog, secureWarn } from './secureLogging';

const SESSION_KEY = 'pca_session_id';
const SESSION_TIMESTAMP_KEY = 'pca_session_timestamp';
const SESSION_VALIDITY_HOURS = 24; // Sessions valid for 24 hours

interface SessionInfo {
  sessionId: string;
  timestamp: number;
  instagramId?: string;
}

class SessionManager {
  private isCreatingSession = false;
  private sessionCreationPromise: Promise<string> | null = null;

  /**
   * Get current session info from localStorage
   */
  private getStoredSession(): SessionInfo | null {
    try {
      const sessionId = localStorage.getItem(SESSION_KEY);
      const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);

      if (!sessionId || !timestamp) {
        return null;
      }

      const sessionAge = Date.now() - parseInt(timestamp, 10);
      const maxAge = SESSION_VALIDITY_HOURS * 60 * 60 * 1000;

      // Check if session is too old
      if (sessionAge > maxAge) {
        this.clearStoredSession();
        return null;
      }

      return {
        sessionId,
        timestamp: parseInt(timestamp, 10),
      };
    } catch (error) {
      secureWarn('Failed to get stored session:', error);
      return null;
    }
  }

  /**
   * Store session info in localStorage
   */
  private storeSession(sessionId: string, instagramId?: string): void {
    try {
      localStorage.setItem(SESSION_KEY, sessionId);
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());

      if (instagramId) {
        localStorage.setItem('pca_instagram_id', instagramId);
      }
    } catch (error) {
      secureWarn('Failed to store session:', error);
    }
  }

  /**
   * Clear stored session
   */
  private clearStoredSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_TIMESTAMP_KEY);
      localStorage.removeItem('pca_instagram_id');
    } catch (error) {
      secureWarn('Failed to clear stored session:', error);
    }
  }

  /**
   * Get or create session with duplicate prevention
   */
  async getOrCreateSession(instagramId?: string): Promise<string> {
    // Check if we're already creating a session
    if (this.isCreatingSession && this.sessionCreationPromise) {
      secureLog('Session creation already in progress, waiting...');
      return this.sessionCreationPromise;
    }

    // Check for existing valid session
    const storedSession = this.getStoredSession();
    if (storedSession) {
      secureLog('Using existing session:', storedSession.sessionId);

      // Verify session is still valid on backend
      try {
        await SessionAPI.getSession(storedSession.sessionId);
        return storedSession.sessionId;
      } catch {
        secureWarn('Stored session is invalid, creating new one');
        this.clearStoredSession();
      }
    }

    // Create new session with duplicate prevention
    this.isCreatingSession = true;
    this.sessionCreationPromise = this.createNewSession(instagramId);

    try {
      const sessionId = await this.sessionCreationPromise;
      return sessionId;
    } finally {
      this.isCreatingSession = false;
      this.sessionCreationPromise = null;
    }
  }

  /**
   * Create new session
   */
  private async createNewSession(instagramId?: string): Promise<string> {
    try {
      const response = await SessionAPI.createSession(instagramId);
      const { sessionId } = response.data;

      // Store in localStorage
      this.storeSession(sessionId, instagramId);

      secureLog('New session created:', sessionId);
      return sessionId;
    } catch (error) {
      secureWarn('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.clearStoredSession();
    this.isCreatingSession = false;
    this.sessionCreationPromise = null;
  }

  /**
   * Check if session is being created
   */
  isSessionBeingCreated(): boolean {
    return this.isCreatingSession;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
