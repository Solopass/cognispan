import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the demo from /cognispan/; locally it stays at /.
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
});
