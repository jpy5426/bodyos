"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const LINKS = [
  { href: "/protected", label: "Home" },
  { href: "/protected/workout", label: "Routines" },
  { href: "/protected/library", label: "Library" },
  { href: "/protected/macros", label: "Macros" },
  { href: "/protected/meals", label: "Meals" },
];

// Main menu on the navy top bar. Highlights the section you're in
// (Meals stays highlighted on Meal History too).
export function SiteNav() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // On a phone the menu scrolls sideways; keep the current page's tab in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav
      aria-label="Main"
      className="order-last w-full overflow-x-auto sm:order-none sm:w-auto"
    >
      <div className="flex w-max gap-1 rounded-lg bg-white/[0.06] p-1 ring-1 ring-white/10">
        {LINKS.map((l) => {
          const active = l.href === "/protected" ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold no-underline transition-colors ${
                active ? "bg-white text-primary" : "text-[#C9D3F2] hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
