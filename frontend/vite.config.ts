import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import compression from 'vite-plugin-compression'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5555,
      strictPort: true,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:4444',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      // rollupOptions: {
      //   output: {
      //     chunkFileNames: 'assets/ts/[name]-[hash].ts',
      //     entryFileNames: 'assets/ts/[name]-[hash].ts',
      //     assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          
      //     manualChunks(id) {
      //       if (id.includes('node_modules')) {
      //         if (id.includes('react')) return 'vendor-react';
      //         if (id.includes('axios')) return 'vendor-network';
      //         return 'vendor-core';
      //       }
      //     },
      //   },
      // },
    },
  }
});