import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Three real pages so GitHub Pages can serve /, /ai/ and /cv/ directly.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ai: resolve(import.meta.dirname, 'ai/index.html'),
        cv: resolve(import.meta.dirname, 'cv/index.html'),
      },
    },
  },
});
