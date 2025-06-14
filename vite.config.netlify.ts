import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@assets': path.resolve(__dirname, './attached_assets'),
    },
  },
  define: {
    'process.env': {},
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
  },
  preview: {
    port: 5000,
    host: '0.0.0.0',
  },
})