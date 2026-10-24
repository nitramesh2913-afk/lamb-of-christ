// A small, calm sunrise-over-hills illustration. Decorative only.
export function PrayerArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 120" className={className} role="presentation" aria-hidden="true">
      <circle cx="240" cy="48" r="26" fill="#f4e6bf" />
      <circle cx="240" cy="48" r="38" fill="#f4e6bf" opacity=".4" />
      <ellipse cx="70" cy="30" rx="34" ry="11" fill="#fffaf0" opacity=".9" />
      <ellipse cx="96" cy="24" rx="24" ry="9" fill="#fffaf0" opacity=".9" />
      <path d="M0 95 Q60 55 130 82 T260 74 T320 88 V120 H0Z" fill="#c9d8bf" />
      <path d="M0 108 Q80 80 160 100 T320 98 V120 H0Z" fill="#8fa886" />
      <g transform="translate(150 78)" fill="#fffaf0" stroke="#4a3426" strokeWidth="1.5">
        <ellipse cx="0" cy="0" rx="12" ry="8" /><circle cx="-11" cy="-3" r="5" fill="#f3e9cc" />
        <path d="M-6 7v6M5 7v6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
