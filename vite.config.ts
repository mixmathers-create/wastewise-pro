import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
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
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-tabs",
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
          ],
          supabase: ["@supabase/supabase-js"],
          charts: ["recharts"],
          "date-utils": ["date-fns"],
          icons: ["lucide-react"],
        },
      },
    },

    chunkSizeWarningLimit: 600,
    minify: "terser",

    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: true,
        pure_funcs: mode === "production" ? ["console.log"] : [],
      },
      format: {
        comments: false,
      },
    },

    cssMinify: true,
    reportCompressedSize: false,
    target: "es2020",
    sourcemap: false,
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
}));
