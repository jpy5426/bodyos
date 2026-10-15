// Shared Claude API (Anthropic Messages API) helper.
// Used by /api/estimate-meal. Supports text and image content.

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

// One retry on 429 / 5xx / 529 (overloaded). Throws on failure.
export async function callClaude(
  systemPrompt: string,
  content: ClaudeContent[],
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

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
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
        if (message.stop_reason === "max_tokens") {
          throw new Error("Response was cut off (max_tokens reached)");
        }
        return text;
      }

      lastError = `${res.status} ${await res.text()}`;
      if (res.status !== 429 && res.status < 500) break; // other 4xx: retrying won't help
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Claude API request failed: ${lastError}`);
}

// Models sometimes wrap JSON in ```json fences even when told not to.
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
