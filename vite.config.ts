/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('framer-motion')) return 'vendor-animation';
            if (id.includes('@tiptap')) return 'vendor-editor';
            if (id.includes('@radix-ui')) return 'vendor-ui';
            if (id.includes('@fortawesome') || id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-markdown') || id.includes('rehype-raw') || id.includes('marked') || id.includes('turndown')) return 'vendor-markdown';
            return 'vendor-core';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
