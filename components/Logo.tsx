export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#fffaf0" stroke="#b8964f" strokeOpacity=".4" />
      <ellipse cx="22" cy="28" rx="12" ry="8" fill="#fff" stroke="#c9d8bf" strokeWidth="2" />
      <circle cx="33" cy="22" r="5.5" fill="#fff" stroke="#c9d8bf" strokeWidth="2" />
      <circle cx="34.5" cy="21" r="1.2" fill="#4a3426" />
      <rect x="14" y="33" width="3" height="7" rx="1.5" fill="#7a5f4c" /><rect x="25" y="33" width="3" height="7" rx="1.5" fill="#7a5f4c" />
      <path d="M12 12h8M16 8v8" stroke="#b8964f" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
