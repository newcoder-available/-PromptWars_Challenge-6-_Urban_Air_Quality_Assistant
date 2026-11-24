import 'dotenv/config';
import { createApp } from './app.js';

const rawPort = Number(process.env.PORT ?? 3001);
const port = Number.isInteger(rawPort) && rawPort > 0 && rawPort < 65536 ? rawPort : 3001;

const app = createApp();
const server = app.listen(port, () => {
  const aiMode =
    process.env.GEMINI_API_KEY?.trim() && process.env.OFFLINE_MODE !== 'true'
      ? 'Gemini GenAI'
      : 'Local Intelligence Engine (set GEMINI_API_KEY for live Gemini)';
  console.log(`AirShield AI API listening on http://127.0.0.1:${port} [${aiMode}]`);
});

function shutdown(signal: string): void {
  console.log(`Received ${signal}; shutting down gracefully...`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
