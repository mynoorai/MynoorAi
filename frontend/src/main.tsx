import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from './hooks/QueryProvider';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { preloadEnvironment } from './utils/preload';
import { setupChunkErrorHandler } from './utils/chunkErrorHandler';
// import { scheduleTensorFlowPreinit } from './utils/tensorflowInit'
import { devLog } from './utils/devLog';
import './index.css';
import './styles/admin-theme.css';
import App from './App.tsx';

devLog.log('[MAIN] Starting application...');
devLog.log('[MAIN] Imports complete');

// 경로 플래그를 최상단에서 먼저 선언하여 TDZ(Temporal Dead Zone) 회피
// - 아래에서 Service Worker 등록 조건 등에서 사용되므로 선행 선언 필수
const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

// Setup chunk error handler
setupChunkErrorHandler();

// Reset reload counter on successful app start
sessionStorage.removeItem('chunk_reload_count');

// Register service worker for better caching (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD && !isAdminRoute) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        devLog.log('ServiceWorker registered:', registration);
      })
      .catch((error) => {
        devLog.log('ServiceWorker registration failed:', error);
      });
  });
}

// Add error handlers
window.addEventListener('error', (event) => {
  console.error('[MAIN] Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[MAIN] Unhandled promise rejection:', event.reason);
});

// On admin routes, aggressively disable Service Worker/caches to avoid stale bundles
if (isAdminRoute && 'serviceWorker' in navigator) {
  (async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      devLog.log('[MAIN] Admin route: disabled service worker and cleared caches');
    } catch (e) {
      console.warn('[MAIN] Failed to clear SW/caches on admin route', e);
    }
  })();
}

devLog.log('[MAIN] Starting app initialization...');
devLog.log(
  '[MAIN] Current route:',
  typeof window !== 'undefined' ? window.location.pathname : 'unknown',
);
devLog.log('[MAIN] TensorFlow preload enabled:', !isAdminRoute);

// Render app immediately without waiting for TensorFlow
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[MAIN] Root element not found!');
} else {
  devLog.log('[MAIN] Creating React root...');
  const root = createRoot(rootElement);

  devLog.log('[MAIN] Rendering app immediately...');
  root.render(
    <StrictMode>
      <QueryProvider>
        <App />
        {!isAdminRoute && import.meta.env.VITE_VERCEL_ANALYTICS_DISABLED !== 'true' && (
          <SpeedInsights />
        )}
      </QueryProvider>
    </StrictMode>,
  );
  devLog.log('[MAIN] Render call complete');

  // Load environment and TensorFlow in background after render
  devLog.log('[MAIN] Loading resources in background...');

  // Preload environment variables (non-blocking)
  preloadEnvironment().catch((error) => {
    console.error('[MAIN] Failed to preload environment:', error);
  });

  // Initialize TensorFlow in background (non-blocking) unless we're on admin routes
  // if (!isAdminRoute) {
  //   devLog.log('[MAIN] Scheduling TensorFlow pre-init in background...');
  //   scheduleTensorFlowPreinit(500);
  // } else {
  //   devLog.log('[MAIN] Skipping TensorFlow preload on admin route');
  // }
}
