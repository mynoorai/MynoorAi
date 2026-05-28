import { devLog } from '@/utils/devLog';
// Preload utility to ensure environment is ready
export async function preloadEnvironment(): Promise<void> {
  devLog.log('[PRELOAD] Starting preloadEnvironment...');

  try {
    // Force evaluation of environment variables
    const checks = {
      AI_API_URL: import.meta.env.VITE_AI_API_URL,
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    };

    devLog.log('[PRELOAD] Environment variables loaded:', checks);
    devLog.log('[PRELOAD] import.meta.env:', import.meta.env);

    // Small delay to ensure everything is loaded
    devLog.log('[PRELOAD] Waiting 50ms...');
    await new Promise((resolve) => setTimeout(resolve, 50));
    devLog.log('[PRELOAD] Wait complete');

    // Import constants to trigger their initialization
    devLog.log('[PRELOAD] Importing constants...');
    const constants = await import('@/utils/constants');
    devLog.log('[PRELOAD] Constants imported successfully');

    devLog.log('[PRELOAD] Constants values:', {
      AI_API_URL: constants.AI_API_URL,
      API_BASE_URL: constants.API_BASE_URL,
    });

    devLog.log('[PRELOAD] preloadEnvironment complete');
  } catch (error) {
    console.error('[PRELOAD] Error in preloadEnvironment:', error);
    console.error('[PRELOAD] Stack trace:', error.stack);
    throw error;
  }
}
