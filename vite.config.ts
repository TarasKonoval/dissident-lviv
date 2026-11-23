import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// На GitHub Pages сайт живе за адресою https://<user>.github.io/<repo>/,
// тому base = назва репозиторію. Локально (npm run dev) base = '/'.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? process.env.BASE_PATH ?? '/dissident-lviv/' : '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { maplibre: ['maplibre-gl'] } } },
  },
}));
