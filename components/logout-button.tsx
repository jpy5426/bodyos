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
      className="inline-flex min-h-10 items-center rounded-lg border border-white/30 px-4 text-sm font-semibold text-white hover:bg-white/10"
    >
      Log out
    </button>
  );
}
