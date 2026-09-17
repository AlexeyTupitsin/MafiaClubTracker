import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Библиотеки — отдельными файлами: они меняются редко и остаются в кэше
// браузера между деплоями. recharts Vite сам кладёт в чанки страниц с графиками.
const VENDOR_CHUNKS = {
  react: ['/node_modules/react/', '/node_modules/react-dom/', '/node_modules/scheduler/'],
  supabase: ['/node_modules/@supabase/'],
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          for (const [chunk, dirs] of Object.entries(VENDOR_CHUNKS)) {
            if (dirs.some((dir) => path.includes(dir))) return chunk;
          }
        },
      },
    },
  },
});
