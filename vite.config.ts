import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-core': ['react', 'react-dom'],
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
            'tiptap': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-color', '@tiptap/extension-link', '@tiptap/extension-text-style', '@tiptap/extension-underline'],
            'charts': ['recharts'],
            'motion': ['motion'],
            'markdown': ['react-markdown'],
            'utils': ['date-fns', 'date-fns-tz', 'clsx', 'tailwind-merge', 'lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },

  };
});
