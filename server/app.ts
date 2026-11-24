import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { createApiRouter, type ApiRouterOptions } from './routes/api.js';

export interface AppConfig {
  allowedOrigins?: string[];
  apiOptions?: ApiRouterOptions;
  serveStatic?: boolean;
}

function resolveAllowedOrigins(override?: string[]): Set<string> {
  if (override && override.length > 0) {
    return new Set(override);
  }
  const envOrigins = (
    process.env.ALLOWED_ORIGINS ??
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(envOrigins);
}

export function createApp(config: AppConfig = {}): Express {
  const app = express();

  // Hide Express fingerprint
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Strict security headers including Content-Security-Policy
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  // Restrict powerful browser APIs not needed by this app
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
    );
    next();
  });

  // Strict CORS allowlist
  const allowedOrigins = resolveAllowedOrigins(config.allowedOrigins);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin / server-to-server / curl requests without Origin header
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('CORS_ORIGIN_DENIED'));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  );

  // Response compression & strict JSON body size limit
  app.use(compression());
  app.use(express.json({ limit: '16kb', strict: true }));

  // Mount API routes
  app.use('/api', createApiRouter(config.apiOptions));

  // Unmatched API routes return clean JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: 'API endpoint not found.',
    });
  });

  // Serve compiled Vite client bundle in production when present
  const clientDistDir = path.resolve(process.cwd(), 'dist', 'client');
  const shouldServeStatic =
    config.serveStatic ??
    (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistDir));

  if (shouldServeStatic && fs.existsSync(clientDistDir)) {
    app.use(
      express.static(clientDistDir, {
        maxAge: '7d',
        etag: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );

    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
