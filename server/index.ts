import 'dotenv/config';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

const rawPort = Number(process.env.PORT ?? 3001);
const port = Number.isInteger(rawPort) && rawPort > 0 && rawPort < 65536 ? rawPort : 3001;

const app = createApp();
const server = app.listen(port, () => {
  const aiMode =
    process.env.GEMINI_API_KEY?.trim() && process.env.OFFLINE_MODE !== 'true'
      ? 'gemini-genai'
      : 'local-intelligence';
  logger.info('AirShield AI API listening', { port, aiMode });
});

function shutdown(signal: string): void {
  logger.info('Graceful shutdown initiated', { signal });
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
