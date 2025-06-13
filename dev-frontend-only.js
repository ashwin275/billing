// Frontend-only development server for local use
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startFrontendServer() {
  const server = await createServer({
    configFile: false,
    root: path.resolve(__dirname, 'client'),
    server: {
      port: 5173,
      host: '0.0.0.0',
      open: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client', 'src'),
        '@shared': path.resolve(__dirname, 'shared'),
        '@assets': path.resolve(__dirname, 'attached_assets'),
      },
    },
    plugins: [
      {
        name: 'vite:react',
        config() {
          return {
            esbuild: {
              loader: 'tsx',
              include: /src\/.*\.[tj]sx?$/,
            },
          };
        },
      },
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
  });

  await server.listen();
  server.printUrls();
}

startFrontendServer().catch(console.error);