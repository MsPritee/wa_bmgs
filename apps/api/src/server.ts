import { createServer } from 'http';
import { app } from './app.js';
import { describeProvider } from './modules/whatsapp/provider.js';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const server = createServer(app);

server.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
  console.log(`[api] whatsapp provider: ${describeProvider()}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandledRejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[api] uncaughtException:', err);
  process.exit(1);
});

function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));