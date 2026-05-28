import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackPageView,
  initializeScrollTracking,
  trackPerformance,
  debugGA4,
} from '@/utils/analytics';

interface PageTrackerProps {
  children: React.ReactNode;
}

export const PageTracker = ({ children }: PageTrackerProps): JSX.Element => {
  let location;
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const navigationStartRef = useRef<number>(Date.now());

  try {
    location = useLocation();
  } catch {
    // If not in router context, just render children without tracking
    return <>{children}</>;
  }

  useEffect(() => {
    if (!location) return;

    const navigationEnd = Date.now();
    const navigationDuration = navigationEnd - navigationStartRef.current;

    // Track page view on route change
    const pageName = getPageName(location.pathname);
    trackPageView(location.pathname, `${pageName} | mynoor ai`);

    // Track navigation performance
    trackPerformance('page_navigation_time', navigationDuration, location.pathname);

    // Update document title for better tracking
    if (pageName) {
      document.title = `${pageName} | mynoor ai`;
    }

    // Initialize scroll tracking for this page
    if (scrollCleanupRef.current) {
      scrollCleanupRef.current();
    }
    scrollCleanupRef.current = initializeScrollTracking(location.pathname);

    // Track Core Web Vitals if available
    if ('web-vitals' in window) {
      // This would work with web-vitals library if installed
      trackPerformance('page_loaded', Date.now() - navigationStartRef.current, location.pathname);
    }

    // Debug in development
    if (import.meta.env.DEV) {
      console.log(`[PageTracker] Page changed to: ${location.pathname} (${pageName})`);
      debugGA4();
    }

    // Update navigation start time for next page
    navigationStartRef.current = Date.now();

    // Cleanup scroll tracking on unmount
    return () => {
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
        scrollCleanupRef.current = null;
      }
    };
  }, [location]);

  return <>{children}</>;
};

// Helper function to get readable page names
const getPageName = (pathname: string): string => {
  const pageMap: Record<string, string> = {
    '/': 'Landing Page',
    '/upload': 'Photo Upload',
    '/analyzing': 'AI Analysis in Progress',
    '/result': 'Personal Color Result',
    '/recommendation': 'Hijab Recommendation Request',
    '/completion': 'Flow Completion',
    '/admin/login': 'Admin Login',
    '/admin/dashboard': 'Admin Dashboard',
    '/privacy': 'Privacy Policy',
    '/terms': 'Terms of Service',
    '/about': 'About mynoor ai',
    '/contact': 'Contact Us',
    '/error': 'Error Page',
    '/404': 'Page Not Found',
  };

  // Handle dynamic routes
  if (pathname.startsWith('/admin/recommendations/')) {
    return 'Admin Recommendation Detail';
  }
  if (pathname.startsWith('/admin/users/')) {
    return 'Admin User Detail';
  }
  if (pathname.startsWith('/result/')) {
    return 'Shared Result View';
  }

  return pageMap[pathname] || `Unknown Page (${pathname})`;
};
