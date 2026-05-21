import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';

// Copy public dir excluding locked files, into a temp dir used as publicDir
function safePublicPlugin() {
  const tmpDir = path.resolve(__dirname, '.public-build');
  return {
    name: 'safe-public-dir',
    async buildStart() {
      // Clean and recreate temp dir
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      fs.mkdirSync(tmpDir, { recursive: true });
      const srcDir = path.resolve(__dirname, 'public');
      const entries = fs.readdirSync(srcDir);
      for (const entry of entries) {
        const src = path.join(srcDir, entry);
        const dest = path.join(tmpDir, entry);
        try {
          fs.copyFileSync(src, dest);
        } catch {
          // skip locked files
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), safePublicPlugin()],
  publicDir: '.public-build',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
