import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { config } from './config/env';
import routes from './routes';
import { requestId } from './middlewares/requestId';
import { requestLogger } from './middlewares/requestLogger';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { publicLimiter } from './middlewares/rateLimiter';

const app: Application = express();

// Behind Nginx/Vercel — required for req.ip and rate limiting to see the real client IP.
app.set('trust proxy', 1);

// 1. Security headers, before anything can respond.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// 2. CORS. Requests with no Origin (Postman, server-to-server) are allowed.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (config.cors.origins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Guest-Token', 'X-Request-Id'],
  }),
);

// 3. Request ID before logging, so every log line carries it.
app.use(requestId);

/**
 * 4. Razorpay webhook — MUST be mounted before express.json().
 *    Signature verification needs the exact raw bytes; once JSON.parse
 *    runs and the object is re-serialised, the HMAC no longer matches.
 *    The route handler itself is added in Phase 3.
 */
app.use(
  '/api/v1/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  (req: Request, _res: Response, next) => {
    req.rawBody = req.body as Buffer;
    try {
      req.body = JSON.parse((req.body as Buffer).toString('utf8'));
    } catch {
      req.body = {};
    }
    next();
  },
);

// 5. Body parsing for everything else.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.security.cookieSecret));

// 6. Response compression.
app.use(compression());

// 7. Access logging.
app.use(requestLogger);

// 8. Baseline rate limit across the API.
app.use(config.apiPrefix, publicLimiter);

// 9. Application routes.
app.use(config.apiPrefix, routes);

// 10. Root ping.
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Sports E-Commerce API',
    version: config.apiVersion,
    health: `${config.apiPrefix}/health`,
  });
});

// 11. Unmatched routes.
app.use(notFound);

// 12. Error handler — must be last.
app.use(errorHandler);

export default app;
