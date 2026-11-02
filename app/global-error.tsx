"use client";

// Last-resort screen if the root layout itself fails. It replaces the whole
// page, so it brings its own <html> and plain inline styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>BodyOS couldn&apos;t load</h1>
          <p style={{ color: "#555" }}>Please check your connection and try again.</p>
          <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
