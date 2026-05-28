import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    open: false,
    proxy: {
      // Proxy all API calls to backend
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    // Disable source maps in production for security
    sourcemap: mode !== 'production',
    // Minify for production but KEEP console logs for debugging camera issue
    minify: mode === 'production' ? 'terser' : false,
    terserOptions:
      mode === 'production'
        ? {
            compress: {
              drop_console: false, // TEMPORARILY KEEP console statements for debugging
              drop_debugger: true, // Remove debugger statements
              // Don't remove any console functions for now
              // pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
            },
            format: {
              comments: false, // Remove comments
            },
          }
        : undefined,
    // Browser compatibility
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    // Increase chunk size limit to avoid over-splitting
    chunkSizeWarningLimit: 2000,
    // Enable module preloading for faster initial load
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        // Split self-contained heavy libraries; everything else stays in vendor to avoid circular chunks
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('@tensorflow')) return 'vendor-tensorflow';
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap';
          if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('heic2any')) return 'vendor-image';
          return 'vendor';
        },
        // Increase max parallel requests to reduce chunk splitting
        maxParallelFileOps: 10,
        // Use simpler naming
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
      'clsx',
      'tailwind-merge',
    ],
    exclude: [],
    // Force re-optimization on every build
    force: true,
  },
  define: {
    // Only expose necessary environment variables
    __DEV__: mode !== 'production',
  },
}));
