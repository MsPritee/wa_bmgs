import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import whatsappRoutes from './modules/whatsapp/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { isProd, env } from './config/env.js';

export const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: isProd ? { policy: 'same-origin' } : false,
  }),
);
const allowedOrigins = (env.WEB_ORIGIN ?? 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// WhatsApp webhook MUST be public (signature-verified internally)
app.use(whatsappRoutes);

// Log all incoming requests for debugging
app.use((req, _res, next) => {
  console.log(`[app] ${req.method} ${req.path}`);
  next();
});

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);