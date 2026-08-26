import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: 'web',
  // asset/ 에는 OG 이미지 하나뿐이다. 빌드 산출물 루트로 그대로 복사된다.
  publicDir: '../asset',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./web/src', import.meta.url)),
      '~server': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
});
