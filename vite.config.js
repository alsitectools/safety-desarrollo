import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: '/safety-desarrollo/',
    plugins: [react()],
    define: {
      'import.meta.env.APPHUB_RETURN_URL': JSON.stringify(env.APPHUB_RETURN_URL || ''),
      'import.meta.env.PORTAL_BASE_URL': JSON.stringify(
        env.PORTAL_BASE_URL || (mode === 'development' ? 'http://localhost:5173' : ''),
      ),
    },
    server: {
      host: '0.0.0.0',
      port: 4039,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:3001',
      },
    },
  };
});
