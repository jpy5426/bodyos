// Decorative figure stretching beside a desk (used on navy banners).
export function DeskIllustration({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 220 180" fill="none">
      <rect x="20" y="120" width="180" height="10" rx="5" fill="#2E3B6B" />
      <rect x="40" y="130" width="8" height="40" rx="4" fill="#2E3B6B" />
      <rect x="172" y="130" width="8" height="40" rx="4" fill="#2E3B6B" />
      <rect x="120" y="70" width="64" height="44" rx="6" fill="#2E3B6B" />
      <circle cx="78" cy="38" r="14" fill="#F6A341" />
      <path d="M78 54v42" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <path d="M78 64L50 34M78 64l28-30" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <path d="M78 96l-14 24M78 96l14 24" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
