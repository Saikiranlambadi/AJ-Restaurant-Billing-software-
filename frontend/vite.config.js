import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api')) {
          return next();
        }

        try {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body === undefined) {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const bodyText = Buffer.concat(buffers).toString('utf-8');
            try {
              req.body = bodyText ? JSON.parse(bodyText) : {};
            } catch {
              req.body = {};
            }
          }

          if (!res.status) {
            res.status = function(code) {
              res.statusCode = code;
              return res;
            };
          }
          if (!res.json) {
            res.json = function(data) {
              if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json');
              }
              res.end(JSON.stringify(data));
            };
          }

          const apiPath = path.resolve(__dirname, '../api/index.js');
          const apiModule = await server.ssrLoadModule(apiPath);
          const handler = apiModule.default;
          await handler(req, res);
        } catch (err) {
          console.error('[Vite API Dev Plugin Error]', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: err.message || 'Internal Server Error' }));
          }
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
})
