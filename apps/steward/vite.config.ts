import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

export default defineConfig(() => {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@bitscribe/core-export': path.resolve(__dirname, '../../packages/core-export/index.ts'),
        '@bitscribe/desktop-api': path.resolve(__dirname, '../../packages/desktop-api/index.ts'),
        '@bitscribe/core-db': path.resolve(__dirname, '../../packages/core-db/index.ts'),
        '@bitscribe/ui-components': path.resolve(__dirname, '../../packages/ui-components/index.ts'),
        '@bitscribe/core-eval': path.resolve(__dirname, '../../packages/core-eval/index.ts'),
        '@bitscribe/core-types': path.resolve(__dirname, '../../packages/core-types/index.ts'),
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      fs: {
        allow: ['../..']
      },
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR === 'true' ? false : { overlay: false },
      // Always ignore the local database directory to prevent file change events from forcing a full page reload during active scans.
      watch: {
        ignored: ['**/BitScribeDB**/', '**/BitScribeDB', '**/src-tauri/**', '**/src-tauri']
      },
    },
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'EVAL') return;
          warn(warning);
        }
      }
    },
  };
});
