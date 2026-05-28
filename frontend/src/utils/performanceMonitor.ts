/**
 * Performance Monitor - Tracks and reports performance metrics
 */

interface PerformanceMetrics {
  pageLoadTime?: number;
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observer: PerformanceObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.init();
    }
  }

  private init(): void {
    // Track page load time
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.metrics.ttfb = navigation.responseStart - navigation.fetchStart;
      }
    });

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Track FCP
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcp) {
            this.metrics.fcp = fcp.startTime;
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Track LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.metrics.lcp = lastEntry.startTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Track FID
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstInput = entries[0];
          if (firstInput) {
            this.metrics.fid = firstInput.processingStart - firstInput.startTime;
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Track CLS
        let clsValue = 0;
        const clsEntries: PerformanceEntry[] = [];
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsEntries.push(entry);
              clsValue += (entry as any).value;
            }
          }
          this.metrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

      } catch (e) {
        console.warn('Failed to initialize performance observers:', e);
      }
    }

    // Track memory usage
    this.trackMemoryUsage();
  }

  private trackMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memory = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };

        // Warn if memory usage is high
        const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercentage > 90) {
          console.warn(`High memory usage detected: ${usagePercentage.toFixed(2)}%`);
        }
      }, 10000); // Check every 10 seconds
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Log metrics to console
   */
  logMetrics(): void {
    const metrics = this.getMetrics();
    console.group('📊 Performance Metrics');
    
    if (metrics.pageLoadTime) {
      console.log(`Page Load Time: ${metrics.pageLoadTime.toFixed(2)}ms`);
    }
    if (metrics.ttfb) {
      console.log(`Time to First Byte: ${metrics.ttfb.toFixed(2)}ms`);
    }
    if (metrics.fcp) {
      console.log(`First Contentful Paint: ${metrics.fcp.toFixed(2)}ms`);
    }
    if (metrics.lcp) {
      console.log(`Largest Contentful Paint: ${metrics.lcp.toFixed(2)}ms`);
    }
    if (metrics.fid) {
      console.log(`First Input Delay: ${metrics.fid.toFixed(2)}ms`);
    }
    if (metrics.cls) {
      console.log(`Cumulative Layout Shift: ${metrics.cls.toFixed(4)}`);
    }
    if (metrics.memory) {
      const usedMB = (metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      console.log(`Memory Usage: ${usedMB}MB / ${totalMB}MB`);
    }
    
    console.groupEnd();
  }

  /**
   * Report metrics to analytics
   */
  async reportMetrics(): Promise<void> {
    const metrics = this.getMetrics();
    
    // Only report if we have meaningful metrics
    if (!metrics.lcp && !metrics.fcp) {
      return;
    }

    try {
      const { trackEvent } = await import('./analytics');
      
      // Report Core Web Vitals
      if (metrics.lcp) {
        trackEvent('web_vitals', {
          metric_name: 'LCP',
          value: Math.round(metrics.lcp),
          rating: this.getLCPRating(metrics.lcp)
        });
      }

      if (metrics.fid) {
        trackEvent('web_vitals', {
          metric_name: 'FID',
          value: Math.round(metrics.fid),
          rating: this.getFIDRating(metrics.fid)
        });
      }

      if (metrics.cls) {
        trackEvent('web_vitals', {
          metric_name: 'CLS',
          value: metrics.cls.toFixed(4),
          rating: this.getCLSRating(metrics.cls)
        });
      }

      // Report page load performance
      if (metrics.pageLoadTime) {
        trackEvent('page_performance', {
          page_load_time: Math.round(metrics.pageLoadTime),
          ttfb: metrics.ttfb ? Math.round(metrics.ttfb) : undefined,
          user_agent: navigator.userAgent
        });
      }
    } catch (error) {
      console.error('Failed to report performance metrics:', error);
    }
  }

  /**
   * Get rating for LCP (Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s)
   */
  private getLCPRating(lcp: number): 'good' | 'needs-improvement' | 'poor' {
    if (lcp < 2500) return 'good';
    if (lcp < 4000) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get rating for FID (Good: <100ms, Needs Improvement: 100-300ms, Poor: >300ms)
   */
  private getFIDRating(fid: number): 'good' | 'needs-improvement' | 'poor' {
    if (fid < 100) return 'good';
    if (fid < 300) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get rating for CLS (Good: <0.1, Needs Improvement: 0.1-0.25, Poor: >0.25)
   */
  private getCLSRating(cls: number): 'good' | 'needs-improvement' | 'poor' {
    if (cls < 0.1) return 'good';
    if (cls < 0.25) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Mark a custom timing
   */
  mark(name: string): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark?: string): void {
    if ('performance' in window && 'measure' in performance) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark);
        } else {
          performance.measure(name, startMark);
        }
        
        const measures = performance.getEntriesByName(name, 'measure');
        const lastMeasure = measures[measures.length - 1];
        if (lastMeasure) {
          console.log(`⏱️ ${name}: ${lastMeasure.duration.toFixed(2)}ms`);
        }
      } catch (e) {
        console.warn('Failed to measure performance:', e);
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();