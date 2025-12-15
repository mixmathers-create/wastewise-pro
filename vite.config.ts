import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Compression disabled
    // mode === "production" && viteCompression({
    //   algorithm: 'gzip',
    //   ext: '.gz',
    //   threshold: 10240, // Only compress files > 10kb
    // }),
    // mode === "production" && viteCompression({
    //   algorithm: 'brotliCompress',
    //   ext: '.br',
    //   threshold: 10240,
    // }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-tabs', '@radix-ui/react-dialog', '@radix-ui/react-select'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['recharts'],
          'date-utils': ['date-fns'],
          'icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log'] : [],
      },
      format: {
        comments: false,
      },
    },
    cssMinify: true,
    reportCompressedSize: false, // Faster builds
    target: 'es2020', // Support BigInt and modern features
    sourcemap: false, // Disable sourcemaps in production
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}));
