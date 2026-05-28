import { SessionAPI } from '@/services/api';
import { useAppStore } from '@/store';
import { secureLog, secureWarn } from '@/utils/secureLogging';

/**
 * Ensures a valid session exists, creating one if necessary
 * This handles cases where the backend restarts and loses in-memory sessions
 */
export async function ensureValidSession(): Promise<string> {
  const store = useAppStore.getState();
  const currentSessionId = store.sessionId;
  const instagramId = store.instagramId;

  if (!currentSessionId) {
    // No session at all, create one
    secureLog('[SessionHelper] No session found, creating new session...');
    const response = await SessionAPI.createSession(instagramId || undefined);
    store.setSessionData(response.data.sessionId, response.data.instagramId);
    return response.data.sessionId;
  }

  try {
    // Try to verify the session exists
    await SessionAPI.getSession(currentSessionId);
    return currentSessionId;
  } catch {
    // Session doesn't exist (probably backend restarted), create a new one
    secureWarn('[SessionHelper] Session verification failed, creating new session...');
    const response = await SessionAPI.createSession(instagramId || undefined);
    store.setSessionData(response.data.sessionId, response.data.instagramId);
    return response.data.sessionId;
  }
}

/**
 * Updates session with automatic recovery if session is lost
 */
export async function updateSessionWithRecovery(
  sessionId: string,
  updateData: Parameters<typeof SessionAPI.updateSession>[1],
): Promise<void> {
  try {
    await SessionAPI.updateSession(sessionId, updateData);
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404 || axiosError.response?.status === 403) {
        // 404: session missing after cold start
        // 403: session exists but now owned by anonymous user while client is logged-in
        const newSessionId = await ensureValidSession();
        await SessionAPI.updateSession(newSessionId, updateData);
        return;
      }
    }
    throw error;
  }
}
