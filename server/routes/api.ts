import { Router } from 'express';
import { PRESET_CITIES } from '../../shared/constants.js';
import {
  actionPlanRequestSchema,
  airQualityQuerySchema,
  chatRequestSchema,
  citySearchQuerySchema,
  impactSimulationRequestSchema,
} from '../../shared/schemas.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import {
  aiPlanCache,
  answerAirQualityQuestion,
  generatePersonalizedActionPlan,
} from '../services/aiAdvisorService.js';
import {
  airQualityCache,
  citySearchCache,
  getAirQualityReport,
  searchCities,
} from '../services/airQualityService.js';
import { simulatePledgeImpact } from '../services/impactCalculator.js';

export interface ApiRouterOptions {
  aiRateLimitMax?: number;
  generalRateLimitMax?: number;
}

export function createApiRouter(options: ApiRouterOptions = {}): Router {
  const router = Router();

  const generalLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: options.generalRateLimitMax ?? 90,
  });

  const aiLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: options.aiRateLimitMax ?? 20,
    message:
      'AI advisor rate limit reached. Please wait a few seconds before sending another request.',
  });

  router.get('/health', (_req, res) => {
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY?.trim() && process.env.OFFLINE_MODE !== 'true',
    );
    res.json({
      status: 'ok',
      service: 'airshield-urban-air-quality-assistant',
      timestamp: new Date().toISOString(),
      aiMode: geminiConfigured ? 'gemini-genai' : 'local-intelligence',
      caches: {
        airQuality: airQualityCache.stats(),
        citySearch: citySearchCache.stats(),
        aiPlans: aiPlanCache.stats(),
      },
    });
  });

  router.get('/cities/presets', generalLimiter, (_req, res) => {
    res.json({ cities: PRESET_CITIES });
  });

  router.get('/cities/search', generalLimiter, async (req, res, next) => {
    try {
      const parsed = citySearchQuerySchema.parse(req.query);
      const cities = await searchCities(parsed.q);
      res.json({ cities });
    } catch (err) {
      next(err);
    }
  });

  router.get('/air-quality', generalLimiter, async (req, res, next) => {
    try {
      const parsed = airQualityQuerySchema.parse(req.query);
      const report = await getAirQualityReport({
        name: parsed.name ?? 'Selected Location',
        country: parsed.country ?? 'Urban Area',
        latitude: parsed.lat,
        longitude: parsed.lon,
      });
      res.json(report);
    } catch (err) {
      next(err);
    }
  });

  // Real-time Server-Sent Events stream pushing periodic live air quality & weather refreshes
  router.get('/air-quality/stream', generalLimiter, async (req, res, next) => {
    try {
      const parsed = airQualityQuerySchema.parse(req.query);
      const location = {
        name: parsed.name ?? 'Selected Location',
        country: parsed.country ?? 'Urban Area',
        latitude: parsed.lat,
        longitude: parsed.lon,
      };

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const pushUpdate = async () => {
        try {
          const report = await getAirQualityReport(location);
          res.write(`event: air-quality\ndata: ${JSON.stringify(report)}\n\n`);
        } catch {
          res.write(`event: error\ndata: {"message":"Transient refresh error"}\n\n`);
        }
      };

      await pushUpdate();

      // In serverless environments (e.g., Vercel), send standard SSE retry directive
      // and close cleanly so EventSource reconnects automatically without function timeouts.
      if (process.env.VERCEL === '1') {
        res.write('retry: 45000\n\n');
        res.end();
        return;
      }

      const interval = setInterval(() => {
        void pushUpdate();
      }, 45_000);

      const heartbeat = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 20_000);

      req.on('close', () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        res.end();
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/advisor/plan', aiLimiter, async (req, res, next) => {
    try {
      const parsed = actionPlanRequestSchema.parse(req.body);
      const report = await getAirQualityReport(parsed.location);
      const plan = await generatePersonalizedActionPlan({
        report,
        profile: parsed.profile,
        focusNote: parsed.focusNote,
      });
      res.json(plan);
    } catch (err) {
      next(err);
    }
  });

  router.post('/advisor/chat', aiLimiter, async (req, res, next) => {
    try {
      const parsed = chatRequestSchema.parse(req.body);
      const report = await getAirQualityReport(parsed.location);
      const response = await answerAirQualityQuestion({
        report,
        profile: parsed.profile,
        message: parsed.message,
        history: parsed.history,
      });
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.post('/impact/simulate', generalLimiter, (req, res, next) => {
    try {
      const parsed = impactSimulationRequestSchema.parse(req.body);
      const result = simulatePledgeImpact(parsed);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
