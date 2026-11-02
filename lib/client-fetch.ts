// Reads an API response in the browser and turns every failure into a plain message.
// Before this, an expired session or a server timeout returned an HTML page, and
// the user saw "Unexpected token '<' ... is not valid JSON" instead of an explanation.

const STATUS_MESSAGES: Record<number, string> = {
  401: "Your session expired. Please log in again.",
  413: "That upload is too large. Try a smaller photo.",
  429: "You're going a bit fast. Please wait a few minutes and try again.",
  502: "The AI service is unavailable right now. Please try again in a moment.",
  503: "BodyOS is busy right now. Please try again in a moment.",
  504: "The server took too long to answer. Please try again.",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readResponse(res: Response): Promise<any> {
  // The login guard redirects expired sessions to the login page (HTML).
  if (res.redirected && res.url.includes("/auth/login")) throw new Error(STATUS_MESSAGES[401]);

  let data: { error?: string } | null = null;
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    data = await res.json().catch(() => null);
  }
  if (!res.ok) {
    throw new Error(data?.error || STATUS_MESSAGES[res.status] || `Something went wrong (error ${res.status}). Please try again.`);
  }
  if (!data) throw new Error("The server sent an unexpected response. Please try again.");
  return data;
}
