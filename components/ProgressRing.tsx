export function ProgressRing({ value, size = 44, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} role="img" aria-label={label ?? `${Math.round(pct)}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7dfc6" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#8fa886" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s ease" }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.27} fontWeight="800" fill="#4a3426">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
