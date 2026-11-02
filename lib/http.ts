// Reads a JSON request body with a hard size cap, so a huge upload can't tie up
// the server's memory. Rejects early from the Content-Length header when possible,
// and also counts bytes while reading in case the header is missing or wrong.
import type { NextRequest } from "next/server";

export class BodyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function readJson(req: NextRequest, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new BodyError(413, "That request is too large.");
  }
  if (!req.body) throw new BodyError(400, "Invalid request body.");

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new BodyError(413, "That request is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BodyError(400, "Invalid request body.");
  }
}
