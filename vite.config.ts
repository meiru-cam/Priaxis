import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, '').replace(/^\/+/, '/')
      },
      '/api/aw': {
        target: 'http://localhost:5600/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/aw/, '')
      },
      '/mcp': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mcp/, '')
      }
    }
  },
  preview: {
    port: 3001,
    proxy: {
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, '').replace(/^\/+/, '/')
      },
      '/api/aw': {
        target: 'http://localhost:5600/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/aw/, '')
      },
      '/mcp': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mcp/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'zustand', 'styled-components', '@tanstack/react-query'],
          'ai-vendor': ['@google/genai', 'openai'],
          'ui-vendor': ['emoji-picker-react', 'lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  }
})
