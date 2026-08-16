export const TOOL_KEYWORDS: Record<string, string[]> = {
  delay: ["delay", "wait", "espera", "demora", "pausa", "sleep"],
};

const WORD_PATTERNS: Record<string, RegExp> = {
  "http.request": /(https?:\/\/|curl|\bscrape\b|\bfetch\b|\burl\b|api request|petici[óo]n http)/i,
  "math.operation": /\bsum\b|\bsuma\b|\bsumar\b|\badd\b|\bplus\b|\btotal\b/i,
};

function hasSumNumbers(message: string): boolean {
  return (message.match(/-?\d+(\.\d+)?/g) ?? []).length > 0;
}

export function matchToolByKeywords(
  message: string,
  fnKeys: string[],
  alreadyUsed: Set<string>
): string | null {
  const lower = message.toLowerCase();
  for (const fnKey of fnKeys) {
    if (alreadyUsed.has(fnKey)) {
      continue;
    }
    if (fnKey === "math.operation") {
      if (WORD_PATTERNS["math.operation"].test(message) && hasSumNumbers(message)) {
        return fnKey;
      }
      continue;
    }
    if (fnKey === "http.request") {
      if (WORD_PATTERNS["http.request"].test(message)) {
        return fnKey;
      }
      continue;
    }
    const keywords = TOOL_KEYWORDS[fnKey];
    if (!keywords) {
      continue;
    }
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return fnKey;
    }
  }
  return null;
}

export function inferToolInputs(fnKey: string, message: string): Record<string, unknown> {
  if (fnKey === "math.operation") {
    const numbers = message.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    return { a: numbers[0] ?? 0, b: numbers[1] ?? 0, operation: "suma" };
  }
  if (fnKey === "http.request") {
    const url = message.match(/https?:\/\/[^\s]+/)?.[0] ?? "";
    return { url, method: "GET" };
  }
  return {};
}
