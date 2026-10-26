import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: {
    main: fileURLToPath(new URL('./index.html', import.meta.url)),
    workspace: fileURLToPath(new URL('./workspace-preview.html', import.meta.url)),
  } } },
  server: { proxy: { '/live': 'http://127.0.0.1:8765', '/cc-a2': 'http://127.0.0.1:8766', '/cc-b1': 'http://127.0.0.1:8767' } },
});
