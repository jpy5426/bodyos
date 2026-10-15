import Link from "next/link";

// BodyOS wordmark: tangerine circle with a stretching figure.
export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-[22px] font-black text-foreground no-underline">
      <span className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand">
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand-foreground"
        >
          <circle cx="12" cy="5" r="2" />
          <path d="M4 11l8-2 8 2" />
          <path d="M12 9v5l-4 7" />
          <path d="M12 14l4 7" />
        </svg>
      </span>
      BodyOS
    </Link>
  );
}
