// BodyOS load test (Week 9). Simulates many users hitting the app at once.
//
//   1. npm run build && npm start        (in one terminal)
//   2. npm run test:load                 (in another terminal)
//
// Options:  BASE_URL=http://localhost:3000  CONNECTIONS=100  SECONDS=15  npm run test:load
//
// It does NOT log in or call the paid AI routes, so it costs nothing. The AI routes
// are covered by tests/scale.test.ts with a fake AI service instead.
import autocannon from "autocannon";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 100);
const SECONDS = Number(process.env.SECONDS ?? 15);

const scenarios = [
  { name: "Landing page", path: "/", method: "GET" },
  { name: "Login page", path: "/auth/login", method: "GET" },
  { name: "Sign-up page", path: "/auth/sign-up", method: "GET" },
  {
    name: "Logged-out bot hitting the AI routine API",
    path: "/api/generate-plan",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objective: "mobility", level: "beginner", age: 30, where: "seated" }),
  },
];

function run(s) {
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url: BASE + s.path,
        method: s.method,
        headers: s.headers,
        body: s.body,
        connections: CONNECTIONS,
        duration: SECONDS,
        followRedirects: false,
      },
      (err, r) => (err ? reject(err) : resolve(r)),
    );
  });
}

console.log(`BodyOS load test: ${CONNECTIONS} simultaneous users, ${SECONDS}s per scenario, against ${BASE}\n`);
const rows = [];
for (const s of scenarios) {
  const r = await run(s);
  const codes = Object.entries(r.statusCodeStats ?? {}).map(([c, v]) => `${c}x${v.count}`).join(" ");
  rows.push({
    Scenario: s.name,
    "Requests": r.requests.total,
    "Req/sec": Math.round(r.requests.average),
    "Median ms": r.latency.p50,
    "p99 ms": r.latency.p99,
    "Errors": r.errors + r.timeouts,
    "Status codes": codes,
  });
  console.log(`done: ${s.name}`);
}
console.table(rows);
const failed = rows.filter((r) => r.Errors > 0 || /(^|\s)5\d\d/.test(r["Status codes"]));
if (failed.length) {
  console.log("FAIL: errors or 5xx responses under load in:", failed.map((r) => r.Scenario).join(", "));
  process.exit(1);
}
console.log("PASS: no errors, timeouts or 5xx responses under load.");
