import type { NextConfig } from "next";

// Security headers sent with every page and API response.
const securityHeaders = [
  // Stops other sites from loading BodyOS in a hidden frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Stops browsers from guessing a file's type (e.g. treating an upload as a script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full page URLs to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only BodyOS itself may ask for the camera (meal photos). No mic or location.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Always use HTTPS once deployed (ignored on http://localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Content Security Policy: block framing, plugins and <base> hijacking, and
  // only allow forms to post back to BodyOS.
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false, // don't advertise "X-Powered-By: Next.js"
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
