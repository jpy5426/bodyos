"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      onClick={logout}
      className="inline-flex min-h-11 items-center rounded-full border-2 border-border bg-card px-4 font-bold text-foreground hover:bg-muted"
    >
      Log out
    </button>
  );
}
