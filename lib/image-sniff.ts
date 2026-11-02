// Server-only: confirms uploaded bytes really are the image type the browser
// claimed, by checking the file signature ("magic bytes"). Stops renamed
// HTML, PDF or program files from being sent to the AI.

export type MediaType = "image/jpeg" | "image/png" | "image/webp";

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function sniffImage(base64: string): MediaType | null {
  if (!base64 || !BASE64.test(base64)) return null;
  const head = Buffer.from(base64.slice(0, 32), "base64");
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (head.length >= 12 && head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null;
}
