import type { Book } from "@/lib/books";

// Original storybook-style illustrations (simple shapes, one consistent palette).
export function BookArt({ art, tint }: { art: Book["art"]; tint: string }) {
  return (
    <svg viewBox="0 0 240 140" className="w-full h-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="240" height="140" fill={tint} />
      <circle cx="195" cy="32" r="16" fill="#f6dc8a" opacity=".9" />
      <path d="M0 105 Q60 80 120 100 T240 92 V140 H0Z" fill="#a9c48a" />
      <path d="M0 120 Q80 100 150 118 T240 112 V140 H0Z" fill="#8fa886" />
      {art === "genesis" && (<g>
        <rect x="108" y="62" width="9" height="46" rx="3" fill="#7a5f4c" />
        <circle cx="112" cy="50" r="26" fill="#7a8450" /><circle cx="94" cy="62" r="16" fill="#8d9a5e" /><circle cx="132" cy="60" r="17" fill="#8d9a5e" />
        <circle cx="104" cy="46" r="5" fill="#d98a6a" /><circle cx="124" cy="54" r="5" fill="#d98a6a" />
      </g>)}
      {art === "exodus" && (<g>
        <path d="M30 40 Q50 20 70 50 Q60 90 50 110 H20Z" fill="#6fa3c4" /><path d="M210 40 Q190 20 170 50 Q180 90 190 110 H220Z" fill="#6fa3c4" />
        <rect x="104" y="48" width="32" height="44" rx="14" fill="#efe3c2" stroke="#b8964f" strokeWidth="2" />
        <path d="M112 62h16M112 72h16M112 82h10" stroke="#b8964f" strokeWidth="2" strokeLinecap="round" />
      </g>)}
      {art === "psalms" && (<g stroke="#b8964f" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M90 100 Q80 40 120 30 Q150 40 140 70" />
        <path d="M140 70 L90 100" />
        <path d="M104 88L124 40M114 94L134 52M124 98L142 64" strokeWidth="2" />
      </g>)}
      {art === "proverbs" && (<g>
        <ellipse cx="120" cy="78" rx="26" ry="30" fill="#b9936d" />
        <circle cx="109" cy="70" r="9" fill="#fffaf0" /><circle cx="131" cy="70" r="9" fill="#fffaf0" />
        <circle cx="109" cy="70" r="4" fill="#4a3426" /><circle cx="131" cy="70" r="4" fill="#4a3426" />
        <path d="M117 78l3 6 3-6z" fill="#d9a441" />
      </g>)}
      {art === "gospels" && (<g>
        <ellipse cx="120" cy="90" rx="34" ry="22" fill="#fffaf0" stroke="#e7dfc6" strokeWidth="2" />
        <circle cx="152" cy="78" r="13" fill="#fffaf0" stroke="#e7dfc6" strokeWidth="2" />
        <circle cx="156" cy="76" r="2.5" fill="#4a3426" />
        <rect x="100" y="104" width="6" height="14" rx="3" fill="#7a5f4c" /><rect x="134" y="104" width="6" height="14" rx="3" fill="#7a5f4c" />
      </g>)}
      {art === "acts" && (<g>
        <path d="M120 30 C140 55 150 70 120 100 C90 70 100 55 120 30Z" fill="#e8a24a" />
        <path d="M120 54 C132 70 134 80 120 96 C106 80 108 70 120 54Z" fill="#f6dc8a" />
      </g>)}
    </svg>
  );
}
