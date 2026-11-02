// Shared Claude API (Anthropic Messages API) helper.
// Used by /api/generate-plan and /api/estimate-meal. Supports text and image content.
//
// Failure handling (Week 9 testing):
// - Up to 3 attempts on 429 (rate limited), 5xx and 529 (overloaded), and on network errors.
// - Waits between attempts with exponential backoff + jitter, and honors the
//   retry-after header (capped) so a traffic spike doesn't hammer the API.
// - No retry on other 4xx (bad key, bad request): retrying can't help.
// - At most MAX_CONCURRENT calls run at once per server; extra requests wait their turn.

export type ClaudeContent =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string };
    };

type CallOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

const MAX_ATTEMPTS = 3;
const MAX_WAIT_MS = 8000;
const MAX_CONCURRENT = Number(process.env.CLAUDE_MAX_CONCURRENT) || 20;

// ---- Simple concurrency gate ------------------------------------------------
let active = 0;
const queue: (() => void)[] = [];

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  active++;
}

function release() {
  active--;
  queue.shift()?.();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffMs(attempt: number, retryAfter: string | null): number {
  const base = Number(process.env.CLAUDE_RETRY_BASE_MS ?? 800);
  const header = retryAfter !== null ? Number(retryAfter) * 1000 : NaN;
  const exp = base * 2 ** attempt + Math.random() * base;
  return Math.min(MAX_WAIT_MS, Number.isFinite(header) ? Math.max(header, base) : exp);
}

// Throws on failure. Callers turn the error into a friendly message.
export async function callClaude(
  systemPrompt: string,
  content: ClaudeContent[] | string,
  { maxTokens = 2048, temperature = 0.2, timeoutMs = 45000 }: CallOptions = {},
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  });

  await acquire();
  try {
    let lastError = "";
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let retryAfter: string | null = null;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body,
          signal: controller.signal,
        });

        if (res.ok) {
          const message = await res.json();
          const text = (message.content || [])
            .filter((block: { type: string }) => block.type === "text")
            .map((block: { text: string }) => block.text)
            .join("");
          if (!text) throw new Error("Empty response from the model");
          if (message.stop_reason === "max_tokens") throw new Error("Response was cut off (max_tokens reached)");
          return text;
        }

        lastError = `${res.status} ${(await res.text()).slice(0, 300)}`;
        if (res.status !== 429 && res.status < 500) break; // other 4xx: retrying won't help
        retryAfter = res.headers.get("retry-after");
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        // A complete-but-unusable answer won't improve by asking again at the same settings.
        if (/cut off|Empty response/.test(lastError)) break;
      } finally {
        clearTimeout(timeout);
      }
      if (attempt < MAX_ATTEMPTS - 1) await sleep(backoffMs(attempt, retryAfter));
    }
    throw new Error(`Claude API request failed: ${lastError}`);
  } finally {
    release();
  }
}

// Models sometimes wrap JSON in ```json fences or add a sentence before/after it.
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Last resort: take the outermost {...}
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("No JSON object found in model output");
  }
}
