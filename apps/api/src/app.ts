import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import whatsappRoutes from './modules/whatsapp/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { isProd } from './config/env.js';

export const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: isProd ? { policy: 'same-origin' } : false,
  }),
);
app.use(cors({ origin: true, credentials: true }));
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

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);