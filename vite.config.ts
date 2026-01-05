import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Output to dist folder for Vercel deployment
    outDir: "dist",
    // Ensure all assets are properly emitted
    emptyOutDir: true,
    // Generate sourcemaps for debugging in production
    sourcemap: false,
  },
  preview: {
    // SPA fallback for local preview
    port: 3000,
  },
}));
