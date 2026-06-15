import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Copy public dir excluding locked files, into a temp dir used as publicDir
function safePublicPlugin() {
  const tmpDir = path.resolve(__dirname, '.public-build');
  return {
    name: 'safe-public-dir',
    async buildStart() {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      fs.mkdirSync(tmpDir, { recursive: true });
      const srcDir = path.resolve(__dirname, 'public');
      const entries = fs.readdirSync(srcDir);
      for (const entry of entries) {
        // Skip files with spaces in name (cause EAGAIN in sandbox)
        if (entry.includes(' ')) continue;
        const src = path.join(srcDir, entry);
        const dest = path.join(tmpDir, entry);
        try { fs.copyFileSync(src, dest); } catch { /* skip locked files */ }
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
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        // Main SIRH application
        main: path.resolve(__dirname, 'index.html'),
        // Standalone recruitment portal
        candidature: path.resolve(__dirname, 'candidature/index.html'),
      },
    },
  },
});
