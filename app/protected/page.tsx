import { HomeDashboard } from "./home-dashboard";

// Signed-in home. The proxy (proxy.ts) already sends logged-out visitors to /auth/login.
export default function ProtectedPage() {
  return <HomeDashboard />;
}
