import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/live': 'http://127.0.0.1:8765', '/cc-a2': 'http://127.0.0.1:8766', '/cc-b1': 'http://127.0.0.1:8767', '/wg2': 'http://127.0.0.1:8768' } },
});
