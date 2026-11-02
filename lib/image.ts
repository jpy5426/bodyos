// Image helpers used by the meal page in the browser. No Node-only APIs here.

// iPhones save photos as HEIC by default. Safari can read them, but Chrome,
// Edge and Firefox on Windows/Android usually can't, so we explain instead of failing silently.
export function isHeic(file: { name: string; type: string }): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

export const HEIC_HELP =
  "This looks like an iPhone HEIC photo, which this browser can't open. Try Safari, upload a screenshot of the photo instead, or set iPhone Settings > Camera > Formats to \"Most Compatible\".";
