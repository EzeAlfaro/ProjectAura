import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const vitePort = parseInt(env.VITE_PORT || '3000', 10);
  const backendPort = parseInt(env.PORT || '3001', 10);
  const backendHost = env.BACKEND_HOST || 'localhost';
  const backendHttpTarget = env.BACKEND_URL || `http://${backendHost}:${backendPort}`;
  const backendWsTarget = env.BACKEND_WS_URL || `ws://${backendHost}:${backendPort}`;

  return {
    plugins: [
      react(),
      ...(env.USE_SSL === 'true' ? [basicSsl()] : []),
    ],
    server: {
      host: env.HOST || '0.0.0.0',
      port: vitePort,
      proxy: {
        '/api': {
          target: backendHttpTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: backendWsTarget,
          ws: true,
        },
      },
    },
  };
});
