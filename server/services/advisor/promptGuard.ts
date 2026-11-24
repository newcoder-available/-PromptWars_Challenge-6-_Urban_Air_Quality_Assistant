/**
 * Prompt-injection defense utilities: detects role/instruction override patterns
 * and neutralizes XML/HTML tag delimiters in untrusted user input.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(the\s+)?system\s+prompt/i,
  /reveal\s+(your\s+)?(system\s+prompt|api[_\s-]?key|secret)/i,
  /you\s+are\s+now\s+(dan|jailbreak|unrestricted)/i,
  /<\s*\/?\s*(system|assistant|developer)\s*>/i,
];

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function escapePromptTagContent(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}
