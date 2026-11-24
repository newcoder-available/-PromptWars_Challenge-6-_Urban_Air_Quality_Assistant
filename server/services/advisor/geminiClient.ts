import { logger } from '../../utils/logger.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_TIMEOUT_MS = 14_000;
const SAFE_MODEL_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;

interface SchemaParser<T> {
  safeParse: (data: unknown) => { success: true; data: T } | { success: false };
}

interface GeminiJsonRequest<T> {
  systemInstruction: string;
  userPrompt: string;
  schema: SchemaParser<T>;
}

/**
 * Calls the Google Gemini REST API requesting strict JSON output,
 * validates the parsed payload against a Zod schema, and fails closed to `null`
 * on timeout, HTTP error, or schema mismatch.
 */
export async function callGeminiJson<T>(
  params: GeminiJsonRequest<T>,
): Promise<{ data: T; modelUsed: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || process.env.OFFLINE_MODE === 'true') {
    return null;
  }

  const rawModel = (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash').trim();
  const model = SAFE_MODEL_PATTERN.test(rawModel) ? rawModel : 'gemini-2.5-flash';
  const endpoint = `${GEMINI_API_BASE}/${model}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      logger.warn('Gemini API returned non-OK status; falling back to local engine', {
        status: response.status,
      });
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsedJson: unknown = JSON.parse(cleaned);
    const validated = params.schema.safeParse(parsedJson);

    return validated.success ? { data: validated.data, modelUsed: model } : null;
  } catch (err) {
    logger.warn('Gemini request failed; falling back to local engine', {
      reason: err instanceof Error ? err.message : 'unknown_error',
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
