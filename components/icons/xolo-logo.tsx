export function XoloLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="64" height="64" rx="16" fill="url(#paint0_linear_xolo)" />
      <path
        d="M18 18L46 46M46 18L18 46"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="paint0_linear_xolo"
          x1="32"
          y1="0"
          x2="32"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}
