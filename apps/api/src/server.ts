import { createServer } from 'http';
import { app } from './app.js';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const server = createServer(app);

server.listen(port, () => {
   
  console.log(`[api] listening on http://localhost:${port}`);
});

function shutdown(signal: string) {
   
  console.log(`[api] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));